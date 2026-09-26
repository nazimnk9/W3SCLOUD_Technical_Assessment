import { Request, Response, NextFunction } from 'express';
import { AppError, ZohoApiError } from '../errors/app-error.js';
import { ErrorCode } from '../errors/error-codes.js';
import { HTTP_STATUS } from '../constants/http-status.js';
import { logger } from '../config/logger.js';
import { ApiResponse } from '../types/common.types.js';
import axios from 'axios';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
  let message = 'An unexpected internal error occurred';
  let details: any = undefined;
  let zohoCode: string | undefined = undefined;
  let documentationHelp: string | undefined = undefined;

  // 1. Custom AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.errorCode;
    message = err.message;
    details = err.details;

    if (err instanceof ZohoApiError) {
      zohoCode = err.zohoCode;
    }
  }
  // 2. Uncaught Axios errors (from direct calls if any)
  else if (axios.isAxiosError(err)) {
    statusCode = (err.response?.status as any) || HTTP_STATUS.BAD_GATEWAY;
    message = err.response?.data?.message || err.message || 'Upstream API request failed';
    errorCode = ErrorCode.ZOHO_API_ERROR;
    zohoCode = err.response?.data?.code;
    details = err.response?.data?.details;
  }
  // 3. Generic unhandled errors
  else {
    message = process.env.NODE_ENV === 'production' ? 'An unexpected internal error occurred' : err.message;
  }

  // Add contextual troubleshooting hints for OAuth & scope errors
  if (errorCode === ErrorCode.OAUTH_SCOPE_MISMATCH || zohoCode === 'OAUTH_SCOPE_MISMATCH') {
    documentationHelp =
      'The registered OAuth client does not have required permissions (e.g., ZohoCRM.modules.ALL). Please re-authorize the application via /auth/zoho with the appropriate scopes in Zoho API Console.';
  } else if (errorCode === ErrorCode.OAUTH_INVALID_TOKEN || errorCode === ErrorCode.OAUTH_UNAUTHORIZED) {
    documentationHelp =
      'The access token is invalid or missing. Please initiate the OAuth flow at /auth/zoho or provide a valid ZOHO_REFRESH_TOKEN in your .env configuration.';
  }

  // Log error safely with redactions
  logger.error(`[Error Handler] ${req.method} ${req.originalUrl} -> ${statusCode} [${errorCode}]: ${message}`, {
    errorCode,
    zohoCode,
    details,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  const responseBody: ApiResponse = {
    success: false,
    message,
    error: {
      code: errorCode,
      details,
      zohoCode,
      documentationHelp,
    },
  };

  res.status(statusCode).json(responseBody);
};
