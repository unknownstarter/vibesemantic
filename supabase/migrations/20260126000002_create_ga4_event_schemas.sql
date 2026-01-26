-- Migration: Create GA4 event schemas table
-- Description: Stores GA4 event definitions (event names, parameters, dimensions) for each property
-- This allows AI to understand event structure and recommend relevant events based on project purpose

-- Create ga4_event_schemas table
CREATE TABLE IF NOT EXISTS ga4_event_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL, -- GA4 property ID
  event_name TEXT NOT NULL,
  event_type TEXT DEFAULT 'custom', -- 'standard' or 'custom'
  description TEXT,
  parameters JSONB DEFAULT '{}', -- Event parameters: { param_name: { type, description, sample_values } }
  common_dimensions JSONB DEFAULT '{}', -- Common dimensions used with this event
  priority INTEGER DEFAULT 3, -- 1=highest, 5=lowest (for recommendation)
  is_active BOOLEAN DEFAULT true,
  last_seen_date DATE, -- Last date this event was observed
  event_count_30d BIGINT DEFAULT 0, -- Total events in last 30 days (for prioritization)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, property_id, event_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ga4_event_schemas_project_property 
  ON ga4_event_schemas(project_id, property_id);

CREATE INDEX IF NOT EXISTS idx_ga4_event_schemas_priority 
  ON ga4_event_schemas(project_id, priority, is_active);

CREATE INDEX IF NOT EXISTS idx_ga4_event_schemas_event_name 
  ON ga4_event_schemas(event_name);

-- Enable RLS
ALTER TABLE ga4_event_schemas ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Project members can access their project's event schemas
CREATE POLICY "ga4_event_schemas_project_member" ON ga4_event_schemas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = ga4_event_schemas.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.status = 'active'
    )
  );

-- Add comments
COMMENT ON TABLE ga4_event_schemas IS 'GA4 event schema definitions for each property. Stores event names, parameters, and dimensions to enable intelligent event recommendation.';
COMMENT ON COLUMN ga4_event_schemas.event_type IS 'Event type: standard (GA4 built-in) or custom (user-defined)';
COMMENT ON COLUMN ga4_event_schemas.parameters IS 'Event parameters as JSONB: { param_name: { type: string|number, description: string, sample_values: string[] } }';
COMMENT ON COLUMN ga4_event_schemas.common_dimensions IS 'Common dimensions used with this event: { dimension_name: { type: string, sample_values: string[] } }';
COMMENT ON COLUMN ga4_event_schemas.priority IS 'Recommendation priority: 1=highest (critical events), 5=lowest (rare events)';
COMMENT ON COLUMN ga4_event_schemas.event_count_30d IS 'Total event count in last 30 days for prioritization';

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_ga4_event_schemas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ga4_event_schemas_updated_at
  BEFORE UPDATE ON ga4_event_schemas
  FOR EACH ROW
  EXECUTE FUNCTION update_ga4_event_schemas_updated_at();
