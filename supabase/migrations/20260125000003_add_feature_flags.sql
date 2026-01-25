-- Migration: Add feature_flags column to projects table
-- Description: Project-level feature flags for gradual rollout

-- Add feature_flags column to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}';

-- Add comment
COMMENT ON COLUMN projects.feature_flags IS
  'Project-level feature flags. Example: {"semanticLayer": true, "eventCollection": false}';

-- Add retention columns to mart_ga4_daily_kpis
ALTER TABLE mart_ga4_daily_kpis
  ADD COLUMN IF NOT EXISTS dau_per_mau NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS dau_per_wau NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS wau_per_mau NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS active_1day_users INTEGER,
  ADD COLUMN IF NOT EXISTS active_7day_users INTEGER,
  ADD COLUMN IF NOT EXISTS active_28day_users INTEGER;

-- Add comments for retention columns
COMMENT ON COLUMN mart_ga4_daily_kpis.dau_per_mau IS 'DAU/MAU ratio (stickiness)';
COMMENT ON COLUMN mart_ga4_daily_kpis.dau_per_wau IS 'DAU/WAU ratio';
COMMENT ON COLUMN mart_ga4_daily_kpis.wau_per_mau IS 'WAU/MAU ratio';
COMMENT ON COLUMN mart_ga4_daily_kpis.active_1day_users IS 'Users active in last 1 day';
COMMENT ON COLUMN mart_ga4_daily_kpis.active_7day_users IS 'Users active in last 7 days (WAU)';
COMMENT ON COLUMN mart_ga4_daily_kpis.active_28day_users IS 'Users active in last 28 days (MAU)';
