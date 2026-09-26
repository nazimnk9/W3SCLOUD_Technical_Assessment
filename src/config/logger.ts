export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

// Keys that must always be masked if they appear in logs
const SENSITIVE_KEYS = new Set([
  'client_secret',
  'clientsecret',
  'access_token',
  'accesstoken',
  'refresh_token',
  'refreshtoken',
  'password',
  'authorization',
  'secret',
  'token',
]);

function maskSensitiveData(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    // If string looks like a Bearer token
    if (data.startsWith('Bearer ')) {
      return 'Bearer [REDACTED]';
    }
    // If string is longer than 20 chars and looks like a secret/token
    if (data.length > 25 && /^[a-zA-Z0-9._-]+$/.test(data)) {
      return `${data.substring(0, 4)}...[REDACTED]...${data.substring(data.length - 4)}`;
    }
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }
  if (typeof data === 'object') {
    const masked: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
      if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('secret') || lowerKey.includes('token')) {
        masked[key] = '[REDACTED_SECRET]';
      } else {
        masked[key] = maskSensitiveData(value);
      }
    }
    return masked;
  }
  return data;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const safeMeta = meta !== undefined ? ` | ${JSON.stringify(maskSensitiveData(meta))}` : '';
    return `[${timestamp}] [${level}] ${message}${safeMeta}`;
  }

  debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, meta));
    }
  }

  info(message: string, meta?: any): void {
    console.log(this.formatMessage(LogLevel.INFO, message, meta));
  }

  warn(message: string, meta?: any): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, meta));
  }

  error(message: string, meta?: any): void {
    console.error(this.formatMessage(LogLevel.ERROR, message, meta));
  }
}

export const logger = new Logger();
