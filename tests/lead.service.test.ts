import { describe, it, expect, vi, beforeEach } from 'vitest';
import { leadService } from '../src/services/lead.service.js';
import { zohoCrmService } from '../src/services/zoho-crm.service.js';
import { ConflictError } from '../src/errors/app-error.js';

describe('LeadService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should map Zoho CRM lead fields to application LeadResponseDTO properly', async () => {
    const mockZohoLead = {
      id: '716492000000382001',
      First_Name: 'John',
      Last_Name: 'Smith',
      Full_Name: 'John Smith',
      Company: 'ABC Ltd',
      Email: 'john.smith@example.com',
      Phone: '+8801700000000',
      Lead_Status: 'Contacted',
      Created_Time: '2026-09-26T10:00:00+06:00',
    };

    vi.spyOn(zohoCrmService, 'getRecordById').mockResolvedValue(mockZohoLead);

    const lead = await leadService.getLeadById('716492000000382001');

    expect(lead.id).toBe('716492000000382001');
    expect(lead.fullName).toBe('John Smith');
    expect(lead.firstName).toBe('John');
    expect(lead.lastName).toBe('Smith');
    expect(lead.company).toBe('ABC Ltd');
    expect(lead.email).toBe('john.smith@example.com');
    expect(lead.phone).toBe('+8801700000000');
    expect(lead.leadStatus).toBe('Contacted');
  });

  it('should throw ConflictError (409) when attempting to create a lead with an existing email', async () => {
    const existingLead = {
      id: '716492000000382001',
      First_Name: 'Existing',
      Last_Name: 'Lead',
      Full_Name: 'Existing Lead',
      Company: 'Existing Co',
      Email: 'duplicate@example.com',
    };

    vi.spyOn(zohoCrmService, 'searchRecords').mockResolvedValue([existingLead]);

    await expect(
      leadService.createLead({
        firstName: 'Duplicate',
        lastName: 'Attempt',
        company: 'New Co',
        email: 'duplicate@example.com',
      })
    ).rejects.toThrow(ConflictError);
  });
});
