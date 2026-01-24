import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createAuditLog, AuditActions } from '@/lib/audit'
import type { ProjectProfile, MemberRole, Json } from '@/types/database'

// GET: 사용자가 접근 가능한 프로젝트 목록
export async function GET() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Service client로 조회 (RLS 우회하여 멤버십 기반 조회)
  const serviceClient = createServiceClient()
  
  const { data: memberships, error } = await serviceClient
    .from('project_members')
    .select(`
      role,
      projects (
        id,
        name,
        profile,
        setup_status,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const projects = memberships?.map(m => ({
    ...m.projects,
    role: m.role as MemberRole,
  })) || []

  return NextResponse.json({ projects })
}

// POST: 새 프로젝트 생성
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, profile } = body as { name: string; profile?: ProjectProfile }

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Project name required' }, { status: 400 })
  }

  // Service client 사용 (RLS 우회 - 트리거가 정상 작동하도록)
  const serviceClient = createServiceClient()

  const { data: project, error } = await serviceClient
    .from('projects')
    .insert({
      name: name.trim(),
      created_by: user.id,
      profile: (profile || {}) as Json,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Audit log
  await createAuditLog({
    userId: user.id,
    projectId: project.id,
    action: AuditActions.PROJECT_CREATE,
  })

  return NextResponse.json({ project }, { status: 201 })
}
