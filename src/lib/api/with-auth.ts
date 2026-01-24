/**
 * API Route Authentication Wrapper
 * Reduces boilerplate in API routes by handling auth checks uniformly
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireProjectMember, canEdit } from '@/lib/supabase/auth-helpers'
import type { MemberRole } from '@/types/database'

export interface AuthenticatedContext {
  userId: string
  email?: string
}

export interface ProjectContext extends AuthenticatedContext {
  projectId: string
  role: MemberRole
}

export type AuthenticatedHandler<T = unknown> = (
  request: NextRequest,
  context: AuthenticatedContext & T
) => Promise<NextResponse>

export type ProjectHandler<T = unknown> = (
  request: NextRequest,
  context: ProjectContext & T
) => Promise<NextResponse>

/**
 * Standard API error response
 */
export function apiError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Standard API success response
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

/**
 * Wrap handler with authentication check
 */
export function withAuth<T = unknown>(
  handler: AuthenticatedHandler<T>
) {
  return async (request: NextRequest, extra: T): Promise<NextResponse> => {
    const auth = await requireAuth()
    if (auth.error || !auth.user) {
      return apiError(auth.error || 'Unauthorized', 401)
    }

    return handler(request, {
      userId: auth.user.id,
      email: auth.user.email,
      ...extra,
    } as AuthenticatedContext & T)
  }
}

/**
 * Wrap handler with project membership check
 */
export function withProjectAuth<T extends { params: Promise<{ projectId: string }> }>(
  handler: ProjectHandler<Omit<T, 'params'> & { params: { projectId: string } }>,
  options?: { requireOwner?: boolean }
) {
  return async (request: NextRequest, extra: T): Promise<NextResponse> => {
    const { projectId, ...restParams } = await extra.params

    const auth = await requireAuth()
    if (auth.error || !auth.user) {
      return apiError(auth.error || 'Unauthorized', 401)
    }

    const membership = await requireProjectMember(projectId)
    if (membership.error || !membership.role) {
      return apiError(membership.error || 'Not a project member', 403)
    }

    if (options?.requireOwner && !canEdit(membership.role)) {
      return apiError('Permission denied', 403)
    }

    return handler(request, {
      userId: auth.user.id,
      email: auth.user.email,
      projectId,
      role: membership.role,
      params: { projectId, ...restParams },
    } as ProjectContext & Omit<T, 'params'> & { params: { projectId: string } })
  }
}

// Re-export for convenience
export { canEdit } from '@/lib/supabase/auth-helpers'
export type { MemberRole } from '@/types/database'
