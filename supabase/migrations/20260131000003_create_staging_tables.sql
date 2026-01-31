-- Migration: Create Staging layer tables (Epic 2.1)
-- Description: Source → Staging → Mart. Staging holds raw/normalized payloads by schema_version for replay and recovery.

-- staging_csv_raw: one row per CSV source row, before deterministic transform to Mart
CREATE TABLE IF NOT EXISTS staging_csv_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES csv_datasets(id) ON DELETE CASCADE,
  mapping_id UUID NOT NULL REFERENCES source_mappings(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staging_csv_raw_project_schema_created
  ON staging_csv_raw(project_id, schema_version, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staging_csv_raw_dataset_created
  ON staging_csv_raw(dataset_id, created_at DESC);

ALTER TABLE staging_csv_raw ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staging_csv_raw_project_member" ON staging_csv_raw
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = staging_csv_raw.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.status = 'active'
    )
  );

COMMENT ON TABLE staging_csv_raw IS 'Staging: raw CSV rows by schema_version before Mart transform. Retention: 30 days (see DATA_PIPELINE_DOCUMENTATION).';
COMMENT ON COLUMN staging_csv_raw.schema_version IS 'Immutable schema version from source_mappings at load time.';
COMMENT ON COLUMN staging_csv_raw.payload IS 'Single CSV row as key-value (column name -> value).';

-- staging_ga4_raw: raw GA4 API response or normalized rows per report type, by schema_version
CREATE TABLE IF NOT EXISTS staging_ga4_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL DEFAULT 1,
  report_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staging_ga4_raw_project_schema_created
  ON staging_ga4_raw(project_id, schema_version, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staging_ga4_raw_report_type
  ON staging_ga4_raw(project_id, report_type, created_at DESC);

ALTER TABLE staging_ga4_raw ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staging_ga4_raw_project_member" ON staging_ga4_raw
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = staging_ga4_raw.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.status = 'active'
    )
  );

COMMENT ON TABLE staging_ga4_raw IS 'Staging: raw GA4 report payloads by schema_version before Mart transform. Retention: 30 days.';
COMMENT ON COLUMN staging_ga4_raw.report_type IS 'e.g. daily_kpis, channel_daily, top_pages_daily, metrics.';
COMMENT ON COLUMN staging_ga4_raw.payload IS 'Raw API response or array of row objects.';
