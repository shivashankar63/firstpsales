-- ============================================================================
-- FIX LEADS TABLE - Make email and phone nullable
-- Run this SQL in Supabase SQL Editor to allow NULL values for email and phone
-- ============================================================================

-- Remove NOT NULL constraint from email column
ALTER TABLE public.leads 
ALTER COLUMN email DROP NOT NULL;

-- Remove NOT NULL constraint from phone column (if it exists)
ALTER TABLE public.leads 
ALTER COLUMN phone DROP NOT NULL;

-- Verify the changes
-- You can run this to check:
-- SELECT column_name, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'leads' AND column_name IN ('email', 'phone');
