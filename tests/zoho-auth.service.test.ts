import { describe, it, expect } from 'vitest';
import { zohoAuthService } from '../src/services/zoho-auth.service.js';
import { zohoTokenStore } from '../src/services/zoho-token-store.service.js';

describe('ZohoAuthService & TokenStore', () => {
  it('should generate valid OAuth authorization URL with correct parameters', () => {
    const authUrl = zohoAuthService.getAuthorizationUrl('test-state-123');
    expect(authUrl).toContain('response_type=code');
    expect(authUrl).toContain('access_type=offline');
    expect(authUrl).toContain('prompt=consent');
    expect(authUrl).toContain('state=test-state-123');
    expect(authUrl).toContain('scope=ZohoCRM.modules.ALL');
  });

  it('should save and retrieve tokens for tenants', () => {
    const mockExpiresAt = Date.now() + 3600000;
    zohoTokenStore.saveTokens(
      {
        accessToken: 'mock_access_token_123',
        refreshToken: 'mock_refresh_token_abc',
        expiresAt: mockExpiresAt,
      },
      'tenant-test'
    );

    const tokens = zohoTokenStore.getTokens('tenant-test');
    expect(tokens).toBeDefined();
    expect(tokens?.accessToken).toBe('mock_access_token_123');
    expect(tokens?.refreshToken).toBe('mock_refresh_token_abc');
    expect(zohoTokenStore.isAccessTokenValid('tenant-test')).toBe(true);

    // Clean up
    zohoTokenStore.clearTokens('tenant-test');
    expect(zohoTokenStore.getTokens('tenant-test')).toBeUndefined();
  });
});
