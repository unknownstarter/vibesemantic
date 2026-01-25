import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireAuth, requireProjectMember, canEdit } from '@/lib/supabase/auth-helpers'

type RouteParams = { params: Promise<{ projectId: string; datasetId: string }> }

// GET: Get dataset detail
export async function GET(request: NextRequest, { params }: RouteParams) {
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

  const supabase = await createClient()

  const { data: dataset, error } = await supabase
    .from('csv_datasets')
    .select(`
      *,
      csv_files(
        id,
        original_filename,
        storage_path,
        file_size_bytes,
        row_count,
        column_count,
        headers,
        status,
        is_active,
        created_at
      ),
      source_mappings(
        id,
        status,
        date_column,
        metric_columns,
        dimension_columns,
        aggregation_rules,
        llm_questions
      )
    `)
    .eq('id', datasetId)
    .eq('project_id', projectId)
    .single()

  if (error) {
    return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
  }

  return NextResponse.json({ dataset })
}

// PATCH: Update dataset (name, status)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

  const body = await request.json()
  const updateData: Record<string, unknown> = {}

  if (body.name !== undefined) {
    updateData.name = body.name.trim()
  }
  if (body.status !== undefined) {
    updateData.status = body.status
  }
  if (body.mapping_id !== undefined) {
    updateData.mapping_id = body.mapping_id
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No update data provided' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: dataset, error } = await supabase
    .from('csv_datasets')
    .update(updateData)
    .eq('id', datasetId)
    .eq('project_id', projectId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ dataset })
}

// DELETE: Delete dataset and all its files
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

  const supabase = createServiceClient()

  // Get files to delete from storage
  const { data: files } = await supabase
    .from('csv_files')
    .select('storage_path')
    .eq('dataset_id', datasetId)

  // Delete files from storage
  if (files && files.length > 0) {
    const paths = files.map(f => f.storage_path)
    await supabase.storage.from('csv-uploads').remove(paths)
  }

  // Delete dataset (cascades to files and mart data)
  const { error } = await supabase
    .from('csv_datasets')
    .delete()
    .eq('id', datasetId)
    .eq('project_id', projectId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
