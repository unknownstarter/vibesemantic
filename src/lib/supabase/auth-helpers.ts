import { createClient } from './server'
import type { MemberRole, Project, Workspace } from '@/types/database'

export interface AuthContext {
  userId: string
  projectId?: string
  workspaceId?: string
  role?: MemberRole
  project?: Project
  workspace?: Workspace
}

// API Route에서 인증 + 권한 체크
export async function getAuthContext(
  projectId?: string,
  workspaceId?: string
): Promise<{ context: AuthContext | null; error: string | null }> {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { context: null, error: 'Unauthorized' }
  }

  const context: AuthContext = { userId: user.id }

  // Project 권한 체크
  if (projectId) {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, project_members!inner(role, status)')
      .eq('id', projectId)
      .eq('project_members.user_id', user.id)
      .eq('project_members.status', 'active')
      .single()

    if (projectError || !project) {
      return { context: null, error: 'Project not found or access denied' }
    }

    const member = (project.project_members as unknown as { role: MemberRole; status: string }[])[0]
    context.projectId = projectId
    context.role = member.role
    context.project = {
      ...project,
      project_members: undefined
    } as Project
  }

  // Workspace 권한 체크 (project 권한 필수)
  if (workspaceId) {
    if (!projectId) {
      return { context: null, error: 'Project ID required for workspace access' }
    }

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .eq('project_id', projectId)
      .single()

    if (workspaceError || !workspace) {
      return { context: null, error: 'Workspace not found' }
    }

    context.workspaceId = workspaceId
    context.workspace = workspace
  }

  return { context, error: null }
}

// 편집 권한 체크 (owner만)
export function canEdit(role?: MemberRole | null): boolean {
  return role === 'owner'
}

// 소유자 권한 체크
export function isOwner(role?: MemberRole): boolean {
  return role === 'owner'
}

// 인증 필수 체크 (API Route용)
export async function requireAuth(): Promise<{ 
  user: { id: string; email?: string } | null
  error: string | null 
}> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return { user: null, error: 'Unauthorized' }
  }
  
  return { user: { id: user.id, email: user.email }, error: null }
}

// 프로젝트 멤버십 체크 (API Route용)
export async function requireProjectMember(projectId: string): Promise<{
  role: MemberRole | null
  error: string | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { role: null, error: 'Unauthorized' }
  }

  const { data: membership, error } = await supabase
    .from('project_members')
    .select('role, status')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (error || !membership) {
    return { role: null, error: 'Not a project member' }
  }

  return { role: membership.role, error: null }
}
