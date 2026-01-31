"""
Semantic graph 조회 (Epic 3.3).
Tool 노드/load_context에서 Mart Summary와 함께 사용.
metric_definitions 기반 노드·엣지를 조회해 Explainer에 메타데이터로 전달.
"""

from typing import Any, Dict, List, Optional, Tuple


def fetch_semantic_graph(
    supabase,
    project_id: str,
) -> Tuple[Optional[Dict[str, Any]], List[str]]:
    """
    project_id에 해당하는 semantic_nodes, semantic_edges 조회.
    반환: (semantic_graph_dict, data_accessed_list)
    - semantic_graph_dict: { "nodes": [...], "edges": [...] } 또는 None
    - data_accessed_list: ["semantic_nodes", "semantic_edges"] 등
    """
    data_accessed: List[str] = []
    try:
        nodes_result = supabase.table("semantic_nodes") \
            .select("id, type, payload, metric_definition_id") \
            .eq("project_id", project_id) \
            .order("type") \
            .execute()
        nodes = nodes_result.data or []
        if not nodes:
            return None, data_accessed
        data_accessed.append("semantic_nodes")

        node_ids = [n["id"] for n in nodes]
        edges_result = supabase.table("semantic_edges") \
            .select("from_id, to_id, relation_type, payload") \
            .in_("from_id", node_ids) \
            .execute()
        edges = edges_result.data or []
        data_accessed.append("semantic_edges")

        graph = {
            "nodes": [
                {
                    "id": n["id"],
                    "type": n.get("type"),
                    "payload": n.get("payload") or {},
                    "metric_definition_id": n.get("metric_definition_id"),
                }
                for n in nodes
            ],
            "edges": [
                {
                    "from_id": e["from_id"],
                    "to_id": e["to_id"],
                    "relation_type": e.get("relation_type"),
                    "payload": e.get("payload") or {},
                }
                for e in edges
            ],
        }
        return graph, data_accessed
    except Exception:
        return None, data_accessed
