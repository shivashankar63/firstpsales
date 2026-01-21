// Comprehensive Lead type definition with all fields
export interface Lead {
  id: string;
  
  // Basic Information (existing)
  company_name: string;
  contact_name: string;
  email?: string | null;
  phone?: string | null;
  status: 'new' | 'qualified' | 'proposal' | 'closed_won' | 'not_interested';
  value: number;
  assigned_to?: string | null;
  project_id: string;
  created_by: string;
  description?: string | null;
  link?: string | null;
  created_at: string;
  updated_at: string;
  last_contacted_at?: string | null;
  
  // Contact Information (new)
  designation?: string | null;
  mobile_phone?: string | null;
  direct_phone?: string | null;
  office_phone?: string | null;
  linkedin?: string | null;
  
  // Address Information (new)
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip?: string | null;
  
  // Classification & Grouping (new)
  customer_group?: string | null;
  product_group?: string | null;
  tags?: string[] | null;
  lead_source?: string | null;
  data_source?: string | null;
  lead_score?: number | null;
  
  // Follow-up & Communication (new)
  next_followup_date?: string | null;
  followup_notes?: string | null;
  repeat_followup?: boolean | null;
  do_not_followup?: boolean | null;
  do_not_followup_reason?: string | null;
  
  // Comments & Notes (new)
  last_comment?: string | null;
  comment_posted_by?: string | null;
  comment_posted_on?: string | null;
  lead_notes?: string | null;
  organization_notes?: string | null;
  
  // Personal Information (new)
  date_of_birth?: string | null;
  special_event_date?: string | null;
  
  // Reference URLs (new)
  reference_url1?: string | null;
  reference_url2?: string | null;
  reference_url3?: string | null;
  
  // List Management (new)
  list_name?: string | null;
  
  // Relations
  projects?: { name: string; deadline?: string } | null;
}

// Type for creating a new lead (allows partial data)
export type CreateLeadInput = Partial<Omit<Lead, 'id' | 'created_at' | 'updated_at'>> & {
  company_name: string;
  project_id: string;
  status?: 'new' | 'qualified' | 'proposal' | 'closed_won' | 'not_interested';
  value?: number;
};

// Type for updating a lead (all fields optional except id)
export type UpdateLeadInput = Partial<Omit<Lead, 'id' | 'created_at' | 'updated_at'>>;
