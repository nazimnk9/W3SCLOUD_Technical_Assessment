import axios from 'axios';
import { env } from '../config/env.config.js';
import { logger } from '../config/logger.js';
import { zohoTokenStore } from './zoho-token-store.service.js';
import { ZohoOAuthTokenResponse, ZohoOAuthTokens } from '../types/zoho.types.js';
import { AppError, ForbiddenError, UnauthorizedError, ZohoApiError } from '../errors/app-error.js';
import { ErrorCode } from '../errors/error-codes.js';
import { HTTP_STATUS } from '../constants/http-status.js';

export class ZohoAuthService {
  /**
   * Generates the Zoho OAuth 2.0 Authorization URL.
   */
  public getAuthorizationUrl(state?: string, prompt = 'consent'): string {
    const baseUrl = env.ZOHO_ACCOUNTS_URL.replace(/\/$/, '');
    const params = new URLSearchParams({
      scope: env.ZOHO_SCOPES,
      client_id: env.ZOHO_CLIENT_ID,
      response_type: 'code',
      access_type: 'offline', // Requests refresh_token
      redirect_uri: env.ZOHO_REDIRECT_URI,
      prompt, // 'consent' forces consent screen ensuring refresh_token is returned
    });

    if (state) {
      params.append('state', state);
    }

    const authUrl = `${baseUrl}/oauth/v2/auth?${params.toString()}`;
    logger.info(`[ZohoAuth] Generated OAuth authorization URL`);
    return authUrl;
  }

