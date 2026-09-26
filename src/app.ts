import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import routes from './routes/index.js';
import { requestLogger } from './middleware/request-logger.middleware.js';
import { errorHandler } from './middleware/error-handler.middleware.js';
import { NotFoundError } from './errors/app-error.js';

export function createApp(): Express {
  const app = express();

  // Core Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Serve static files for live demo UI
  const publicDir = path.resolve(process.cwd(), 'public');
  app.use(express.static(publicDir));

  // Mount API & OAuth routes
  app.use(routes);

  // 404 Handler for undefined routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    next(new NotFoundError(`The requested endpoint '${req.method} ${req.originalUrl}' does not exist on this server`));
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
