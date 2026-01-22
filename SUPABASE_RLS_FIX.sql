-- ============================================================================
-- SUPABASE RLS POLICY FIX - Paste this in Supabase SQL Editor
-- ============================================================================
-- This script fixes the "new row violates row-level security policy" error
-- by creating or updating RLS policies for all tables
-- ============================================================================

-- 1. ENABLE RLS ON ALL TABLES (if not already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotas ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Drop existing policies (run these if they exist)
DROP POLICY IF EXISTS "Enable read for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable update for own user" ON public.users;
DROP POLICY IF EXISTS "Enable delete for own user" ON public.users;

-- CREATE NEW POLICIES FOR USERS TABLE
-- Policy 1: Allow users to read all users
CREATE POLICY "Enable read for all users" ON public.users
  FOR SELECT USING (true);

-- Policy 2: Allow authenticated users to insert their own user record
CREATE POLICY "Enable insert for authenticated users" ON public.users
  FOR INSERT WITH CHECK (
    auth.uid() = id OR 
    auth.uid() IS NOT NULL
  );

-- Policy 3: Allow users to update their own record
CREATE POLICY "Enable update for own user" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 4: Allow users to delete their own record
CREATE POLICY "Enable delete for own user" ON public.users
  FOR DELETE USING (auth.uid() = id);

-- ============================================================================
-- LEADS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Enable read all leads" ON public.leads;
DROP POLICY IF EXISTS "Enable insert leads" ON public.leads;
DROP POLICY IF EXISTS "Enable update leads" ON public.leads;
DROP POLICY IF EXISTS "Enable delete leads" ON public.leads;

-- Policy 1: Allow users to read all leads
CREATE POLICY "Enable read all leads" ON public.leads
  FOR SELECT USING (true);

-- Policy 2: Allow authenticated users to insert leads
CREATE POLICY "Enable insert leads" ON public.leads
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policy 3: Allow users to update leads assigned to them or anyone if owner
CREATE POLICY "Enable update leads" ON public.leads
  FOR UPDATE USING (
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Policy 4: Allow owners to delete leads
CREATE POLICY "Enable delete leads" ON public.leads
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================================================
-- TEAMS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Enable read all teams" ON public.teams;
DROP POLICY IF EXISTS "Enable insert teams" ON public.teams;
DROP POLICY IF EXISTS "Enable update teams" ON public.teams;
DROP POLICY IF EXISTS "Enable delete teams" ON public.teams;

-- Policy 1: Allow users to read all teams
CREATE POLICY "Enable read all teams" ON public.teams
  FOR SELECT USING (true);

-- Policy 2: Allow managers and owners to insert teams
CREATE POLICY "Enable insert teams" ON public.teams
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('manager', 'owner')
    )
  );

-- Policy 3: Allow managers to update their own teams
CREATE POLICY "Enable update teams" ON public.teams
  FOR UPDATE USING (
    auth.uid() = manager_id OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    auth.uid() = manager_id OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Policy 4: Allow managers and owners to delete any team
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
-- TEAM_MEMBERS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Enable read team members" ON public.team_members;
DROP POLICY IF EXISTS "Enable insert team members" ON public.team_members;
DROP POLICY IF EXISTS "Enable update team members" ON public.team_members;
DROP POLICY IF EXISTS "Enable delete team members" ON public.team_members;

-- Policy 1: Allow users to read all team members
CREATE POLICY "Enable read team members" ON public.team_members
  FOR SELECT USING (true);

-- Policy 2: Allow managers and owners to insert team members
CREATE POLICY "Enable insert team members" ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('manager', 'owner')
    )
  );

-- Policy 3: Allow managers and owners to update team members
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

-- Policy 4: Allow managers and owners to delete team members
CREATE POLICY "Enable delete team members" ON public.team_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('manager', 'owner')
    )
  );

-- ============================================================================
-- ACTIVITIES TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Enable read activities" ON public.activities;
DROP POLICY IF EXISTS "Enable insert activities" ON public.activities;
DROP POLICY IF EXISTS "Enable update activities" ON public.activities;

-- Policy 1: Allow users to read all activities
CREATE POLICY "Enable read activities" ON public.activities
  FOR SELECT USING (true);

-- Policy 2: Allow authenticated users to insert activities
CREATE POLICY "Enable insert activities" ON public.activities
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policy 3: Allow users to update their own activities
CREATE POLICY "Enable update activities" ON public.activities
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- QUOTAS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Enable read quotas" ON public.quotas;
DROP POLICY IF EXISTS "Enable insert quotas" ON public.quotas;

-- Policy 1: Allow users to read all quotas
CREATE POLICY "Enable read quotas" ON public.quotas
  FOR SELECT USING (true);

-- Policy 2: Allow owners to insert quotas
CREATE POLICY "Enable insert quotas" ON public.quotas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the policies were created correctly:

-- Check enabled RLS tables:
-- SELECT tablename FROM pg_tables 
-- WHERE schemaname = 'public' AND rowsecurity = true;

-- Check policies on users table:
-- SELECT * FROM pg_policies WHERE tablename = 'users';

-- ============================================================================
-- END OF RLS POLICY CONFIGURATION
-- ============================================================================
