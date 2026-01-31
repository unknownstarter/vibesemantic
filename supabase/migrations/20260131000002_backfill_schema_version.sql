-- Migration: Backfill schema_version for existing rows
-- Description: Set schema_version = 1 for any existing rows where it is NULL.
-- Ensures all read paths can assume schema_version is set (Task 1.5).

-- source_mappings: backfill NULL to 1
UPDATE source_mappings
SET schema_version = 1
WHERE schema_version IS NULL;

-- ga4_event_schemas: backfill NULL to 1
UPDATE ga4_event_schemas
SET schema_version = 1
WHERE schema_version IS NULL;
