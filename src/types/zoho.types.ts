export interface ZohoOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  apiDomain?: string;
  tokenType?: string;
  expiresIn?: number;
  expiresAt: number; // Unix timestamp (ms) when access token expires
  scope?: string;
}

export interface ZohoOAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  api_domain?: string;
  token_type?: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

export interface ZohoLeadPayload {
  First_Name?: string;
  Last_Name: string;
  Company: string;
  Email?: string;
  Phone?: string;
  Lead_Status?: string;
  Lead_Source?: string;
  Designation?: string;
  Description?: string;
  [key: string]: any;
}

export interface ZohoRecordResponseItem {
  code: string;
  details: {
    id: string;
    Created_Time?: string;
    Modified_Time?: string;
    Created_By?: {
      id: string;
      name: string;
    };
    [key: string]: any;
  };
  message: string;
  status: string;
}

export interface ZohoModuleResponse<T = any> {
  data: T[];
  info?: {
    per_page: number;
    count: number;
    page: number;
    more_records: boolean;
  };
}

export interface ZohoErrorResponse {
  code: string;
  details?: Record<string, any>;
  message: string;
  status: string;
}
