import { Router } from 'express';
import authRoutes from './auth.routes.js';
import leadRoutes from './lead.routes.js';
import healthRoutes from './health.routes.js';
import demoRoutes from './demo.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/api/leads', leadRoutes);
router.use('/health', healthRoutes);
router.use('/api/demo', demoRoutes);

export default router;
