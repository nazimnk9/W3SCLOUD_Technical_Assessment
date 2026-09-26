import { Request, Response, NextFunction } from 'express';
import { zohoAuthService } from '../services/zoho-auth.service.js';
import { zohoTokenStore } from '../services/zoho-token-store.service.js';
import { HTTP_STATUS } from '../constants/http-status.js';
import { ApiResponse } from '../types/common.types.js';
import { env } from '../config/env.config.js';
import { UnauthorizedError } from '../errors/app-error.js';
import { ErrorCode } from '../errors/error-codes.js';

export class AuthController {
  /**
   * GET /auth/zoho
   * Redirects the user to Zoho OAuth 2.0 authorization screen or returns the URL.
   */
  public initiateAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const state = req.query.state as string | undefined;
      const redirect = req.query.redirect === 'true';
      const authUrl = zohoAuthService.getAuthorizationUrl(state);

      if (redirect) {
        return res.redirect(authUrl);
      }

      const response: ApiResponse<{ authorizationUrl: string; scopes: string; redirectUri: string }> = {
        success: true,
        message: 'Zoho OAuth authorization URL generated successfully. Open this URL in browser to grant access.',
        data: {
          authorizationUrl: authUrl,
          scopes: env.ZOHO_SCOPES,
          redirectUri: env.ZOHO_REDIRECT_URI,
        },
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /auth/zoho/callback
   * Handles the OAuth callback from Zoho with authorization code.
   */
  public handleCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code, error, 'accounts-server': accountsServer } = req.query as Record<string, string>;

      if (error) {
        throw new UnauthorizedError(`Zoho OAuth authorization failed: ${error}`, ErrorCode.OAUTH_UNAUTHORIZED);
      }

      if (!code) {
        throw new UnauthorizedError('Missing authorization code in OAuth callback', ErrorCode.OAUTH_CODE_EXCHANGE_FAILED);
      }

      const tokens = await zohoAuthService.exchangeAuthorizationCode(code, accountsServer);

      // Render a friendly HTML response or JSON depending on Accept header
      if (req.accepts('html')) {
        res.status(HTTP_STATUS.OK).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Zoho OAuth Success</title>
              <style>
                body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { background: #1e293b; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); max-width: 540px; text-align: center; border: 1px solid #334155; }
                h1 { color: #10b981; margin-bottom: 0.5rem; font-size: 1.75rem; }
                p { color: #94a3b8; line-height: 1.6; margin-bottom: 1.5rem; }
                .badge { background: #064e3b; color: #34d399; padding: 0.35rem 0.8rem; border-radius: 9999px; font-weight: 600; font-size: 0.875rem; display: inline-block; margin-bottom: 1rem; }
                .btn { display: inline-block; background: #3b82f6; color: #ffffff; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600; transition: background 0.2s; }
                .btn:hover { background: #2563eb; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="badge">✓ Authorization Successful</div>
                <h1>Connected to Zoho CRM</h1>
                <p>OAuth tokens have been securely exchanged and stored. You can now use all Lead CRUD and Zoho API endpoints.</p>
                <a href="/" class="btn">Open Interactive Assessment Dashboard</a>
              </div>
            </body>
          </html>
        `);
        return;
      }

      const response: ApiResponse<{ authenticated: boolean; expiresAt: string; hasRefreshToken: boolean }> = {
        success: true,
        message: 'Zoho CRM OAuth authorization code successfully exchanged for tokens.',
        data: {
          authenticated: true,
          expiresAt: new Date(tokens.expiresAt).toISOString(),
          hasRefreshToken: Boolean(tokens.refreshToken),
        },
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /auth/status
   * Returns OAuth authentication status.
   */
  public getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokens = zohoTokenStore.getTokens();
      const hasTokens = Boolean(tokens && (tokens.accessToken || tokens.refreshToken));
      const isTokenValid = zohoTokenStore.isAccessTokenValid();

      const response: ApiResponse<{
        authenticated: boolean;
        isAccessTokenValid: boolean;
        hasRefreshToken: boolean;
        expiresAt?: string;
        accountsUrl: string;
        apiBaseUrl: string;
        scopes: string;
      }> = {
        success: true,
        data: {
          authenticated: hasTokens,
          isAccessTokenValid: isTokenValid,
          hasRefreshToken: Boolean(tokens?.refreshToken || env.ZOHO_REFRESH_TOKEN),
          expiresAt: tokens?.expiresAt ? new Date(tokens.expiresAt).toISOString() : undefined,
          accountsUrl: env.ZOHO_ACCOUNTS_URL,
          apiBaseUrl: env.ZOHO_API_BASE_URL,
          scopes: env.ZOHO_SCOPES,
        },
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /auth/refresh
   * Manually trigger token renewal using refresh token.
   */
  public refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await zohoAuthService.refreshAccessToken();
      const tokens = zohoTokenStore.getTokens();

      const response: ApiResponse<{ refreshed: boolean; expiresAt: string }> = {
        success: true,
        message: 'Access token successfully renewed using refresh token.',
        data: {
          refreshed: true,
          expiresAt: new Date(tokens!.expiresAt).toISOString(),
        },
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();
