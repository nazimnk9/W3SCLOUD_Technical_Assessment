import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { env } from '../config/env.config.js';
import { logger } from '../config/logger.js';
import { zohoAuthService } from './zoho-auth.service.js';
import {
  AppError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ZohoApiError,
} from '../errors/app-error.js';
import { ErrorCode } from '../errors/error-codes.js';
import { HTTP_STATUS } from '../constants/http-status.js';
import { ZOHO_ENDPOINTS } from '../constants/zoho.constants.js';
import { ZohoModuleResponse } from '../types/zoho.types.js';

interface CustomRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
  tenantId?: string;
}

export class ZohoCrmService {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    const apiBase = env.ZOHO_API_BASE_URL.replace(/\/$/, '');
    this.client = axios.create({
      baseURL: `${apiBase}${ZOHO_ENDPOINTS.CRM_V8_BASE}`,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback);
  }

  private setupInterceptors(): void {
    // Request Interceptor: Attach Bearer/Zoho OAuth Token
    this.client.interceptors.request.use(
      async (config: CustomRequestConfig) => {
        const tenantId = config.tenantId || 'default';
        try {
          const accessToken = await zohoAuthService.getValidAccessToken(tenantId);
          config.headers = config.headers || {};
          config.headers['Authorization'] = `Zoho-oauthtoken ${accessToken}`;
          return config;
        } catch (err) {
          logger.warn('[ZohoCRM] Could not obtain valid access token prior to request:', err);
          return config; // Let request proceed so Zoho response error handling can intercept
        }
      },
      (error) => Promise.reject(error)
    );

    // Response Interceptor: Token refresh on 401 / INVALID_TOKEN & Error Normalization
    this.client.interceptors.response.use(
      (response) => {
        // Zoho sometimes returns 200/202 with an error code in the body data array
        const responseData = response.data;
        if (responseData?.data && Array.isArray(responseData.data) && responseData.data.length > 0) {
          const firstItem = responseData.data[0];
          if (firstItem.status === 'error') {
            const code = firstItem.code;
            const message = firstItem.message || 'Zoho CRM API returned an error';
            logger.warn(`[ZohoCRM] Record-level error in response: [${code}] ${message}`, firstItem.details);
            this.handleZohoErrorPayload(code, message, firstItem.details, response.status);
          }
        }
        return response;
      },
      async (error: AxiosError<any>) => {
        const originalRequest = error.config as CustomRequestConfig;
        if (!originalRequest) {
          return Promise.reject(error);
        }

        const status = error.response?.status;
        const responseData = error.response?.data;
        const zohoCode = responseData?.code || responseData?.data?.[0]?.code;
        const zohoMessage = responseData?.message || responseData?.data?.[0]?.message;

        // Check if error is due to token expiration / invalid token
        const isAuthError =
          status === 401 ||
          zohoCode === 'INVALID_TOKEN' ||
          zohoCode === 'AUTHENTICATION_FAILURE' ||
          zohoCode === 'INVALID_OAUTHTOKEN';

        if (isAuthError && !originalRequest._retry) {
          originalRequest._retry = true;
          const tenantId = originalRequest.tenantId || 'default';

          if (this.isRefreshing) {
            // Queue request while refreshing
            return new Promise((resolve) => {
              this.addRefreshSubscriber((newToken: string) => {
                originalRequest.headers['Authorization'] = `Zoho-oauthtoken ${newToken}`;
                resolve(this.client(originalRequest));
              });
            });
          }

          this.isRefreshing = true;

          try {
            logger.info('[ZohoCRM] Interceptor caught 401/INVALID_TOKEN. Initiating token refresh...');
            const newToken = await zohoAuthService.refreshAccessToken(tenantId);
            this.isRefreshing = false;
            this.onTokenRefreshed(newToken);

            originalRequest.headers['Authorization'] = `Zoho-oauthtoken ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshErr) {
            this.isRefreshing = false;
            this.refreshSubscribers = [];
            logger.error('[ZohoCRM] Automatic token refresh failed in interceptor:', refreshErr);
            throw new UnauthorizedError(
              'Session expired and automatic token refresh failed. Please re-authenticate.',
              ErrorCode.OAUTH_REFRESH_FAILED
            );
          }
        }

        // Normalize errors
        this.handleZohoErrorPayload(
          zohoCode,
          zohoMessage || error.message,
          responseData?.details,
          status
        );
      }
    );
  }

  private handleZohoErrorPayload(
    zohoCode?: string,
    message = 'Zoho API Error',
    details?: any,
    httpStatus?: number
  ): never {
    if (zohoCode === 'OAUTH_SCOPE_MISMATCH') {
      throw new ForbiddenError(
        `OAuth Scope Mismatch: ${message}. Ensure Zoho CRM scopes (e.g. ZohoCRM.modules.ALL) are granted to your client.`,
        ErrorCode.OAUTH_SCOPE_MISMATCH
      );
    }

    if (zohoCode === 'INVALID_TOKEN' || zohoCode === 'AUTHENTICATION_FAILURE' || httpStatus === 401) {
      throw new UnauthorizedError(
        `Authentication Failed: ${message}`,
        ErrorCode.OAUTH_INVALID_TOKEN
      );
    }

    if (zohoCode === 'INVALID_MODULE' || httpStatus === 404) {
      throw new NotFoundError(
        `Requested CRM module or record not found: ${message}`,
        ErrorCode.ZOHO_INVALID_MODULE
      );
    }

    if (zohoCode === 'MANDATORY_NOT_FOUND') {
      throw new ZohoApiError(
        `Mandatory CRM field missing: ${message}`,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.ZOHO_MANDATORY_NOT_FOUND,
        zohoCode,
        httpStatus,
        details
      );
    }

    if (zohoCode === 'DUPLICATE_DATA') {
      throw new ZohoApiError(
        `Duplicate record found in Zoho CRM: ${message}`,
        HTTP_STATUS.CONFLICT,
        ErrorCode.ZOHO_DUPLICATE_RECORD,
        zohoCode,
        httpStatus,
        details
      );
    }

    if (httpStatus === 429 || zohoCode === 'TOO_MANY_REQUESTS') {
      throw new ZohoApiError(
        'Zoho CRM API rate limit exceeded. Please retry after a brief pause.',
        HTTP_STATUS.TOO_MANY_REQUESTS,
        ErrorCode.ZOHO_RATE_LIMIT_EXCEEDED,
        zohoCode,
        httpStatus
      );
    }

    throw new ZohoApiError(
      message,
      (httpStatus as any) || HTTP_STATUS.BAD_GATEWAY,
      ErrorCode.ZOHO_API_ERROR,
      zohoCode,
      httpStatus,
      details
    );
  }

  public async get<T>(url: string, params?: Record<string, any>, tenantId = 'default'): Promise<T> {
    const config: CustomRequestConfig = {
      headers: {} as any,
      params,
      tenantId,
    };
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  public async post<T>(url: string, data: any, tenantId = 'default'): Promise<T> {
    const config: CustomRequestConfig = {
      headers: {} as any,
      tenantId,
    };
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  public async getRecords<T>(
    module: string,
    params?: {
      page?: number;
      per_page?: number;
      fields?: string;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
    },
    tenantId = 'default'
  ): Promise<ZohoModuleResponse<T>> {
    logger.info(`[ZohoCRM] Fetching records for module: ${module}`, { params });
    return this.get<ZohoModuleResponse<T>>(`/${module}`, params, tenantId);
  }

  public async getRecordById<T>(module: string, id: string, tenantId = 'default'): Promise<T> {
    logger.info(`[ZohoCRM] Fetching single record from ${module} with ID: ${id}`);
    const res = await this.get<ZohoModuleResponse<T>>(`/${module}/${id}`, undefined, tenantId);
    if (!res.data || res.data.length === 0) {
      throw new NotFoundError(`Record with ID ${id} not found in module ${module}`, ErrorCode.ZOHO_RECORD_NOT_FOUND);
    }
    return res.data[0];
  }

  public async searchRecords<T>(
    module: string,
    criteria: { email?: string; phone?: string; word?: string; criteria?: string },
    tenantId = 'default'
  ): Promise<T[]> {
    logger.info(`[ZohoCRM] Searching records in module: ${module}`, { criteria });
    try {
      const res = await this.get<ZohoModuleResponse<T>>(`/${module}/search`, criteria, tenantId);
      return res?.data || [];
    } catch (err: any) {
      // Zoho returns 204 No Content or error when search finds 0 matches
      if (err instanceof NotFoundError || err?.response?.status === 204 || err?.statusCode === 404) {
        return [];
      }
      throw err;
    }
  }

  public async createRecord<T>(
    module: string,
    payload: any,
    tenantId = 'default'
  ): Promise<any> {
    logger.info(`[ZohoCRM] Creating new record in module: ${module}`);
    const body = {
      data: Array.isArray(payload) ? payload : [payload],
      trigger: ['approval', 'workflow', 'blueprint'],
    };
    return this.post<any>(`/${module}`, body, tenantId);
  }
}

export const zohoCrmService = new ZohoCrmService();
