-- ============================================================================
-- DATABASE IMPROVEMENTS & OPTIMIZATIONS
-- Run this SQL in Supabase SQL Editor to improve performance and add missing features
-- ============================================================================

-- ============================================================================
-- 1. ADD MISSING COLUMN: last_contacted_at (if not exists)
-- ============================================================================
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- 2. ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for last_contacted_at (used in "needs attention" filtering)
CREATE INDEX IF NOT EXISTS idx_leads_last_contacted_at 
  ON public.leads(last_contacted_at) 
  WHERE last_contacted_at IS NOT NULL;

-- Index for company_name (used in search)
CREATE INDEX IF NOT EXISTS idx_leads_company_name 
  ON public.leads(company_name);

-- Index for contact_name (used in search)
CREATE INDEX IF NOT EXISTS idx_leads_contact_name 
  ON public.leads(contact_name);

-- Index for email (used in search and filtering)
CREATE INDEX IF NOT EXISTS idx_leads_email 
  ON public.leads(email) 
  WHERE email IS NOT NULL;

-- Index for value (used in sorting and filtering)
CREATE INDEX IF NOT EXISTS idx_leads_value 
  ON public.leads(value DESC);

-- Index for created_at (used in sorting)
CREATE INDEX IF NOT EXISTS idx_leads_created_at 
  ON public.leads(created_at DESC);

-- Index for updated_at (used in sorting)
CREATE INDEX IF NOT EXISTS idx_leads_updated_at 
  ON public.leads(updated_at DESC);

-- Composite index for common query: assigned_to + status
CREATE INDEX IF NOT EXISTS idx_leads_assigned_status 
  ON public.leads(assigned_to, status) 
  WHERE assigned_to IS NOT NULL;

-- Composite index for common query: project_id + status
CREATE INDEX IF NOT EXISTS idx_leads_project_status 
  ON public.leads(project_id, status);

-- Composite index for filtering: status + value
CREATE INDEX IF NOT EXISTS idx_leads_status_value 
  ON public.leads(status, value DESC);

-- Index for do_not_followup flag
CREATE INDEX IF NOT EXISTS idx_leads_do_not_followup 
  ON public.leads(do_not_followup) 
  WHERE do_not_followup = true;

-- Index for tags array (GIN index for array searches)
CREATE INDEX IF NOT EXISTS idx_leads_tags_gin 
  ON public.leads USING GIN(tags) 
  WHERE tags IS NOT NULL;

-- ============================================================================
-- 3. ADD FULL-TEXT SEARCH INDEXES (for better search performance)
-- ============================================================================

-- Full-text search index for company_name and contact_name
CREATE INDEX IF NOT EXISTS idx_leads_search_text 
  ON public.leads USING GIN(
    to_tsvector('english', 
      COALESCE(company_name, '') || ' ' || 
      COALESCE(contact_name, '') || ' ' || 
      COALESCE(email, '')
    )
  );

-- ============================================================================
-- 4. ADD MISSING INDEXES FOR OTHER TABLES
-- ============================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email 
  ON public.users(email);

CREATE INDEX IF NOT EXISTS idx_users_manager_id 
  ON public.users(manager_id) 
  WHERE manager_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_is_active 
  ON public.users(is_active) 
  WHERE is_active = true;

-- Projects table indexes
CREATE INDEX IF NOT EXISTS idx_projects_status 
  ON public.projects(status);

CREATE INDEX IF NOT EXISTS idx_projects_created_at 
  ON public.projects(created_at DESC);

-- Activities table indexes
CREATE INDEX IF NOT EXISTS idx_activities_created_at 
  ON public.activities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activities_type 
  ON public.activities(type);

-- Lead activities table indexes
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at 
  ON public.lead_activities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_activities_type 
  ON public.lead_activities(type);

CREATE INDEX IF NOT EXISTS idx_lead_activities_user_id 
  ON public.lead_activities(user_id);

-- ============================================================================
-- 5. ADD CONSTRAINTS FOR DATA INTEGRITY
-- ============================================================================

-- Ensure lead_score is between 0 and 100
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS chk_lead_score_range;

ALTER TABLE public.leads
  ADD CONSTRAINT chk_lead_score_range 
  CHECK (lead_score >= 0 AND lead_score <= 100);

-- Ensure value is non-negative
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS chk_lead_value_positive;

ALTER TABLE public.leads
  ADD CONSTRAINT chk_lead_value_positive 
  CHECK (value >= 0);

-- Ensure next_followup_date is in the future (or allow null)
-- Note: This constraint is commented out as it might be too restrictive
-- ALTER TABLE public.leads
--   ADD CONSTRAINT chk_next_followup_future 
--   CHECK (next_followup_date IS NULL OR next_followup_date >= CURRENT_TIMESTAMP);

-- ============================================================================
-- 6. ADD MATERIALIZED VIEW FOR DASHBOARD STATS (Performance Optimization)
-- ============================================================================

-- Create a materialized view for dashboard statistics
DROP MATERIALIZED VIEW IF EXISTS public.dashboard_stats;

