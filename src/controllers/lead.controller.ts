import { Request, Response, NextFunction } from 'express';
import { leadService } from '../services/lead.service.js';
import { HTTP_STATUS } from '../constants/http-status.js';
import { ApiResponse } from '../types/common.types.js';
import { CreateLeadDTO, LeadResponseDTO } from '../types/lead.types.js';

export class LeadController {
  /**
   * GET /api/leads
   * Retrieves paginated leads from Zoho CRM.
   */
  public getLeads = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const perPage = req.query.perPage ? Number(req.query.perPage) : 10;
      const searchEmail = req.query.searchEmail as string | undefined;

      if (searchEmail) {
        const leads = await leadService.searchLeadByEmail(searchEmail);
        const response: ApiResponse<LeadResponseDTO[]> = {
          success: true,
          message: `Found ${leads.length} lead(s) matching email '${searchEmail}'`,
          data: leads,
        };
        res.status(HTTP_STATUS.OK).json(response);
        return;
      }

      const { leads, pagination } = await leadService.getLeads({ page, perPage });

      const response: ApiResponse<LeadResponseDTO[]> = {
        success: true,
        message: `Successfully retrieved ${leads.length} leads from Zoho CRM`,
        data: leads,
        pagination,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/leads/:id
   * Retrieves a single lead by its Zoho Record ID.
   */
  public getLeadById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const lead = await leadService.getLeadById(id);

      const response: ApiResponse<LeadResponseDTO> = {
        success: true,
        message: `Successfully retrieved Lead '${id}' from Zoho CRM`,
        data: lead,
      };

      res.status(HTTP_STATUS.OK).json(response);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/leads
   * Creates a new Lead in Zoho CRM with duplicate validation.
   */
  public createLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto: CreateLeadDTO = req.body;
      const result = await leadService.createLead(dto);

      const response: ApiResponse<{ lead: LeadResponseDTO; zohoRecordId: string }> = {
        success: true,
        message: `Lead successfully created in Zoho CRM with ID: ${result.zohoRecordId}`,
        data: {
          lead: result.lead,
          zohoRecordId: result.zohoRecordId,
        },
      };

      res.status(HTTP_STATUS.CREATED).json(response);
    } catch (err) {
      next(err);
    }
  };
}

export const leadController = new LeadController();
