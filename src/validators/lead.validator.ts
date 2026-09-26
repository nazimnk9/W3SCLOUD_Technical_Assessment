import { z } from 'zod';

export const createLeadSchema = z.object({
  body: z.object({
    firstName: z
      .string()
      .trim()
      .max(40, 'First Name must not exceed 40 characters')
      .optional()
      .default(''),
    lastName: z
      .string({ required_error: 'Last Name is required' })
      .trim()
      .min(1, 'Last Name cannot be empty')
      .max(80, 'Last Name must not exceed 80 characters'),
    company: z
      .string({ required_error: 'Company is required' })
      .trim()
      .min(1, 'Company cannot be empty')
      .max(100, 'Company must not exceed 100 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Invalid email address format')
      .max(100, 'Email must not exceed 100 characters'),
    phone: z
      .string()
      .trim()
      .max(30, 'Phone number must not exceed 30 characters')
      .optional()
      .default(''),
    leadStatus: z.string().trim().optional(),
    leadSource: z.string().trim().optional(),
    designation: z.string().trim().optional(),
    description: z.string().trim().optional(),
  }),
});

export const queryLeadsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(200).default(10),
    searchEmail: z.string().trim().email('Invalid search email format').optional(),
  }),
});

export const leadIdParamSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'Record ID is required' })
      .trim()
      .regex(/^\d+$/, 'Record ID must be a numeric string'),
  }),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>['body'];
export type QueryLeadsInput = z.infer<typeof queryLeadsSchema>['query'];
export type LeadIdParamInput = z.infer<typeof leadIdParamSchema>['params'];
