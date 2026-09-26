export const ZOHO_ENDPOINTS = {
  OAUTH_AUTH: '/oauth/v2/auth',
  OAUTH_TOKEN: '/oauth/v2/token',
  OAUTH_REVOKE: '/oauth/v2/token/revoke',
  CRM_V8_BASE: '/crm/v8',
  CRM_V7_BASE: '/crm/v7',
  CRM_V2_BASE: '/crm/v2',
} as const;

export const ZOHO_MODULES = {
  LEADS: 'Leads',
  CONTACTS: 'Contacts',
  ACCOUNTS: 'Accounts',
  DEALS: 'Deals',
} as const;

export const ZOHO_DEFAULT_SCOPES = [
  'ZohoCRM.modules.ALL',
  'ZohoCRM.settings.ALL',
  'ZohoCRM.users.READ',
  'ZohoCRM.org.READ',
] as const;

export const ZOHO_DATA_CENTERS = {
  US: { accounts: 'https://accounts.zoho.com', api: 'https://www.zohoapis.com' },
  EU: { accounts: 'https://accounts.zoho.eu', api: 'https://www.zohoapis.eu' },
  IN: { accounts: 'https://accounts.zoho.in', api: 'https://www.zohoapis.in' },
  AU: { accounts: 'https://accounts.zoho.com.au', api: 'https://www.zohoapis.com.au' },
  JP: { accounts: 'https://accounts.zoho.jp', api: 'https://www.zohoapis.jp' },
  CA: { accounts: 'https://accounts.zohocloud.ca', api: 'https://www.zohoapis.ca' },
} as const;
