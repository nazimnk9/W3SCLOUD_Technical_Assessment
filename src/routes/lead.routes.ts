import { Router } from 'express';
import { leadController } from '../controllers/lead.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createLeadSchema,
  leadIdParamSchema,
  queryLeadsSchema,
} from '../validators/lead.validator.js';

const router = Router();

// GET /api/leads - Read records from Leads (with pagination)
router.get('/', validate(queryLeadsSchema), leadController.getLeads);

// POST /api/leads - Create new Lead with validation & duplicate prevention
router.post('/', validate(createLeadSchema), leadController.createLead);

// GET /api/leads/:id - Retrieve inserted record using returned Record ID
router.get('/:id', validate(leadIdParamSchema), leadController.getLeadById);

export default router;
