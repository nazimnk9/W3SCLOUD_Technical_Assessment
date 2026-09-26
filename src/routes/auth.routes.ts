import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { oauthCallbackSchema } from '../validators/oauth.validator.js';

const router = Router();

// GET /auth/zoho - Generate Zoho OAuth authorization URL or redirect
router.get('/zoho', authController.initiateAuth);

// GET /auth/zoho/callback - Handle Zoho OAuth callback with authorization code
router.get('/zoho/callback', validate(oauthCallbackSchema), authController.handleCallback);

// GET /auth/status - Get current OAuth credentials & token status
router.get('/status', authController.getStatus);

// POST /auth/refresh - Manually refresh access token
router.post('/refresh', authController.refresh);

export default router;
