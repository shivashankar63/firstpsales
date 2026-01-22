-- ============================================================================
-- FIX NULL MANAGER_ID IN TEAMS - Paste this in Supabase SQL Editor
-- ============================================================================
-- This script fixes teams that have null manager_id
-- ============================================================================

-- Option 1: Set manager_id to the first manager/owner user for teams with null manager_id
-- (Only run this if you want to assign existing teams to a manager)
UPDATE public.teams
SET manager_id = (
  SELECT id FROM public.users 
  WHERE role IN ('manager', 'owner') 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE manager_id IS NULL;

-- Option 2: Delete teams with null manager_id (if they're orphaned)
-- Uncomment the line below if you want to delete teams with null manager_id instead
-- DELETE FROM public.teams WHERE manager_id IS NULL;

-- Verify the fix
SELECT 
  id,
  name,
  manager_id,
  (SELECT email FROM public.users WHERE id = teams.manager_id) as manager_email,
  (SELECT role FROM public.users WHERE id = teams.manager_id) as manager_role
FROM public.teams
WHERE manager_id IS NULL;

-- Should return 0 rows if all teams have manager_id set
