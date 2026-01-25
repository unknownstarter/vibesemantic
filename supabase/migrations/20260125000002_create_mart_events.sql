-- Migration: Create mart_events table
-- Description: Stores aggregated event data from GA4 and other sources

-- Create mart_events table
CREATE TABLE IF NOT EXISTS mart_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  date DATE NOT NULL,
  event_name TEXT NOT NULL,
  event_params JSONB DEFAULT '{}',
  event_count BIGINT DEFAULT 0,
  unique_users BIGINT DEFAULT 0,
  events_per_user NUMERIC(10,4),
  dimensions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, source, date, event_name, dimensions)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_mart_events_lookup
  ON mart_events(project_id, date, event_name);

CREATE INDEX IF NOT EXISTS idx_mart_events_date_range
  ON mart_events(project_id, date DESC);

-- Use jsonb_path_ops for @> containment queries (smaller, faster)
CREATE INDEX IF NOT EXISTS idx_mart_events_dimensions
  ON mart_events USING GIN(dimensions jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_mart_events_params
  ON mart_events USING GIN(event_params jsonb_path_ops);

-- Enable RLS
ALTER TABLE mart_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Project members can access their project's events
CREATE POLICY "mart_events_project_member" ON mart_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = mart_events.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.status = 'active'
    )
  );

-- Add comments
COMMENT ON TABLE mart_events IS 'Aggregated event data from GA4 and other sources';
COMMENT ON COLUMN mart_events.source IS 'Data source: ga4, csv, bigquery';
COMMENT ON COLUMN mart_events.event_name IS 'Event name (e.g., page_view, purchase, sign_up)';
COMMENT ON COLUMN mart_events.event_params IS 'Event parameters as JSONB';
COMMENT ON COLUMN mart_events.dimensions IS 'Dimensional breakdown as JSONB';
COMMENT ON COLUMN mart_events.events_per_user IS 'Average events per unique user';
