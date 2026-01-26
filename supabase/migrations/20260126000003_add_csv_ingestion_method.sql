-- Migration: Add ingestion_method column to csv_files table
-- Description: Track which ingestion method was used (typescript or pandas) for monitoring and debugging

-- Add ingestion_method column
ALTER TABLE csv_files
  ADD COLUMN IF NOT EXISTS ingestion_method TEXT DEFAULT 'typescript';

-- Add comment
COMMENT ON COLUMN csv_files.ingestion_method IS 
  'CSV ingestion method used: typescript (default) or pandas. Used for monitoring and debugging.';

-- Create index for monitoring queries
CREATE INDEX IF NOT EXISTS idx_csv_files_ingestion_method 
  ON csv_files(ingestion_method, created_at DESC);
