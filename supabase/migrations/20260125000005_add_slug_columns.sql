-- Add slug columns to projects and workspaces tables
-- Slugs provide human-readable URLs instead of exposing UUIDs

-- Add slug column to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add slug column to workspaces
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create function to generate slug from name
CREATE OR REPLACE FUNCTION generate_slug(name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
BEGIN
  -- Convert to lowercase, replace spaces/special chars with hyphens
  base_slug := lower(regexp_replace(name, '[^a-zA-Z0-9가-힣]+', '-', 'g'));
  -- Remove leading/trailing hyphens
  base_slug := trim(both '-' from base_slug);
  -- Limit length
  base_slug := left(base_slug, 50);
  RETURN base_slug;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Backfill existing projects with slugs (name-based + short id suffix for uniqueness)
UPDATE public.projects
SET slug = generate_slug(name) || '-' || left(id::text, 8)
WHERE slug IS NULL;

-- Backfill existing workspaces with slugs
UPDATE public.workspaces
SET slug = generate_slug(name) || '-' || left(id::text, 8)
WHERE slug IS NULL;

-- Make slug NOT NULL after backfill
ALTER TABLE public.projects ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.workspaces ALTER COLUMN slug SET NOT NULL;

-- Add unique constraints
ALTER TABLE public.projects ADD CONSTRAINT projects_slug_unique UNIQUE (slug);
ALTER TABLE public.workspaces ADD CONSTRAINT workspaces_project_slug_unique UNIQUE (project_id, slug);

-- Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON public.workspaces(project_id, slug);

-- Trigger function to auto-generate slug on insert
CREATE OR REPLACE FUNCTION set_project_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.name) || '-' || left(NEW.id::text, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_workspace_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.name) || '-' || left(NEW.id::text, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_set_project_slug ON public.projects;
CREATE TRIGGER trigger_set_project_slug
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION set_project_slug();

DROP TRIGGER IF EXISTS trigger_set_workspace_slug ON public.workspaces;
CREATE TRIGGER trigger_set_workspace_slug
  BEFORE INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION set_workspace_slug();
