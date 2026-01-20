-- ============================================================================
-- FIX: Allow Managers and Owners to Delete Users (Salespeople)
-- ============================================================================
-- This script updates the RLS policy to allow managers and owners to delete users
-- Run this SQL in Supabase SQL Editor
-- ============================================================================

-- Drop the existing delete policy that only allows self-deletion
DROP POLICY IF EXISTS "Enable delete for own user" ON public.users;

-- Create new policy that allows owners and managers to delete users
CREATE POLICY "Enable delete for owners and managers" ON public.users
  FOR DELETE USING (
    -- Allow if deleting own record
    auth.uid() = id OR
    -- Allow if user is owner or manager
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND (role = 'owner' OR role = 'manager')
    )
  );

-- Verify the policy was created
-- You can check by running:
-- SELECT * FROM pg_policies WHERE tablename = 'users' AND policyname = 'Enable delete for owners and managers';
