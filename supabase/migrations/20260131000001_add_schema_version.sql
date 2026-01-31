-- Migration: Add schema_version to source_mappings and ga4_event_schemas
-- Description: Immutable version after Human Confirm. Staging/Mart refer to this version.
-- Policy: After Confirm, schema_version is not updated; schema changes require a new version or new mapping.

-- source_mappings: schema version (set at Confirm, immutable thereafter)
ALTER TABLE source_mappings
  ADD COLUMN IF NOT EXISTS schema_version INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN source_mappings.schema_version IS
  'Immutable after Human Confirm. Used by Staging/Mart. Do not update; use new mapping for schema changes.';

-- ga4_event_schemas: schema version (set when property/events confirmed, immutable thereafter)
ALTER TABLE ga4_event_schemas
  ADD COLUMN IF NOT EXISTS schema_version INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN ga4_event_schemas.schema_version IS
  'Immutable after Confirm. Used by Staging/Mart. Do not update; use new version for schema changes.';

-- Index for lookups by project + version (optional, for future Staging/Mart queries)
CREATE INDEX IF NOT EXISTS idx_source_mappings_project_version
  ON source_mappings(project_id, schema_version);

CREATE INDEX IF NOT EXISTS idx_ga4_event_schemas_project_version
  ON ga4_event_schemas(project_id, property_id, schema_version);
