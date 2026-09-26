import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_BASE_URL: z.string().url().default('http://localhost:5000'),

  // Zoho OAuth Configuration
  ZOHO_CLIENT_ID: z.string().min(1, 'ZOHO_CLIENT_ID is required'),
  ZOHO_CLIENT_SECRET: z.string().min(1, 'ZOHO_CLIENT_SECRET is required'),
  ZOHO_REDIRECT_URI: z.string().url().default('http://localhost:5000/auth/zoho/callback'),

  // Zoho Accounts URL & API Base URL
  ZOHO_ACCOUNTS_URL: z.string().url().default('https://accounts.zoho.com'),
  ZOHO_API_BASE_URL: z.string().url().default('https://www.zohoapis.com'),

  // Optional pre-configured Refresh Token
  ZOHO_REFRESH_TOKEN: z.string().optional().default(''),

  // OAuth Scopes
  ZOHO_SCOPES: z.string().default('ZohoCRM.modules.ALL,ZohoCRM.settings.ALL'),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    // In development or test, we may start without env set, providing helpful warnings
    console.warn(
      '⚠️  [CONFIG WARNING] Missing or invalid environment variables:',
      result.error.format()
    );
    // Return parsed with fallback dummy values if in dev to allow app startup and health checks
    return {
      PORT: Number(process.env.PORT) || 5000,
      NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
      APP_BASE_URL: process.env.APP_BASE_URL || 'http://localhost:5000',
      ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID || '',
      ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET || '',
      ZOHO_REDIRECT_URI: process.env.ZOHO_REDIRECT_URI || 'http://localhost:5000/auth/zoho/callback',
      ZOHO_ACCOUNTS_URL: process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com',
      ZOHO_API_BASE_URL: process.env.ZOHO_API_BASE_URL || 'https://www.zohoapis.com',
      ZOHO_REFRESH_TOKEN: process.env.ZOHO_REFRESH_TOKEN || '',
      ZOHO_SCOPES: process.env.ZOHO_SCOPES || 'ZohoCRM.modules.ALL,ZohoCRM.settings.ALL',
    };
  }
  return result.data;
}

export const env = validateEnv();
export type EnvConfig = z.infer<typeof envSchema>;
