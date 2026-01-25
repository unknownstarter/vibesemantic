import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, requireProjectMember, canEdit } from '@/lib/supabase/auth-helpers'
import { ingestDataset, SourceMapping } from '@/lib/csv/ingest'
import type { Json, MetricColumn } from '@/types/database'

type RouteParams = { params: Promise<{ projectId: string; datasetId: string }> }

// POST: Ingest dataset files into mart table
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { projectId: projectSlugOrId, datasetId } = await params

  const auth = await requireAuth()
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const membership = await requireProjectMember(projectSlugOrId)
  if (membership.error || !membership.projectId) {
    return NextResponse.json({ error: membership.error }, { status: 403 })
  }

  const projectId = membership.projectId

  if (!canEdit(membership.role)) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
  }

  // Parse query params for date range
  const url = new URL(request.url)
  const range = url.searchParams.get('range') || '30d'

  const supabase = createServiceClient()

  // Get dataset with confirmed mapping
  const { data: dataset, error: datasetError } = await supabase
    .from('csv_datasets')
    .select(`
      id,
      status,
      mapping_id,
      source_mappings(
        id,
        status,
        date_column,
        metric_columns,
        dimension_columns,
        aggregation_rules
      )
    `)
    .eq('id', datasetId)
    .eq('project_id', projectId)
    .single()

  if (datasetError || !dataset) {
    return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
  }

  if (dataset.status !== 'confirmed' && dataset.status !== 'ingested') {
    return NextResponse.json({ 
      error: 'Dataset must be confirmed before ingesting' 
    }, { status: 400 })
  }

  const mappingData = dataset.source_mappings as unknown
  if (!mappingData || (mappingData as { status?: string })?.status !== 'confirmed') {
    return NextResponse.json({ 
      error: 'Mapping must be confirmed before ingesting' 
    }, { status: 400 })
  }

  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()
  if (range === '7d') {
    startDate.setDate(startDate.getDate() - 7)
  } else if (range === '30d') {
    startDate.setDate(startDate.getDate() - 30)
  } else if (range === '90d') {
    startDate.setDate(startDate.getDate() - 90)
  }

  // Build mapping object
  const mapping: SourceMapping = {
    id: (mappingData as { id: string }).id,
    date_column: (mappingData as { date_column: string | null }).date_column,
    metric_columns: (mappingData as { metric_columns: MetricColumn[] }).metric_columns || [],
    dimension_columns: (mappingData as { dimension_columns: Array<{ name: string; displayName?: string; type: string }> }).dimension_columns || [],
    aggregation_rules: (mappingData as { aggregation_rules: Record<string, string> }).aggregation_rules || {},
  }

  try {
    // Run ingestion
    const result = await ingestDataset(
      supabase,
      projectId,
      datasetId,
      mapping,
      { startDate, endDate }
    )

    // Update dataset status
    const newStatus = result.errors.length === 0 ? 'ingested' : 
                      result.insertedRecords > 0 ? 'ingested' : 'error'

    await supabase
      .from('csv_datasets')
      .update({ status: newStatus })
      .eq('id', datasetId)

    // Update project status and data_refreshed_at
    if (result.insertedRecords > 0) {
      const { data: project } = await supabase
        .from('projects')
        .select('setup_status')
        .eq('id', projectId)
        .single()

      const updateData: Record<string, unknown> = {
        data_refreshed_at: new Date().toISOString(),
      }
      
      const wasNotReady = project && project.setup_status !== 'ready'
      if (wasNotReady) {
        updateData.setup_status = 'ready'
      }

      await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId)

      // 연동 완료 시 (ready 상태가 된 경우) 첫 워크스페이스에 대해 자동 리포트 생성 (백그라운드)
      if (wasNotReady) {
        // 첫 번째 ready 워크스페이스에 대해 리포트 생성
        const { data: firstWorkspace } = await supabase
          .from('workspaces')
          .select('id')
          .eq('project_id', projectId)
          .eq('status', 'ready')
          .order('created_at', { ascending: true })
          .limit(1)
          .single()

        if (firstWorkspace) {
          // 백그라운드에서 리포트 생성 (비동기, 에러 무시)
          import('@/lib/api/workspaces').then(({ generateInitialReport }) => {
            generateInitialReport({
              projectId,
              workspaceId: firstWorkspace.id,
              userId: auth.user!.id,
              range: '7d',
            }).catch((err) => {
              console.error('[Ingest] Failed to generate initial report:', err)
            })
          }).catch(() => {
            // Import 실패는 무시
          })
        }
      }
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      action: 'ingest_csv_dataset',
      user_id: auth.user!.id,
      project_id: projectId,
      data_accessed: ['csv_datasets', 'csv_files', 'mart_csv_daily_metrics'],
      llm_payload_summary: {
        dataset_id: datasetId,
        total_rows: result.totalRows,
        processed_rows: result.processedRows,
        inserted_records: result.insertedRecords,
        error_count: result.errors.length,
      } as Json,
    })

    return NextResponse.json({
      result,
      status: newStatus,
    })
  } catch (error) {
    console.error('Ingest error:', error)

    await supabase
      .from('csv_datasets')
      .update({ status: 'error' })
      .eq('id', datasetId)

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Ingest failed',
    }, { status: 500 })
  }
}
