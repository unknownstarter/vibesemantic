-- Add metric_definition_id to semantic_nodes for 1:1 link and upsert key (Epic 3.2)
ALTER TABLE semantic_nodes
  ADD COLUMN IF NOT EXISTS metric_definition_id UUID REFERENCES metric_definitions(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_semantic_nodes_project_metric_def
  ON semantic_nodes(project_id, metric_definition_id)
  WHERE metric_definition_id IS NOT NULL;

COMMENT ON COLUMN semantic_nodes.metric_definition_id IS 'Links to metric_definitions.id for type=metric; enables upsert sync.';
