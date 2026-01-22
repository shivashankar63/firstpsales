-- ============================================================================
-- FIX TEAMS DELETE RLS POLICIES - Paste this in Supabase SQL Editor
-- ============================================================================
-- This script adds the missing DELETE policies for teams and team_members tables
-- ============================================================================

-- ============================================================================
-- TEAMS TABLE - ADD DELETE POLICY
-- ============================================================================

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Enable delete teams" ON public.teams;

-- Policy: Allow managers and owners to delete any team
-- This allows: 1) Team manager to delete their own team, 2) Any manager/owner to delete any team
-- This handles cases where manager_id might be null
CREATE POLICY "Enable delete teams" ON public.teams
  FOR DELETE USING (
    auth.uid() = manager_id OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('manager', 'owner')
    )
  );

-- ============================================================================
-- TEAM_MEMBERS TABLE - ADD DELETE POLICY
-- ============================================================================

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Enable delete team members" ON public.team_members;

-- Policy: Allow managers and owners to delete team members
CREATE POLICY "Enable delete team members" ON public.team_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('manager', 'owner')
    )
  );

-- ============================================================================
-- TEAM_MEMBERS TABLE - ADD UPDATE POLICY (if needed)
-- ============================================================================

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Enable update team members" ON public.team_members;

-- Policy: Allow managers and owners to update team members
CREATE POLICY "Enable update team members" ON public.team_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('manager', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('manager', 'owner')
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify the policies were created:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'teams';
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'team_members';
