-- Migration: Add CHECK constraints for metric_definitions enum fields
-- Description: Enforce data integrity at database level for enum types

-- Add CHECK constraint for category
ALTER TABLE metric_definitions
  ADD CONSTRAINT metric_definitions_category_check
  CHECK (category IS NULL OR category IN ('acquisition', 'engagement', 'retention', 'conversion', 'revenue'));

-- Add CHECK constraint for source_type
ALTER TABLE metric_definitions
  ADD CONSTRAINT metric_definitions_source_type_check
  CHECK (source_type IN ('ga4', 'csv', 'calculated', 'bigquery'));

-- Add CHECK constraint for aggregation
ALTER TABLE metric_definitions
  ADD CONSTRAINT metric_definitions_aggregation_check
  CHECK (aggregation IN ('sum', 'avg', 'count', 'min', 'max', 'ratio'));

-- Add CHECK constraint for data_type
ALTER TABLE metric_definitions
  ADD CONSTRAINT metric_definitions_data_type_check
  CHECK (data_type IN ('number', 'percentage', 'currency', 'duration'));

-- Update comment for source_type to include bigquery
COMMENT ON COLUMN metric_definitions.source_type IS 'Data source: ga4, csv, calculated, bigquery';
