-- ============================================================================
-- ADD COMPREHENSIVE LEAD FIELDS
-- ============================================================================
-- This script adds all the additional fields requested for lead management
-- Run this SQL in Supabase SQL Editor
-- ============================================================================

-- Add new columns to leads table
ALTER TABLE public.leads
  -- Contact Information
  ADD COLUMN IF NOT EXISTS designation TEXT,
  ADD COLUMN IF NOT EXISTS mobile_phone TEXT,
  ADD COLUMN IF NOT EXISTS direct_phone TEXT,
  ADD COLUMN IF NOT EXISTS office_phone TEXT,
  ADD COLUMN IF NOT EXISTS linkedin TEXT,
  
  -- Address Information
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS zip TEXT,
  
  -- Classification & Grouping
  ADD COLUMN IF NOT EXISTS customer_group TEXT,
  ADD COLUMN IF NOT EXISTS product_group TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[], -- Array of tags
  ADD COLUMN IF NOT EXISTS lead_source TEXT,
  ADD COLUMN IF NOT EXISTS data_source TEXT,
  ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
  
  -- Follow-up & Communication
  ADD COLUMN IF NOT EXISTS next_followup_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS followup_notes TEXT,
  ADD COLUMN IF NOT EXISTS repeat_followup BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS do_not_followup BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS do_not_followup_reason TEXT,
  
  -- Comments & Notes
  ADD COLUMN IF NOT EXISTS last_comment TEXT,
  ADD COLUMN IF NOT EXISTS comment_posted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS comment_posted_on TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS lead_notes TEXT,
  ADD COLUMN IF NOT EXISTS organization_notes TEXT,
  
  -- Personal Information
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS special_event_date DATE,
  
  -- Reference URLs
  ADD COLUMN IF NOT EXISTS reference_url1 TEXT,
  ADD COLUMN IF NOT EXISTS reference_url2 TEXT,
  ADD COLUMN IF NOT EXISTS reference_url3 TEXT,
  
  -- List Management
  ADD COLUMN IF NOT EXISTS list_name TEXT;

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_leads_lead_source ON public.leads(lead_source);
CREATE INDEX IF NOT EXISTS idx_leads_customer_group ON public.leads(customer_group);
CREATE INDEX IF NOT EXISTS idx_leads_next_followup_date ON public.leads(next_followup_date);
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON public.leads(lead_score);
CREATE INDEX IF NOT EXISTS idx_leads_city ON public.leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_state ON public.leads(state);
CREATE INDEX IF NOT EXISTS idx_leads_country ON public.leads(country);

-- Add comments to columns for documentation
COMMENT ON COLUMN public.leads.designation IS 'Job title or designation of the contact person';
COMMENT ON COLUMN public.leads.mobile_phone IS 'Mobile phone number';
COMMENT ON COLUMN public.leads.direct_phone IS 'Direct phone number';
COMMENT ON COLUMN public.leads.office_phone IS 'Office phone number';
COMMENT ON COLUMN public.leads.lead_source IS 'Source where the lead came from (e.g., Website, LinkedIn, Referral)';
COMMENT ON COLUMN public.leads.data_source IS 'Original data source of the lead';
COMMENT ON COLUMN public.leads.lead_score IS 'Lead scoring value (0-100)';
COMMENT ON COLUMN public.leads.next_followup_date IS 'Scheduled date for next follow-up';
COMMENT ON COLUMN public.leads.do_not_followup IS 'Flag to indicate if lead should not be followed up';
COMMENT ON COLUMN public.leads.tags IS 'Array of tags for categorization';