CREATE MATERIALIZED VIEW public.dashboard_stats AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'new') as new_leads_count,
  COUNT(*) FILTER (WHERE status = 'qualified') as qualified_leads_count,
  COUNT(*) FILTER (WHERE status = 'proposal') as proposal_leads_count,
  COUNT(*) FILTER (WHERE status = 'closed_won') as won_leads_count,
  COUNT(*) FILTER (WHERE status = 'not_interested') as lost_leads_count,
  COUNT(*) as total_leads_count,
  COALESCE(SUM(value) FILTER (WHERE status = 'closed_won'), 0) as total_revenue,
  COALESCE(SUM(value) FILTER (WHERE status IN ('new', 'qualified', 'proposal')), 0) as pipeline_value,
  COUNT(DISTINCT assigned_to) FILTER (WHERE assigned_to IS NOT NULL) as active_salespeople_count,
  COUNT(DISTINCT project_id) as active_projects_count
FROM public.leads;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_stats_unique 
  ON public.dashboard_stats ((1));

-- Function to refresh dashboard stats
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. ADD FUNCTION FOR LEAD STATISTICS BY SALESPERSON
-- ============================================================================

CREATE OR REPLACE FUNCTION get_salesperson_stats(salesperson_id UUID)
RETURNS TABLE (
  total_leads BIGINT,
  active_leads BIGINT,
  won_leads BIGINT,
  total_revenue NUMERIC,
  win_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_leads,
    COUNT(*) FILTER (WHERE status IN ('new', 'qualified', 'proposal'))::BIGINT as active_leads,
    COUNT(*) FILTER (WHERE status = 'closed_won')::BIGINT as won_leads,
    COALESCE(SUM(value) FILTER (WHERE status = 'closed_won'), 0) as total_revenue,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE status = 'closed_won')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0
    END as win_rate
  FROM public.leads
  WHERE assigned_to = salesperson_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 8. ADD FUNCTION FOR LEADS NEEDING ATTENTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_leads_needing_attention(days_threshold INTEGER DEFAULT 7)
RETURNS TABLE (
  lead_id UUID,
  company_name TEXT,
  contact_name TEXT,
  assigned_to UUID,
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  days_since_contact NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.company_name,
    l.contact_name,
    l.assigned_to,
    l.last_contacted_at,
    CASE 
      WHEN l.last_contacted_at IS NULL THEN 
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - l.created_at)) / 86400
      ELSE 
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - l.last_contacted_at)) / 86400
    END as days_since_contact
  FROM public.leads l
  WHERE 
    l.status IN ('new', 'qualified', 'proposal')
    AND l.do_not_followup = false
    AND (
      l.last_contacted_at IS NULL 
      OR l.last_contacted_at < CURRENT_TIMESTAMP - (days_threshold || ' days')::INTERVAL
    )
  ORDER BY days_since_contact DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 9. ADD TRIGGER TO AUTO-UPDATE last_contacted_at ON ACTIVITY
-- ============================================================================

CREATE OR REPLACE FUNCTION update_lead_last_contacted()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_contacted_at when a new activity is created for a lead
  IF NEW.lead_id IS NOT NULL AND NEW.type IN ('call', 'email', 'meeting') THEN
    UPDATE public.leads
    SET last_contacted_at = NEW.created_at
    WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_lead_last_contacted ON public.lead_activities;

CREATE TRIGGER trigger_update_lead_last_contacted
  AFTER INSERT ON public.lead_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_last_contacted();

-- ============================================================================
-- 10. ADD INDEXES FOR COMMON FILTER COMBINATIONS
-- ============================================================================

-- Index for filtering by source and priority
CREATE INDEX IF NOT EXISTS idx_leads_source_score 
  ON public.leads(lead_source, lead_score DESC) 
  WHERE lead_source IS NOT NULL;

-- Index for filtering by location
CREATE INDEX IF NOT EXISTS idx_leads_location 
  ON public.leads(country, state, city) 
  WHERE country IS NOT NULL;

-- ============================================================================
-- 11. ADD PARTIAL INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Index for active leads only
CREATE INDEX IF NOT EXISTS idx_leads_active 
  ON public.leads(assigned_to, status, updated_at DESC)
  WHERE status IN ('new', 'qualified', 'proposal') 
    AND assigned_to IS NOT NULL;

-- Index for unassigned leads
CREATE INDEX IF NOT EXISTS idx_leads_unassigned 
  ON public.leads(project_id, created_at DESC)
  WHERE assigned_to IS NULL;

-- Index for leads with follow-ups due
CREATE INDEX IF NOT EXISTS idx_leads_followup_due 
  ON public.leads(next_followup_date, assigned_to)
  WHERE next_followup_date IS NOT NULL 
    AND do_not_followup = false;

-- ============================================================================
-- 12. ANALYZE TABLES FOR QUERY OPTIMIZATION
-- ============================================================================

ANALYZE public.leads;
ANALYZE public.users;
ANALYZE public.projects;
ANALYZE public.activities;
ANALYZE public.lead_activities;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check all indexes on leads table
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'leads' 
ORDER BY indexname;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Run REFRESH MATERIALIZED VIEW dashboard_stats; periodically or via cron
-- 2. Monitor index usage with: SELECT * FROM pg_stat_user_indexes;
-- 3. Consider dropping unused indexes if they're not being used
-- 4. The materialized view can be refreshed on a schedule (e.g., every hour)
-- 5. Full-text search indexes will improve search performance significantly
-- ============================================================================
