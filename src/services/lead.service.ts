import { zohoCrmService } from './zoho-crm.service.js';
import { ZOHO_MODULES } from '../constants/zoho.constants.js';
import { CreateLeadDTO, LeadResponseDTO, QueryLeadsDTO } from '../types/lead.types.js';
import { ZohoLeadPayload, ZohoModuleResponse } from '../types/zoho.types.js';
import { ConflictError, NotFoundError } from '../errors/app-error.js';
import { logger } from '../config/logger.js';
import { PaginationMeta } from '../types/common.types.js';

export class LeadService {
  /**
   * Transforms raw Zoho CRM Lead data into a clean application Lead DTO.
   */
  private mapZohoLeadToDTO(raw: Record<string, any>): LeadResponseDTO {
    const firstName = raw.First_Name || '';
    const lastName = raw.Last_Name || '';
    const fullName = raw.Full_Name || `${firstName} ${lastName}`.trim() || 'N/A';

    return {
      id: raw.id,
      fullName,
      firstName: raw.First_Name,
      lastName: raw.Last_Name,
      company: raw.Company || 'N/A',
      email: raw.Email || '',
      phone: raw.Phone || '',
      leadStatus: raw.Lead_Status || '',
      createdAt: raw.Created_Time,
      modifiedAt: raw.Modified_Time,
      rawZohoData: process.env.NODE_ENV === 'development' ? raw : undefined,
    };
  }

  /**
   * Retrieves a paginated list of Leads from Zoho CRM.
   */
  public async getLeads(query: QueryLeadsDTO = {}, tenantId = 'default'): Promise<{ leads: LeadResponseDTO[]; pagination: PaginationMeta }> {
    const page = query.page || 1;
    const perPage = query.perPage || 10;

    // Specific field selection optimizes payload size and network bandwidth
    const fields = 'id,First_Name,Last_Name,Full_Name,Company,Email,Phone,Lead_Status,Created_Time,Modified_Time';

    const response: ZohoModuleResponse<Record<string, any>> = await zohoCrmService.getRecords(
      ZOHO_MODULES.LEADS,
      {
        page,
        per_page: perPage,
        fields,
      },
      tenantId
    );

    const rawLeads = response.data || [];
    const leads = rawLeads.map((item) => this.mapZohoLeadToDTO(item));

    const pagination: PaginationMeta = {
      page: response.info?.page || page,
      perPage: response.info?.per_page || perPage,
      moreRecords: response.info?.more_records ?? false,
      count: response.info?.count ?? leads.length,
    };

    return { leads, pagination };
  }

  /**
   * Retrieves a single Lead by its unique Zoho Record ID.
   */
  public async getLeadById(id: string, tenantId = 'default'): Promise<LeadResponseDTO> {
    const rawLead = await zohoCrmService.getRecordById<Record<string, any>>(ZOHO_MODULES.LEADS, id, tenantId);
    if (!rawLead) {
      throw new NotFoundError(`Lead with ID '${id}' does not exist in Zoho CRM`);
    }
    return this.mapZohoLeadToDTO(rawLead);
  }

  /**
   * Searches for existing Leads by Email in Zoho CRM.
   */
  public async searchLeadByEmail(email: string, tenantId = 'default'): Promise<LeadResponseDTO[]> {
    const rawResults = await zohoCrmService.searchRecords<Record<string, any>>(
      ZOHO_MODULES.LEADS,
      { email },
      tenantId
    );
    return rawResults.map((item) => this.mapZohoLeadToDTO(item));
  }

  /**
   * Creates a new Lead in Zoho CRM with duplicate prevention.
   */
  public async createLead(
    dto: CreateLeadDTO,
    tenantId = 'default'
  ): Promise<{ lead: LeadResponseDTO; isDuplicate: boolean; zohoRecordId: string }> {
    // 1. Duplicate Prevention: Check if a lead with this email already exists
    if (dto.email) {
      logger.info(`[LeadService] Checking for duplicates with email: ${dto.email}`);
      const existingLeads = await this.searchLeadByEmail(dto.email, tenantId);

      if (existingLeads && existingLeads.length > 0) {
        const existing = existingLeads[0];
        logger.warn(`[LeadService] Duplicate Lead detected. Existing Record ID: ${existing.id}`);
        throw new ConflictError(
          `A Lead with email '${dto.email}' already exists in Zoho CRM (ID: ${existing.id}, Name: ${existing.fullName}).`,
          {
            existingRecordId: existing.id,
            existingName: existing.fullName,
            existingCompany: existing.company,
            email: dto.email,
          }
        );
      }
    }

    // 2. Map application DTO to exact Zoho CRM API field names
    const zohoPayload: ZohoLeadPayload = {
      First_Name: dto.firstName,
      Last_Name: dto.lastName,
      Company: dto.company,
      Email: dto.email,
      Phone: dto.phone,
      Lead_Status: dto.leadStatus || 'Not Contacted',
      Lead_Source: dto.leadSource || 'External API / W3SCLOUD Assessment',
      Designation: dto.designation,
      Description: dto.description || 'Created via W3SCLOUD Technical Assessment API Integration',
    };

    // 3. Post to Zoho CRM API
    const response = await zohoCrmService.createRecord(ZOHO_MODULES.LEADS, zohoPayload, tenantId);

    const responseItem = response?.data?.[0];
    const createdId = responseItem?.details?.id;

    if (!createdId) {
      throw new Error('Zoho CRM record creation succeeded but failed to return a Record ID');
    }

    logger.info(`[LeadService] Successfully created Lead in Zoho CRM. New Record ID: ${createdId}`);

    // 4. Retrieve created Lead by returned Record ID to confirm persistence & return full record
    const retrievedLead = await this.getLeadById(createdId, tenantId);

    return {
      lead: retrievedLead,
      isDuplicate: false,
      zohoRecordId: createdId,
    };
  }
}

export const leadService = new LeadService();
