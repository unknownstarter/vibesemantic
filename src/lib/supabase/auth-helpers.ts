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

// Check if a string is a UUID
export function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Resolve project slug or ID to project data
export async function resolveProject(
  slugOrId: string,
  userId: string
): Promise<{ project: Project | null; role: MemberRole | null; error: string | null }> {
  const supabase = await createClient()

  // Determine if it's a UUID or slug
  const isId = isUUID(slugOrId)

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*, project_members!inner(role, status)')
    .eq(isId ? 'id' : 'slug', slugOrId)
    .eq('project_members.user_id', userId)
    .eq('project_members.status', 'active')
    .single()

  if (projectError || !project) {
    console.error('[resolveProject] Failed to resolve project:', {
      slugOrId,
      isId,
      userId,
      error: projectError,
      hasProject: !!project,
    })
    return { project: null, role: null, error: 'Project not found or access denied' }
  }

  const member = (project.project_members as unknown as { role: MemberRole; status: string }[])[0]
  if (!member) {
    console.error('[resolveProject] No member found:', { slugOrId, userId })
    return { project: null, role: null, error: 'Project member not found' }
  }

  const projectData = {
    ...project,
    project_members: undefined
  } as Project

  return { project: projectData, role: member.role, error: null }
}

// Resolve workspace slug or ID to workspace data
export async function resolveWorkspace(
  slugOrId: string,
  projectId: string
): Promise<{ workspace: Workspace | null; error: string | null }> {
  const supabase = await createClient()

  // Determine if it's a UUID or slug
  const isId = isUUID(slugOrId)

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('*')
    .eq(isId ? 'id' : 'slug', slugOrId)
    .eq('project_id', projectId)
    .single()

  if (workspaceError || !workspace) {
    return { workspace: null, error: 'Workspace not found' }
  }

  return { workspace, error: null }
}

// API Route에서 인증 + 권한 체크 (supports both slug and UUID)
export async function getAuthContext(
  projectSlugOrId?: string,
  workspaceSlugOrId?: string
): Promise<{ context: AuthContext | null; error: string | null }> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { context: null, error: 'Unauthorized' }
  }

  const context: AuthContext = { userId: user.id }

  // Project 권한 체크 (supports slug or UUID)
  if (projectSlugOrId) {
    const { project, role, error } = await resolveProject(projectSlugOrId, user.id)

    if (error || !project) {
      return { context: null, error: error || 'Project not found or access denied' }
    }

    context.projectId = project.id
    context.role = role!
    context.project = project
  }

  // Workspace 권한 체크 (supports slug or UUID)
  if (workspaceSlugOrId) {
    if (!context.projectId) {
      return { context: null, error: 'Project ID required for workspace access' }
    }

    const { workspace, error } = await resolveWorkspace(workspaceSlugOrId, context.projectId)

    if (error || !workspace) {
      return { context: null, error: error || 'Workspace not found' }
    }

    context.workspaceId = workspace.id
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

// 프로젝트 멤버십 체크 (API Route용, supports slug or UUID)
export async function requireProjectMember(projectSlugOrId: string): Promise<{
  role: MemberRole | null
  projectId: string | null
  error: string | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { role: null, projectId: null, error: 'Unauthorized' }
  }

  // Resolve project by slug or ID
  const { project, role, error } = await resolveProject(projectSlugOrId, user.id)

  if (error || !project) {
    return { role: null, projectId: null, error: error || 'Not a project member' }
  }

  return { role: role!, projectId: project.id, error: null }
}
