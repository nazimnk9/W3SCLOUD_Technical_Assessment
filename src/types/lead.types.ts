export interface CreateLeadDTO {
  firstName?: string;
  lastName: string;
  company: string;
  email: string;
  phone?: string;
  leadStatus?: string;
  leadSource?: string;
  designation?: string;
  description?: string;
}

export interface LeadResponseDTO {
  id: string;
  fullName: string;
  firstName?: string;
  lastName: string;
  company: string;
  email: string;
  phone?: string;
  leadStatus?: string;
  createdAt?: string;
  modifiedAt?: string;
  rawZohoData?: Record<string, any>;
}

export interface QueryLeadsDTO {
  page?: number;
  perPage?: number;
  searchEmail?: string;
}