  /**
   * Exchanges authorization code for Access Token & Refresh Token.
   */
  public async exchangeAuthorizationCode(
    code: string,
    accountsServer?: string,
    tenantId = 'default'
  ): Promise<ZohoOAuthTokens> {
    const serverUrl = accountsServer || env.ZOHO_ACCOUNTS_URL;
    const tokenUrl = `${serverUrl.replace(/\/$/, '')}/oauth/v2/token`;

    logger.info(`[ZohoAuth] Exchanging authorization code for tokens with accounts server: ${serverUrl}`);

    try {
      const formParams = new URLSearchParams();
      formParams.append('grant_type', 'authorization_code');
      formParams.append('client_id', env.ZOHO_CLIENT_ID);
      formParams.append('client_secret', env.ZOHO_CLIENT_SECRET);
      formParams.append('redirect_uri', env.ZOHO_REDIRECT_URI);
      formParams.append('code', code);

      const response = await axios.post<ZohoOAuthTokenResponse>(
        tokenUrl,
        formParams,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const data = response.data;

      if (data.error) {
        logger.error(`[ZohoAuth] Token exchange failed with Zoho error: ${data.error}`, {
          description: data.error_description,
        });

        if (data.error === 'invalid_code' || data.error === 'invalid_grant') {
          throw new UnauthorizedError(
            `Authorization code is invalid or has expired: ${data.error_description || data.error}`,
            ErrorCode.OAUTH_CODE_EXCHANGE_FAILED
          );
        }

        if (data.error === 'access_denied' || data.error.includes('scope')) {
          throw new ForbiddenError(
            `OAuth scope error during token exchange: ${data.error_description || data.error}`,
            ErrorCode.OAUTH_SCOPE_MISMATCH
          );
        }

        throw new ZohoApiError(
          `Zoho OAuth token exchange failed: ${data.error_description || data.error}`,
          HTTP_STATUS.BAD_REQUEST,
          ErrorCode.OAUTH_CODE_EXCHANGE_FAILED,
          data.error
        );
      }

      const expiresInMs = (data.expires_in || 3600) * 1000;
      const expiresAt = Date.now() + expiresInMs;

      const savedTokens = zohoTokenStore.saveTokens(
        {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          apiDomain: data.api_domain,
          tokenType: data.token_type || 'Bearer',
          expiresIn: data.expires_in,
          expiresAt,
        },
        tenantId
      );

      logger.info(`[ZohoAuth] Token exchange successful for tenant ${tenantId}. Refresh token received: ${Boolean(data.refresh_token)}`);
      return savedTokens;
    } catch (err: any) {
      if (err instanceof AppError) throw err;

      logger.error('[ZohoAuth] Unexpected error during code exchange:', {
        message: err.message,
        status: err.response?.status,
        responseData: err.response?.data,
      });
      throw new ZohoApiError(
        `Failed to exchange authorization code: ${err.response?.data?.error || err.message}`,
        HTTP_STATUS.BAD_GATEWAY,
        ErrorCode.OAUTH_CODE_EXCHANGE_FAILED
      );
    }
  }

  /**
   * Refreshes the Access Token using the stored Refresh Token.
   */
  public async refreshAccessToken(tenantId = 'default'): Promise<string> {
    const currentTokens = zohoTokenStore.getTokens(tenantId);
    const refreshToken = currentTokens?.refreshToken || env.ZOHO_REFRESH_TOKEN;

    if (!refreshToken) {
      logger.error(`[ZohoAuth] No refresh token available for tenant: ${tenantId}`);
      throw new UnauthorizedError(
        'No refresh token available. Please authenticate via /auth/zoho to establish OAuth credentials.',
        ErrorCode.OAUTH_NOT_INITIALIZED
      );
    }

    const tokenUrl = `${env.ZOHO_ACCOUNTS_URL.replace(/\/$/, '')}/oauth/v2/token`;
    logger.info(`[ZohoAuth] Requesting new access token using refresh token for tenant: ${tenantId}`);

    try {
      const formParams = new URLSearchParams();
      formParams.append('grant_type', 'refresh_token');
      formParams.append('client_id', env.ZOHO_CLIENT_ID);
      formParams.append('client_secret', env.ZOHO_CLIENT_SECRET);
      formParams.append('refresh_token', refreshToken);

      const response = await axios.post<ZohoOAuthTokenResponse>(
        tokenUrl,
        formParams,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const data = response.data;

      if (data.error) {
        logger.error(`[ZohoAuth] Token refresh failed with Zoho error: ${data.error}`, {
          description: data.error_description,
        });

        if (data.error === 'invalid_code' || data.error === 'invalid_token') {
          throw new UnauthorizedError(
            `Refresh token is invalid or revoked: ${data.error_description || data.error}`,
            ErrorCode.OAUTH_REFRESH_FAILED
          );
        }

        throw new ZohoApiError(
          `Zoho OAuth token refresh failed: ${data.error_description || data.error}`,
          HTTP_STATUS.UNAUTHORIZED,
          ErrorCode.OAUTH_REFRESH_FAILED,
          data.error
        );
      }

      const expiresInMs = (data.expires_in || 3600) * 1000;
      const expiresAt = Date.now() + expiresInMs;

      zohoTokenStore.saveTokens(
        {
          accessToken: data.access_token,
          apiDomain: data.api_domain,
          tokenType: data.token_type || 'Bearer',
          expiresIn: data.expires_in,
          expiresAt,
        },
        tenantId
      );

      logger.info(`[ZohoAuth] Successfully refreshed access token. Valid until: ${new Date(expiresAt).toISOString()}`);
      return data.access_token;
    } catch (err: any) {
      if (err instanceof AppError) throw err;

      logger.error('[ZohoAuth] Unexpected error during token refresh:', { message: err.message });
      throw new ZohoApiError(
        `Failed to refresh access token: ${err.response?.data?.error || err.message}`,
        HTTP_STATUS.BAD_GATEWAY,
        ErrorCode.OAUTH_REFRESH_FAILED
      );
    }
  }

  /**
   * Retrieves an active Access Token, automatically refreshing if expired.
   */
  public async getValidAccessToken(tenantId = 'default'): Promise<string> {
    if (zohoTokenStore.isAccessTokenValid(tenantId)) {
      const tokens = zohoTokenStore.getTokens(tenantId);
      return tokens!.accessToken;
    }

    // Token is expired or missing, refresh it
    return await this.refreshAccessToken(tenantId);
  }
}

export const zohoAuthService = new ZohoAuthService();
