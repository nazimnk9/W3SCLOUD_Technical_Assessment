import { Router } from 'express';
import { errorDemoController } from '../controllers/error-demo.controller.js';

const router = Router();

// GET /api/demo/errors/scope-mismatch - Demonstrates 403 OAUTH_SCOPE_MISMATCH
router.get('/errors/scope-mismatch', errorDemoController.triggerScopeMismatch);

// GET /api/demo/errors/invalid-token - Demonstrates 401 OAUTH_INVALID_TOKEN
router.get('/errors/invalid-token', errorDemoController.triggerInvalidToken);

// GET /api/demo/errors/invalid-module - Demonstrates 404 ZOHO_INVALID_MODULE
router.get('/errors/invalid-module', errorDemoController.triggerInvalidModule);

// POST /api/demo/errors/validation-error - Demonstrates 400 VALIDATION_ERROR
router.post('/errors/validation-error', errorDemoController.triggerValidationError);

// GET /api/demo/errors/rate-limit - Demonstrates 429 Rate Limit
router.get('/errors/rate-limit', errorDemoController.triggerRateLimit);

export default router;
