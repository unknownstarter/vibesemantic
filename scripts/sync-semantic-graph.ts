/**
 * Backfill: metric_definitions → semantic_nodes / semantic_edges 동기화 (Epic 3.2)
 * 기존 프로젝트의 metric_definitions를 그래프로 이전.
 *
 * 사용법:
 *   npx tsx scripts/sync-semantic-graph.ts [--dry-run]
 * 환경변수: .env.local 로드 권장 (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 */

import { createServiceClient } from '../src/lib/supabase/server'
import { syncMetricDefinitionsToGraph } from '../src/lib/semantic/sync-graph'

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')
  console.log('Sync semantic graph (metric_definitions → nodes/edges)')
  if (dryRun) {
    console.log('[dry-run] No changes will be made.')
    const client = createServiceClient()
    const { data: projects } = await client
      .from('metric_definitions')
      .select('project_id')
      .eq('is_active', true)
    const ids = [...new Set((projects ?? []).map(p => p.project_id))]
    console.log(`[dry-run] Would sync ${ids.length} project(s): ${ids.slice(0, 5).join(', ')}${ids.length > 5 ? '...' : ''}`)
    return
  }

  const client = createServiceClient()
  const { data: rows } = await client
    .from('metric_definitions')
    .select('project_id')
    .eq('is_active', true)
  const projectIds = [...new Set((rows ?? []).map(r => r.project_id))]
  console.log(`Found ${projectIds.length} project(s) with active metric definitions.`)

  let totalNodes = 0
  let totalEdges = 0
  for (const projectId of projectIds) {
    try {
      const { nodesUpserted, edgesCreated } = await syncMetricDefinitionsToGraph(projectId, client)
      totalNodes += nodesUpserted
      totalEdges += edgesCreated
      if (nodesUpserted > 0 || edgesCreated > 0) {
        console.log(`  ${projectId}: ${nodesUpserted} nodes, ${edgesCreated} edges`)
      }
    } catch (e) {
      console.error(`  ${projectId}:`, e)
    }
  }
  console.log(`Done. Total: ${totalNodes} nodes upserted, ${totalEdges} edges created.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
