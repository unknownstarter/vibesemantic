import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, requireProjectMember, canEdit } from '@/lib/supabase/auth-helpers'
import type { Json } from '@/types/database'

type RouteParams = { params: Promise<{ projectId: string; datasetId: string }> }

// POST: Confirm mapping for dataset
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { projectId, datasetId } = await params

  const auth = await requireAuth()
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const membership = await requireProjectMember(projectId)
  if (membership.error) {
    return NextResponse.json({ error: membership.error }, { status: 403 })
  }

  if (!canEdit(membership.role)) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const updateOnly = body._updateOnly === true

  const supabase = createServiceClient()

  // Get dataset with mapping
  const { data: dataset, error: datasetError } = await supabase
    .from('csv_datasets')
    .select(`
      id,
      status,
      mapping_id,
      source_mappings(*)
    `)
    .eq('id', datasetId)
    .eq('project_id', projectId)
    .single()

  if (datasetError || !dataset) {
    return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
  }

  if (!dataset.mapping_id) {
    return NextResponse.json({ error: 'No mapping found. Run probe first.' }, { status: 400 })
  }

  // Update mapping if user provided adjustments
  if (body.dateColumn !== undefined || body.metricColumns || body.dimensionColumns) {
    const updateData: Record<string, unknown> = {}
    
    if (body.dateColumn !== undefined) {
      updateData.date_column = body.dateColumn
    }
    if (body.metricColumns) {
      updateData.metric_columns = body.metricColumns as Json
    }
    if (body.dimensionColumns) {
      updateData.dimension_columns = body.dimensionColumns as Json
    }
    if (body.aggregationRules) {
      updateData.aggregation_rules = body.aggregationRules as Json
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateMappingError } = await supabase
        .from('source_mappings')
        .update(updateData)
        .eq('id', dataset.mapping_id)
        
      if (updateMappingError) {
        return NextResponse.json({ error: updateMappingError.message }, { status: 500 })
      }
    }
  }

  // If updateOnly mode, return without confirming
  if (updateOnly) {
    return NextResponse.json({
      success: true,
      message: 'Mapping updated (not confirmed)',
    })
  }

  // Confirm the mapping
  const { error: mappingError } = await supabase
    .from('source_mappings')
    .update({ status: 'confirmed' })
    .eq('id', dataset.mapping_id)

  if (mappingError) {
    return NextResponse.json({ error: mappingError.message }, { status: 500 })
  }

  // Update dataset status
  const { data: updatedDataset, error: updateError } = await supabase
    .from('csv_datasets')
    .update({ status: 'confirmed' })
    .eq('id', datasetId)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Create audit log
  await supabase.from('audit_logs').insert({
    action: 'confirm_csv_mapping',
    user_id: auth.user!.id,
    project_id: projectId,
    data_accessed: ['csv_datasets', 'source_mappings'],
    llm_payload_summary: { dataset_id: datasetId, mapping_id: dataset.mapping_id } as Json,
  })

  return NextResponse.json({
    dataset: updatedDataset,
    message: 'Mapping confirmed successfully',
  })
}
