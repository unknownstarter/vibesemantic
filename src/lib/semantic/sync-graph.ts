/**
 * metric_definitions → semantic_nodes / semantic_edges 동기화 (Epic 3.2)
 * 저장/수정 시 그래프에 반영. 백필은 스크립트 또는 API로 호출.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type SemanticNodeType = Database['public']['Enums']['semantic_node_type']
type SemanticRelationType = Database['public']['Enums']['semantic_relation_type']

export async function syncMetricDefinitionsToGraph(
  projectId: string,
  supabase?: SupabaseClient<Database>
): Promise<{ nodesUpserted: number; edgesCreated: number }> {
  const { createClient } = await import('@/lib/supabase/server')
  const client = supabase ?? await createClient()

  const { data: definitions, error: defError } = await client
    .from('metric_definitions')
    .select('id, name, display_name, source_type, source_table, aggregation, dependencies')
    .eq('project_id', projectId)
    .eq('is_active', true)

  if (defError || !definitions?.length) {
    return { nodesUpserted: 0, edgesCreated: 0 }
  }

  const { data: existingNodes } = await client
    .from('semantic_nodes')
    .select('id, type, metric_definition_id, payload')
    .eq('project_id', projectId)
    .in('type', ['metric', 'source'])

  const sourceNodes = (existingNodes ?? []).filter(n => n.type === 'source') as Array<{
    id: string
    payload: { source_type?: string }
  }>
  const sourceByType = new Map<string, string>()
  for (const n of sourceNodes) {
    const st = n.payload?.source_type as string | undefined
    if (st) sourceByType.set(st, n.id)
  }

  const sourceTypes = ['ga4', 'csv', 'calculated'] as const
  for (const st of sourceTypes) {
    if (sourceByType.has(st)) continue
    const { data: inserted } = await client
      .from('semantic_nodes')
      .insert({
        project_id: projectId,
        type: 'source' as SemanticNodeType,
        payload: { source_type: st },
      })
      .select('id')
      .single()
    if (inserted?.id) sourceByType.set(st, inserted.id)
  }

  const metricPayloads = definitions.map(d => ({
    project_id: projectId,
    type: 'metric' as SemanticNodeType,
    metric_definition_id: d.id,
    payload: {
      name: d.name,
      display_name: d.display_name,
      source_type: d.source_type,
      source_table: d.source_table ?? null,
      aggregation: d.aggregation ?? null,
    },
  }))

  const { data: upsertedMetrics, error: upsertErr } = await client
    .from('semantic_nodes')
    .upsert(metricPayloads, {
      onConflict: 'project_id,metric_definition_id',
      ignoreDuplicates: false,
    })
    .select('id, metric_definition_id, payload')

  if (upsertErr) {
    console.error('[sync-graph] Upsert metric nodes failed:', upsertErr)
    return { nodesUpserted: 0, edgesCreated: 0 }
  }

  const metricNodes = (upsertedMetrics ?? []) as Array<{
    id: string
    metric_definition_id: string | null
    payload: { name?: string }
  }>
  const metricIdByDefId = new Map<string, string>()
  const metricIdByName = new Map<string, string>()
  for (const n of metricNodes) {
    if (n.metric_definition_id) metricIdByDefId.set(n.metric_definition_id, n.id)
    if (n.payload?.name) metricIdByName.set(n.payload.name, n.id)
  }

  const metricNodeIds = metricNodes.map(n => n.id)
  if (metricNodeIds.length > 0) {
    await client
      .from('semantic_edges')
      .delete()
      .in('from_id', metricNodeIds)
  }

  type EdgeRow = Database['public']['Tables']['semantic_edges']['Insert']
  const edgesToInsert: EdgeRow[] = []

  for (const d of definitions) {
    const fromId = metricIdByDefId.get(d.id)
    if (!fromId) continue

    const sourceId = sourceByType.get(d.source_type)
    if (sourceId) {
      edgesToInsert.push({
        from_id: fromId,
        to_id: sourceId,
        relation_type: 'from_source',
      } as EdgeRow)
    }

    const deps = d.dependencies as string[] | null
    if (Array.isArray(deps)) {
      for (const depName of deps) {
        const toId = metricIdByName.get(depName)
        if (toId && toId !== fromId) {
          edgesToInsert.push({
            from_id: fromId,
            to_id: toId,
            relation_type: 'depends_on',
          } as EdgeRow)
        }
      }
    }
  }

  if (edgesToInsert.length > 0) {
    await client.from('semantic_edges').insert(edgesToInsert)
  }

  return {
    nodesUpserted: metricNodes.length,
    edgesCreated: edgesToInsert.length,
  }
}
