import fs from 'fs';
import path from 'path';
import { ZohoOAuthTokens } from '../types/zoho.types.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.config.js';

/**
 * Token store abstraction.
 * Supports multi-tenant token isolation (keyed by tenantId).
 * In production, this can be backed by Redis, AWS Secrets Manager, or an encrypted database.
 * For local development, persists to a local git-ignored JSON file.
 */
class ZohoTokenStoreService {
  private inMemoryCache: Map<string, ZohoOAuthTokens> = new Map();
  private tokenFilePath: string = path.resolve(process.cwd(), '.tokens.json');

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      if (fs.existsSync(this.tokenFilePath)) {
        const fileContent = fs.readFileSync(this.tokenFilePath, 'utf-8');
        const data = JSON.parse(fileContent);
        for (const [tenantId, tokens] of Object.entries(data)) {
          this.inMemoryCache.set(tenantId, tokens as ZohoOAuthTokens);
        }
        logger.info('[TokenStore] Loaded existing OAuth tokens from cache file');
      } else if (env.ZOHO_REFRESH_TOKEN) {
        // Initialize default tenant with refresh token from env if present
        this.inMemoryCache.set('default', {
          accessToken: '',
          refreshToken: env.ZOHO_REFRESH_TOKEN,
          expiresAt: 0,
        });
        logger.info('[TokenStore] Initialized default tenant with ZOHO_REFRESH_TOKEN from environment');
      }
    } catch (err) {
      logger.warn('[TokenStore] Could not read token cache file:', err);
    }
  }

  private persistToStorage(): void {
    try {
      const obj: Record<string, ZohoOAuthTokens> = {};
      for (const [tenantId, tokens] of this.inMemoryCache.entries()) {
        obj[tenantId] = tokens;
      }
      fs.writeFileSync(this.tokenFilePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[TokenStore] Failed to persist tokens to file:', err);
    }
  }

  public getTokens(tenantId = 'default'): ZohoOAuthTokens | undefined {
    return this.inMemoryCache.get(tenantId);
  }

  public saveTokens(tokens: Partial<ZohoOAuthTokens> & { accessToken: string; expiresAt: number }, tenantId = 'default'): ZohoOAuthTokens {
    const existing = this.inMemoryCache.get(tenantId) || { accessToken: '', expiresAt: 0 };
    const updated: ZohoOAuthTokens = {
      ...existing,
      ...tokens,
      refreshToken: tokens.refreshToken || existing.refreshToken || env.ZOHO_REFRESH_TOKEN || undefined,
    };

    this.inMemoryCache.set(tenantId, updated);
    this.persistToStorage();
    logger.info(`[TokenStore] Saved tokens for tenant: ${tenantId}. Access token expires at: ${new Date(updated.expiresAt).toISOString()}`);
    return updated;
  }

  public setRefreshToken(refreshToken: string, tenantId = 'default'): void {
    const existing = this.inMemoryCache.get(tenantId) || { accessToken: '', expiresAt: 0 };
    existing.refreshToken = refreshToken;
    this.inMemoryCache.set(tenantId, existing);
    this.persistToStorage();
    logger.info(`[TokenStore] Updated refresh token for tenant: ${tenantId}`);
  }

  public clearTokens(tenantId = 'default'): void {
    this.inMemoryCache.delete(tenantId);
    this.persistToStorage();
    logger.info(`[TokenStore] Cleared tokens for tenant: ${tenantId}`);
  }

  public isAccessTokenValid(tenantId = 'default'): boolean {
    const tokens = this.getTokens(tenantId);
    if (!tokens || !tokens.accessToken) return false;
    // Add 60 seconds buffer before expiration
    return Date.now() < tokens.expiresAt - 60000;
  }
}

export const zohoTokenStore = new ZohoTokenStoreService();
