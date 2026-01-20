-- ============================================================================
-- FIX: Allow Managers to Delete Leads
-- ============================================================================
-- This script updates the RLS policy to allow managers to delete leads
-- Run this SQL in Supabase SQL Editor
-- ============================================================================

-- Drop the existing delete policy
DROP POLICY IF EXISTS "Enable delete leads" ON public.leads;

-- Create new policy that allows both owners and managers to delete leads
CREATE POLICY "Enable delete leads" ON public.leads
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND (role = 'owner' OR role = 'manager')
    )
  );

-- Verify the policy was created
-- You can check by running:
-- SELECT * FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Enable delete leads';
