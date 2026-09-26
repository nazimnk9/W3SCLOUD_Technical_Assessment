import { createApp } from './app.js';
import { env } from './config/env.config.js';
import { logger } from './config/logger.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`========================================================`);
  logger.info(`🚀 W3SCLOUD Zoho CRM API Integration Service Started`);
  logger.info(`📡 Server running on: http://localhost:${env.PORT}`);
  logger.info(`🌐 Environment: ${env.NODE_ENV}`);
  logger.info(`🔑 Zoho Accounts URL: ${env.ZOHO_ACCOUNTS_URL}`);
  logger.info(`⚡ Zoho API Base URL: ${env.ZOHO_API_BASE_URL}`);
  logger.info(`🔗 OAuth Initiate URL: http://localhost:${env.PORT}/auth/zoho`);
  logger.info(`📋 Interactive Dashboard: http://localhost:${env.PORT}`);
  logger.info(`========================================================`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});
