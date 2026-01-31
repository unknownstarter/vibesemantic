import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createAuditLog, AuditActions } from '@/lib/audit'
import type { ProjectProfile, MemberRole, Json } from '@/types/database'
import { generateMetricDefinitions } from '@/lib/semantic/metric-definitions'

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
        slug,
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
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user access level
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('access_level')
      .eq('user_id', user.id)
      .single()

    const accessLevel = (userProfile as { access_level?: string } | null)?.access_level || 'pending'
    if (accessLevel !== 'approved') {
      return NextResponse.json(
        { error: 'ACCESS_REQUIRED', message: '프로젝트 생성 권한이 필요합니다. 관리자에게 권한을 요청해주세요.' },
        { status: 403 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('[Projects POST] Failed to parse request body:', parseError)
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

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
      console.error('[Projects POST] Database error:', error)
      return NextResponse.json({ error: error.message || 'Failed to create project' }, { status: 500 })
    }

    if (!project) {
      console.error('[Projects POST] No project returned from insert')
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
    }

    // Audit log
    try {
      await createAuditLog({
        userId: user.id,
        projectId: project.id,
        action: AuditActions.PROJECT_CREATE,
      })
    } catch (auditError) {
      // Non-blocking: log error but don't fail the request
      console.error('[Projects POST] Failed to create audit log:', auditError)
    }

    // Auto-generate metric definitions if profile is provided and semantic layer is enabled
    if (profile && Object.keys(profile).length > 0) {
      try {
        // Check if semantic layer is enabled (default: false, but generate anyway for new projects)
        // For new projects, we'll generate definitions if profile has industry or goals
        const shouldGenerate = profile.industry || (profile.goals && profile.goals.length > 0)
        
        if (shouldGenerate) {
          // Generate metric definitions asynchronously (don't block response)
          generateMetricDefinitions(project.id, profile).catch(error => {
            console.error('[Projects] Failed to auto-generate metric definitions:', error)
            // Non-blocking: log error but don't fail the request
          })
        }
      } catch (error) {
        // Non-blocking: log error but don't fail the request
        console.error('[Projects] Error generating metric definitions:', error)
      }
    }

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error('[Projects POST] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
