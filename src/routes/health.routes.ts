import { Router } from 'express';
import { healthController } from '../controllers/health.controller.js';

const router = Router();

// GET /health - Service health check
router.get('/', healthController.check);

export default router;
