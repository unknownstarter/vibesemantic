import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext, canEdit, isOwner } from '@/lib/supabase/auth-helpers'
import { createAuditLog, AuditActions } from '@/lib/audit'
import type { ProjectProfile } from '@/types/database'
import { syncMetricDefinitionsWithProfile } from '@/lib/semantic/metric-definitions'
import { isSemanticLayerEnabled } from '@/lib/feature-flags'

type RouteParams = { params: Promise<{ projectId: string }> }

// GET: 프로젝트 상세 정보
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { projectId } = await params
  const { context, error } = await getAuthContext(projectId)

  if (error || !context || !context.projectId) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // GA4 연결 상태도 함께 조회
  const { data: ga4Connection } = await supabase
    .from('ga4_connections')
    .select('google_user_email')
    .eq('project_id', context.projectId)
    .single()

  const { data: selectedProperty } = await supabase
    .from('ga4_properties')
    .select('property_id, property_name')
    .eq('project_id', context.projectId)
    .eq('is_selected', true)
    .single()

  // CSV 데이터셋 상태 조회 (모든 상태 조회하되, ingested만 카운트)
  const { data: csvDatasets } = await supabase
    .from('csv_datasets')
    .select('id, name, status')
    .eq('project_id', context.projectId)

  const csvReady = csvDatasets?.some(d => 
    d.status === 'confirmed' || d.status === 'ingested'
  ) || false

  const csvIngested = csvDatasets?.some(d => d.status === 'ingested') || false

  return NextResponse.json({
    project: context.project,
    role: context.role,
    ga4: {
      connected: !!ga4Connection,
      email: ga4Connection?.google_user_email,
      property: selectedProperty,
    },
    csv: {
      datasets: csvDatasets || [],
      ready: csvReady,
      ingested: csvIngested,
    },
  })
}

// PATCH: 프로젝트 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  const { projectId } = await params
  const { context, error } = await getAuthContext(projectId)

  if (error || !context) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
  }

  if (!canEdit(context.role)) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
  }

  const body = await request.json()
  const { name, profile, setup_status } = body as {
    name?: string
    profile?: ProjectProfile
    setup_status?: string
  }

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name.trim()
  if (profile !== undefined) updateData.profile = profile
  if (setup_status !== undefined) updateData.setup_status = setup_status

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No update data provided' }, { status: 400 })
  }

  if (!context.projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }

  const supabase = await createClient()
  
  const { data: project, error: updateError } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', context.projectId)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Audit log
  await createAuditLog({
    userId: context.userId,
    projectId: context.projectId,
    action: profile ? AuditActions.PROJECT_PROFILE_UPDATE : AuditActions.PROJECT_UPDATE,
    llmPayloadSummary: { updatedFields: Object.keys(updateData) },
  })

  // Sync metric definitions if profile was updated
  if (profile) {
    try {
      const semanticLayerEnabled = await isSemanticLayerEnabled(context.projectId)
      if (semanticLayerEnabled) {
        // Sync metric definitions asynchronously (don't block response)
        syncMetricDefinitionsWithProfile(context.projectId, profile).catch(error => {
          console.error('[Projects] Failed to sync metric definitions:', error)
          // Non-blocking: log error but don't fail the request
        })
      }
    } catch (error) {
      // Non-blocking: log error but don't fail the request
      console.error('[Projects] Error syncing metric definitions:', error)
    }
  }

  return NextResponse.json({ project })
}

// DELETE: 프로젝트 삭제 (owner만)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const { projectId } = await params
  const { context, error } = await getAuthContext(projectId)

  if (error || !context) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
  }

  if (!isOwner(context.role)) {
    return NextResponse.json({ error: 'Only owner can delete project' }, { status: 403 })
  }

  if (!context.projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }

  const supabase = await createClient()
  
  const { error: deleteError } = await supabase
    .from('projects')
    .delete()
    .eq('id', context.projectId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Audit log
  await createAuditLog({
    userId: context.userId,
    projectId: context.projectId,
    action: AuditActions.PROJECT_DELETE,
  })

  return NextResponse.json({ success: true })
}
