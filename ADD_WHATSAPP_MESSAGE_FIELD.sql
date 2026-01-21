-- ============================================================================
-- ADD WHATSAPP MESSAGE FIELD
-- ============================================================================
-- This script adds whatsapp_message field to projects and leads tables
-- so you can set custom default WhatsApp messages per project or per lead
-- Run this SQL in Supabase SQL Editor
-- ============================================================================

-- Add whatsapp_message field to projects table
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS whatsapp_message TEXT;

-- Add whatsapp_message field to leads table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS whatsapp_message TEXT;

-- Add comment to explain the fields
COMMENT ON COLUMN public.projects.whatsapp_message IS 'Default WhatsApp message template for leads in this project. Use {company_name} and {contact_name} as placeholders.';
COMMENT ON COLUMN public.leads.whatsapp_message IS 'Custom WhatsApp message for this specific lead. Overrides project default message.';

-- ============================================================================
-- VERIFY SETUP
-- ============================================================================
SELECT 'WhatsApp message fields added successfully!' as status;
