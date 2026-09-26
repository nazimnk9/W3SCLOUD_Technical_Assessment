import { HttpStatusCode, HTTP_STATUS } from '../constants/http-status.js';
import { ErrorCode } from './error-codes.js';

export interface ErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export class AppError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly errorCode: ErrorCode;
  public readonly isOperational: boolean;
  public readonly details?: ErrorDetail[] | Record<string, any>;

  constructor(
    message: string,
    statusCode: HttpStatusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errorCode: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    details?: ErrorDetail[] | Record<string, any>,
    isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetail[]) {
    super(message, HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', errorCode = ErrorCode.NOT_FOUND) {
    super(message, HTTP_STATUS.NOT_FOUND, errorCode);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, HTTP_STATUS.CONFLICT, ErrorCode.CONFLICT, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication failed or missing token', errorCode = ErrorCode.OAUTH_UNAUTHORIZED) {
    super(message, HTTP_STATUS.UNAUTHORIZED, errorCode);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden or scope mismatch', errorCode = ErrorCode.OAUTH_SCOPE_MISMATCH) {
    super(message, HTTP_STATUS.FORBIDDEN, errorCode);
  }
}

export class ZohoApiError extends AppError {
  public readonly zohoCode?: string;
  public readonly upstreamStatus?: number;

  constructor(
    message: string,
    statusCode: HttpStatusCode = HTTP_STATUS.BAD_GATEWAY,
    errorCode: ErrorCode = ErrorCode.ZOHO_API_ERROR,
    zohoCode?: string,
    upstreamStatus?: number,
    details?: Record<string, any>
  ) {
    super(message, statusCode, errorCode, details);
    this.zohoCode = zohoCode;
    this.upstreamStatus = upstreamStatus;
  }
}
