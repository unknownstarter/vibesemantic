import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

// 인증이 필요 없는 공개 경로
const publicPaths = ['/', '/demo', '/login', '/callback', '/callback/error', '/api/ga4/oauth/callback']

// 인증 필요하지만 특정 상태 체크 불필요한 경로
const authOnlyPaths = ['/dashboard', '/projects/new']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // 인증 안 됐으면 로그인으로
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
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
      // ga4_ready 미만이면 workspace 생성/실행 불가
      if (setupStatus !== 'ga4_ready' && setupStatus !== 'ready') {
        return NextResponse.redirect(new URL(`/projects/${projectId}/setup/profile`, request.url))
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
