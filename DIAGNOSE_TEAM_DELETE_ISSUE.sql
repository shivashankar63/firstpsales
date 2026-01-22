-- ============================================================================
-- DIAGNOSE TEAM DELETE ISSUE - Run this in Supabase SQL Editor
-- ============================================================================
-- This script helps diagnose why team deletion might be failing
-- ============================================================================

-- 1. Check if RLS is enabled on teams table
SELECT 
  tablename, 
  rowsecurity as rls_enabled 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'teams';

-- 2. Check all policies on teams table
SELECT 
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'teams'
ORDER BY cmd, policyname;

-- 3. Check all policies on team_members table
SELECT 
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'team_members'
ORDER BY cmd, policyname;

-- 4. Check current user and their role
-- (Run this while logged in as the user trying to delete)
SELECT 
  id,
  email,
  full_name,
  role,
  auth.uid() as current_auth_uid
FROM public.users
WHERE id = auth.uid();

-- 5. Check teams and their manager_ids
SELECT 
  id,
  name,
  manager_id,
  (SELECT email FROM public.users WHERE id = teams.manager_id) as manager_email,
  (SELECT role FROM public.users WHERE id = teams.manager_id) as manager_role
FROM public.teams
ORDER BY created_at DESC;

-- 6. Verify foreign key constraints
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (ccu.table_name = 'teams' OR tc.table_name = 'teams')
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- 1. RLS should be enabled (rowsecurity = true)
-- 2. Should see DELETE policy: "Enable delete teams" with USING clause checking manager_id
-- 3. Should see DELETE policy: "Enable delete team members" 
-- 4. Current user should have role = 'manager' or 'owner'
-- 5. Team's manager_id should match current user's id (or user should be owner)
-- 6. Foreign keys should have ON DELETE CASCADE or SET NULL (not RESTRICT)
-- ============================================================================
