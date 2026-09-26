import { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http-status.js';
import { ApiResponse } from '../types/common.types.js';
import { zohoTokenStore } from '../services/zoho-token-store.service.js';
import { env } from '../config/env.config.js';

export class HealthController {
  public check = (req: Request, res: Response): void => {
    const isZohoAuthenticated = zohoTokenStore.isAccessTokenValid();
    const hasRefreshToken = Boolean(zohoTokenStore.getTokens()?.refreshToken || env.ZOHO_REFRESH_TOKEN);

    const response: ApiResponse<{
      status: string;
      uptime: number;
      timestamp: string;
      environment: string;
      zoho: {
        accountsUrl: string;
        apiBaseUrl: string;
        hasRefreshToken: boolean;
        isAccessTokenActive: boolean;
      };
    }> = {
      success: true,
      message: 'W3SCLOUD Zoho CRM API Service is operational',
      data: {
        status: 'UP',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
        zoho: {
          accountsUrl: env.ZOHO_ACCOUNTS_URL,
          apiBaseUrl: env.ZOHO_API_BASE_URL,
          hasRefreshToken,
          isAccessTokenActive: isZohoAuthenticated,
        },
      },
    };

    res.status(HTTP_STATUS.OK).json(response);
  };
}

export const healthController = new HealthController();
