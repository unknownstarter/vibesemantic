-- Add purpose column to csv_datasets table
-- Purpose indicates the analysis context (product, marketing, biz, sales)
-- This allows the same CSV data to be interpreted differently based on the user's intent

ALTER TABLE public.csv_datasets 
ADD COLUMN IF NOT EXISTS purpose workspace_purpose DEFAULT 'product';

-- Add comment
COMMENT ON COLUMN public.csv_datasets.purpose IS 
'Analysis purpose for this dataset. Determines which metrics are prioritized during schema detection. Same data can have different purposes for different use cases.';

-- Create index for filtering by purpose
CREATE INDEX IF NOT EXISTS idx_csv_datasets_purpose ON public.csv_datasets(purpose);
