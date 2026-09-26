import { describe, it, expect } from 'vitest';
import { createLeadSchema, queryLeadsSchema, leadIdParamSchema } from '../src/validators/lead.validator.js';

describe('Validation Schemas', () => {
  describe('createLeadSchema', () => {
    it('should validate a valid lead payload', async () => {
      const validPayload = {
        body: {
          firstName: 'John',
          lastName: 'Smith',
          company: 'ABC Ltd',
          email: 'john.smith@example.com',
          phone: '+8801712345678',
          leadStatus: 'Not Contacted',
        },
      };

      const result = await createLeadSchema.safeParseAsync(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body.lastName).toBe('Smith');
        expect(result.data.body.company).toBe('ABC Ltd');
        expect(result.data.body.email).toBe('john.smith@example.com');
      }
    });

    it('should fail when lastName is missing', async () => {
      const invalidPayload = {
        body: {
          firstName: 'John',
          company: 'ABC Ltd',
          email: 'john@example.com',
        },
      };

      const result = await createLeadSchema.safeParseAsync(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find((e) => e.path.includes('lastName'));
        expect(error).toBeDefined();
      }
    });

    it('should fail when email format is invalid', async () => {
      const invalidPayload = {
        body: {
          lastName: 'Smith',
          company: 'ABC Ltd',
          email: 'invalid-email-address',
        },
      };

      const result = await createLeadSchema.safeParseAsync(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find((e) => e.path.includes('email'));
        expect(error).toBeDefined();
        expect(error?.message).toContain('Invalid email address format');
      }
    });

    it('should fail when company is missing', async () => {
      const invalidPayload = {
        body: {
          lastName: 'Smith',
          email: 'smith@example.com',
        },
      };

      const result = await createLeadSchema.safeParseAsync(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find((e) => e.path.includes('company'));
        expect(error).toBeDefined();
      }
    });
  });

  describe('queryLeadsSchema', () => {
    it('should accept valid pagination query', async () => {
      const query = {
        query: {
          page: '2',
          perPage: '20',
        },
      };

      const result = await queryLeadsSchema.safeParseAsync(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query.page).toBe(2);
        expect(result.data.query.perPage).toBe(20);
      }
    });
  });

  describe('leadIdParamSchema', () => {
    it('should accept numeric string ID', async () => {
      const param = { params: { id: '716492000000382001' } };
      const result = await leadIdParamSchema.safeParseAsync(param);
      expect(result.success).toBe(true);
    });

    it('should reject non-numeric string ID', async () => {
      const param = { params: { id: 'abc-xyz' } };
      const result = await leadIdParamSchema.safeParseAsync(param);
      expect(result.success).toBe(false);
    });
  });
});
