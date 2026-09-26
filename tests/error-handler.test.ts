import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
  ZohoApiError,
} from '../src/errors/app-error.js';
import { ErrorCode } from '../src/errors/error-codes.js';
import { HTTP_STATUS } from '../src/constants/http-status.js';

describe('Error Hierarchy & Mapping', () => {
  it('should instantiate ValidationError with status 400 and ErrorCode.VALIDATION_ERROR', () => {
    const error = new ValidationError('Invalid input data', [
      { field: 'email', message: 'Email is required' },
    ]);
    expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(error.errorCode).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.details).toHaveLength(1);
  });

  it('should instantiate ConflictError with status 409 and ErrorCode.CONFLICT', () => {
    const error = new ConflictError('Lead already exists', { existingRecordId: '12345' });
    expect(error.statusCode).toBe(HTTP_STATUS.CONFLICT);
    expect(error.errorCode).toBe(ErrorCode.CONFLICT);
    expect(error.details).toEqual({ existingRecordId: '12345' });
  });

  it('should instantiate ForbiddenError with status 403 for OAUTH_SCOPE_MISMATCH', () => {
    const error = new ForbiddenError('Scope mismatch error', ErrorCode.OAUTH_SCOPE_MISMATCH);
    expect(error.statusCode).toBe(HTTP_STATUS.FORBIDDEN);
    expect(error.errorCode).toBe(ErrorCode.OAUTH_SCOPE_MISMATCH);
  });

  it('should instantiate ZohoApiError with upstream status and zohoCode', () => {
    const error = new ZohoApiError(
      'Rate limit exceeded',
      HTTP_STATUS.TOO_MANY_REQUESTS,
      ErrorCode.ZOHO_RATE_LIMIT_EXCEEDED,
      'TOO_MANY_REQUESTS',
      429
    );
    expect(error.statusCode).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
    expect(error.zohoCode).toBe('TOO_MANY_REQUESTS');
    expect(error.upstreamStatus).toBe(429);
  });
});
