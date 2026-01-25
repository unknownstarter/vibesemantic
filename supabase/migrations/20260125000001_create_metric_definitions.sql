-- Migration: Create metric_definitions table
-- Description: Stores project-specific metric definitions for semantic layer

-- Create metric_definitions table
CREATE TABLE IF NOT EXISTS metric_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  source_type TEXT NOT NULL,
  source_table TEXT,
  source_column TEXT,
  formula TEXT,
  dependencies JSONB,
  aggregation TEXT DEFAULT 'sum',
  data_type TEXT DEFAULT 'number',
  synonyms TEXT[],
  example_questions TEXT[],
  priority INTEGER DEFAULT 3,
  is_from_profile BOOLEAN DEFAULT false,
  matched_goal TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_metric_definitions_project_id ON metric_definitions(project_id);
CREATE INDEX IF NOT EXISTS idx_metric_definitions_category ON metric_definitions(project_id, category);
CREATE INDEX IF NOT EXISTS idx_metric_definitions_active ON metric_definitions(project_id, is_active);

-- Enable RLS
ALTER TABLE metric_definitions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Project members can access their project's metric definitions
CREATE POLICY "metric_definitions_project_member" ON metric_definitions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = metric_definitions.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.status = 'active'
    )
  );

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS metric_definitions_updated_at ON metric_definitions;
CREATE TRIGGER metric_definitions_updated_at
  BEFORE UPDATE ON metric_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE metric_definitions IS 'Project-specific metric definitions for semantic layer';
COMMENT ON COLUMN metric_definitions.name IS 'Unique metric identifier within project';
COMMENT ON COLUMN metric_definitions.display_name IS 'Human-readable metric name';
COMMENT ON COLUMN metric_definitions.category IS 'Category: acquisition, engagement, retention, conversion, revenue';
COMMENT ON COLUMN metric_definitions.source_type IS 'Data source: ga4, csv, calculated, bigquery';
COMMENT ON COLUMN metric_definitions.formula IS 'Calculation formula for calculated metrics';
COMMENT ON COLUMN metric_definitions.dependencies IS 'Array of metric names this metric depends on';
COMMENT ON COLUMN metric_definitions.synonyms IS 'Alternative names/keywords for this metric';
COMMENT ON COLUMN metric_definitions.priority IS 'Display priority: 1 (highest) to 5 (lowest)';
COMMENT ON COLUMN metric_definitions.is_from_profile IS 'True if auto-generated from project profile';
COMMENT ON COLUMN metric_definitions.matched_goal IS 'Project goal this metric was matched to';
