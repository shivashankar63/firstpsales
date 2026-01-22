-- ============================================================================
-- CREATE USER SESSIONS TABLE - Paste this in Supabase SQL Editor
-- ============================================================================
-- This script creates a table to track user login and logout times
-- ============================================================================

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  login_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  logout_time TIMESTAMP WITH TIME ZONE,
  session_duration_minutes INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_login_time ON public.user_sessions(login_time);
CREATE INDEX IF NOT EXISTS idx_user_sessions_logout_time ON public.user_sessions(logout_time);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Managers can read all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.user_sessions;

-- RLS Policies
-- Allow users to read their own sessions
CREATE POLICY "Users can read their own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Allow managers and owners to read all sessions
CREATE POLICY "Managers can read all sessions" ON public.user_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('manager', 'owner')
    )
  );

-- Allow authenticated users to insert their own sessions
CREATE POLICY "Users can insert their own sessions" ON public.user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own sessions
CREATE POLICY "Users can update their own sessions" ON public.user_sessions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to calculate session duration
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.logout_time IS NOT NULL AND NEW.login_time IS NOT NULL THEN
    NEW.session_duration_minutes := EXTRACT(EPOCH FROM (NEW.logout_time - NEW.login_time)) / 60;
  END IF;
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS update_session_duration ON public.user_sessions;

-- Trigger to automatically calculate session duration
CREATE TRIGGER update_session_duration
  BEFORE UPDATE ON public.user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_session_duration();
