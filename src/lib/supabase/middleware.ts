import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

// 인증이 필요 없는 공개 경로
const publicPaths = ['/', '/demo', '/login', '/callback', '/callback/error', '/api/ga4/oauth/callback']

// 인증 필요하지만 특정 상태 체크 불필요한 경로
const authOnlyPaths = ['/dashboard', '/projects/new']

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Middleware] Supabase environment variables are missing')
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // 공개 경로는 통과
  if (publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return supabaseResponse
  }

  // API 라우트는 별도 처리 (각 API에서 인증 확인)
  if (pathname.startsWith('/api/')) {
    return supabaseResponse
  }

  // 인증 안 됐으면 로그인으로 (세션 만료 포함)
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    // 세션이 만료된 경우 표시 (이전에 인증된 사용자가 있었던 경우)
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/projects')) {
      url.searchParams.set('session_expired', 'true')
    }
    return NextResponse.redirect(url)
  }

  // Check access level for protected routes (dashboard, projects)
  if (pathname.startsWith('/dashboard') || pathname === '/projects/new') {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('access_level')
      .eq('user_id', user.id)
      .single()

    const accessLevel = (profile as { access_level?: string } | null)?.access_level || 'pending'
    if (accessLevel !== 'approved') {
      // Block project creation, redirect to dashboard
      if (pathname === '/projects/new') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        url.searchParams.set('access_required', 'true')
        return NextResponse.redirect(url)
      }
    }
  }

  // /projects/[pid]/* 경로에서 RBAC + 상태 가드 체크
  const projectMatch = pathname.match(/^\/projects\/([^/]+)/)
  if (projectMatch) {
    const projectId = projectMatch[1]
    
    // 프로젝트 멤버십 + 상태 확인
    const { data: project } = await supabase
      .from('projects')
      .select('*, project_members!inner(role, status)')
      .eq('id', projectId)
      .eq('project_members.user_id', user.id)
      .eq('project_members.status', 'active')
      .single()

    if (!project) {
      // 멤버가 아니면 대시보드로
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    const role = (project.project_members as unknown as { role: string }[])[0]?.role
    const setupStatus = project.setup_status

    // viewer는 setup/refresh 접근 불가
    if (role === 'viewer' && (pathname.includes('/setup') || pathname.includes('/refresh'))) {
      return NextResponse.redirect(new URL(`/projects/${projectId}`, request.url))
    }

    // workspace 관련 경로 체크
    if (pathname.includes('/workspaces')) {
      // CSV 데이터가 있으면 ready 상태가 될 수 있으므로, 
      // ga4_ready 또는 ready 상태이거나 CSV 데이터가 있으면 허용
      // 실제로는 ready 상태만 체크하면 됨 (CSV 데이터가 있으면 ready 상태가 됨)
      if (setupStatus !== 'ga4_ready' && setupStatus !== 'ready') {
        // 프로젝트에 CSV 데이터가 있는지 확인
        const { data: csvDatasets } = await supabase
          .from('csv_datasets')
          .select('id')
          .eq('project_id', projectId)
          .in('status', ['confirmed', 'ingested'])
          .limit(1)
        
        // CSV 데이터가 없으면 데이터 소스 설정 페이지로 리다이렉트
        if (!csvDatasets || csvDatasets.length === 0) {
          return NextResponse.redirect(new URL(`/projects/${projectId}/setup/sources`, request.url))
        }
      }

      // workspace 상세 페이지 (/workspaces/[wid]/*)
      const workspaceMatch = pathname.match(/\/workspaces\/([^/]+)/)
      if (workspaceMatch && workspaceMatch[1] !== 'new') {
        const workspaceId = workspaceMatch[1]
        
        // workspace 존재 및 상태 확인
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('status')
          .eq('id', workspaceId)
          .eq('project_id', projectId)
          .single()

        if (!workspace) {
          return NextResponse.redirect(new URL(`/projects/${projectId}/workspaces`, request.url))
        }

        // agent/report/chat 접근 시 project가 ready여야 함
        if ((pathname.includes('/agent') || pathname.includes('/report') || pathname.includes('/chat')) && setupStatus !== 'ready') {
          return NextResponse.redirect(new URL(`/projects/${projectId}/setup/refresh`, request.url))
        }

        // workspace가 draft면 설정 페이지로
        if (workspace.status === 'draft' && pathname.includes('/agent')) {
          return NextResponse.redirect(new URL(`/projects/${projectId}/workspaces/${workspaceId}`, request.url))
        }
      }
    }
  }

  return supabaseResponse
}
