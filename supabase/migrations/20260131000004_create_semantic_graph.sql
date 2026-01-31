-- Migration: Create Semantic Graph (Epic 3.1)
-- Description: Nodes (metric/dimension/source) and edges (depends/relates) for extensible Semantic Layer.

-- Node type: metric | dimension | source
CREATE TYPE semantic_node_type AS ENUM ('metric', 'dimension', 'source');

-- Edge relation: depends_on (metric A depends on metric B), relates_to (metric-dimension), from_source (metric from ga4/csv)
CREATE TYPE semantic_relation_type AS ENUM ('depends_on', 'relates_to', 'from_source');

-- semantic_nodes: one row per metric, dimension, or source in the graph
CREATE TABLE IF NOT EXISTS semantic_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type semantic_node_type NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_semantic_nodes_project_type
  ON semantic_nodes(project_id, type);
CREATE INDEX IF NOT EXISTS idx_semantic_nodes_payload
  ON semantic_nodes USING GIN(payload jsonb_path_ops);

ALTER TABLE semantic_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "semantic_nodes_project_member" ON semantic_nodes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = semantic_nodes.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.status = 'active'
    )
  );

COMMENT ON TABLE semantic_nodes IS 'Semantic graph nodes: metric, dimension, source. payload holds name, display_name, source_type, etc.';
COMMENT ON COLUMN semantic_nodes.type IS 'metric | dimension | source';
COMMENT ON COLUMN semantic_nodes.payload IS 'e.g. { name, display_name, source_type, source_table, metric_definition_id }';

-- semantic_edges: directed edges between nodes
CREATE TABLE IF NOT EXISTS semantic_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id UUID NOT NULL REFERENCES semantic_nodes(id) ON DELETE CASCADE,
  to_id UUID NOT NULL REFERENCES semantic_nodes(id) ON DELETE CASCADE,
  relation_type semantic_relation_type NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_id, to_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_semantic_edges_from
  ON semantic_edges(from_id);
CREATE INDEX IF NOT EXISTS idx_semantic_edges_to
  ON semantic_edges(to_id);
CREATE INDEX IF NOT EXISTS idx_semantic_edges_relation
  ON semantic_edges(from_id, relation_type);

ALTER TABLE semantic_edges ENABLE ROW LEVEL SECURITY;

-- Edges visible if both endpoints belong to a project the user can access
CREATE POLICY "semantic_edges_via_nodes" ON semantic_edges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM semantic_nodes n
      WHERE n.id = semantic_edges.from_id
        AND EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = n.project_id
            AND pm.user_id = auth.uid()
            AND pm.status = 'active'
        )
    )
  );

COMMENT ON TABLE semantic_edges IS 'Semantic graph edges: depends_on, relates_to, from_source.';
COMMENT ON COLUMN semantic_edges.relation_type IS 'depends_on (metric→metric) | relates_to (metric↔dimension) | from_source (metric→source)';

DROP TRIGGER IF EXISTS semantic_nodes_updated_at ON semantic_nodes;
CREATE TRIGGER semantic_nodes_updated_at
  BEFORE UPDATE ON semantic_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
