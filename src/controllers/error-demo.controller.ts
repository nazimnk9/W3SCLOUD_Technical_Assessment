import { Request, Response, NextFunction } from 'express';
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  ZohoApiError,
} from '../errors/app-error.js';
import { ErrorCode } from '../errors/error-codes.js';
import { HTTP_STATUS } from '../constants/http-status.js';
import { zohoCrmService } from '../services/zoho-crm.service.js';

export class ErrorDemoController {
  /**
   * Demonstrates HTTP 403 OAUTH_SCOPE_MISMATCH
   */
  public triggerScopeMismatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      throw new ForbiddenError(
        'OAuth Scope Mismatch: The registered client lacks required scope permissions (e.g. ZohoCRM.modules.ALL).',
        ErrorCode.OAUTH_SCOPE_MISMATCH
      );
    } catch (err) {
      next(err);
    }
  };

  /**
   * Demonstrates HTTP 401 OAUTH_INVALID_TOKEN / Expired Token
   */
  public triggerInvalidToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      throw new UnauthorizedError(
        'Authentication Failed: The provided Zoho OAuth access token is invalid or expired.',
        ErrorCode.OAUTH_INVALID_TOKEN
      );
    } catch (err) {
      next(err);
    }
  };

  /**
   * Demonstrates HTTP 404 ZOHO_INVALID_MODULE (real Zoho API call to a non-existent module)
   */
  public triggerInvalidModule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Attempting to query an invalid Zoho module
      await zohoCrmService.getRecords('NonExistentModuleXYZ_123');
      res.status(HTTP_STATUS.OK).json({ success: true });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Demonstrates HTTP 400 VALIDATION_ERROR
   */
  public triggerValidationError = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      throw new ValidationError('Validation failed for request parameters', [
        { field: 'lastName', message: 'Last Name is required', code: 'invalid_type' },
        { field: 'company', message: 'Company is required', code: 'invalid_type' },
        { field: 'email', message: 'Invalid email address format', code: 'invalid_string' },
      ]);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Demonstrates HTTP 429 Rate Limit
   */
  public triggerRateLimit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      throw new ZohoApiError(
        'Zoho CRM API rate limit exceeded. Concurrency limit reached.',
        HTTP_STATUS.TOO_MANY_REQUESTS,
        ErrorCode.ZOHO_RATE_LIMIT_EXCEEDED,
        'TOO_MANY_REQUESTS',
        429
      );
    } catch (err) {
      next(err);
    }
  };

  /**
   * Demonstrates HTTP 502 ZOHO_UPSTREAM_UNAVAILABLE / Zoho CRM Internal Server Error
   */
  public triggerBadGateway = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      throw new ZohoApiError(
        'Upstream Zoho CRM server encountered an internal error. The remote gateway could not complete the request.',
        HTTP_STATUS.BAD_GATEWAY,
        ErrorCode.ZOHO_UPSTREAM_UNAVAILABLE,
        'INTERNAL_SERVER_ERROR',
        502,
        {
          upstreamService: 'Zoho CRM Cloud REST API v8',
          gatewayNode: 'zoho-crm-us-east-gateway-02',
          timestamp: new Date().toISOString(),
          resolution: 'Retry the request or verify Zoho CRM API availability at status.zoho.com'
        }
      );
    } catch (err) {
      next(err);
    }
  };
}

export const errorDemoController = new ErrorDemoController();
