import { ErrorCode } from '../errors/error-codes.js';
import { ErrorDetail } from '../errors/app-error.js';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: PaginationMeta;
  error?: {
    code: ErrorCode | string;
    details?: ErrorDetail[] | Record<string, any>;
    zohoCode?: string;
    documentationHelp?: string;
  };
}

export interface PaginationMeta {
  page: number;
  perPage: number;
  moreRecords?: boolean;
  count?: number;
}
