/**
 * React Query hooks for data fetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Workspace, ReportRange, Json } from '@/types/database'
import type { MartSummary } from '@/lib/langgraph/types'

export interface ProjectData {
  project: {
    id: string
    name: string
    setup_status: string
    profile?: Json | null
  }
  role: string
  ga4: {
    connected: boolean
    email?: string
    property?: { property_id: string; property_name: string }
  }
  csv?: {
    datasets: Array<{ id: string; name: string; status: string }>
    ready: boolean
    ingested: boolean
  }
}

// Query Keys
export const queryKeys = {
  project: (projectId: string) => ['project', projectId] as const,
  projectWorkspaces: (projectId: string) => ['project', projectId, 'workspaces'] as const,
  workspace: (workspaceId: string) => ['workspace', workspaceId] as const,
  workspaceReport: (workspaceId: string, range: ReportRange) =>
    ['workspace', workspaceId, 'report', range] as const,
}

/**
 * 프로젝트 데이터 조회
 */
export function useProjectQuery(projectId: string) {
  return useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) {
        throw new Error(`프로젝트를 불러올 수 없습니다: ${res.statusText}`)
      }
      return res.json() as Promise<ProjectData>
    },
    enabled: !!projectId,
  })
}

/**
 * 워크스페이스 목록 조회
 */
export function useWorkspacesQuery(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectWorkspaces(projectId),
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/workspaces`)
      if (!res.ok) {
        throw new Error(`워크스페이스 목록을 불러올 수 없습니다: ${res.statusText}`)
      }
      const data = await res.json()
      return (data.workspaces || []) as Workspace[]
    },
    enabled: !!projectId,
  })
}

/**
 * 워크스페이스 상세 조회
 */
export function useWorkspaceQuery(workspaceId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.workspace(workspaceId),
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}`)
      if (!res.ok) {
        throw new Error(`워크스페이스를 불러올 수 없습니다: ${res.statusText}`)
      }
      const data = await res.json()
      return data.workspace as Workspace
    },
    enabled: enabled && !!workspaceId,
  })
}

/**
 * 캐시된 리포트 조회
 */
export function useWorkspaceReportQuery(workspaceId: string, range: ReportRange = '7d', enabled = true) {
  return useQuery({
    queryKey: queryKeys.workspaceReport(workspaceId, range),
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/report?range=${range}`)
      if (!res.ok) {
        return null // 리포트가 없으면 null 반환
      }
      const data = await res.json()
      return data.report as {
        report_markdown: string
        metadata: {
          questions?: unknown[]
          martSummary?: unknown
        }
      } | null
    },
    enabled: enabled && !!workspaceId,
    staleTime: 2 * 60 * 1000, // 리포트는 2분간 fresh
  })
}

/**
 * 리포트 생성 Mutation
 */
export function useGenerateReportMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      workspaceId,
      range,
      threadId,
      language = 'ko',
    }: {
      workspaceId: string
      range: ReportRange
      threadId?: string
      language?: 'ko' | 'en'
    }) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'report',
          range,
          threadId: threadId || `thread_${Date.now()}`,
          language,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '리포트 생성에 실패했습니다')
      }

      return res.json() as Promise<{
        analysisMarkdown: string
        analystQuestions: unknown[]
        martSummary: MartSummary | null
        threadId: string
      }>
    },
    onSuccess: (data, variables) => {
      // 리포트 생성 성공 시 캐시 무효화하여 최신 데이터 조회
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceReport(variables.workspaceId, variables.range),
      })
    },
  })
}

/**
 * 채팅 메시지 전송 Mutation
 */
export function useSendChatMessageMutation() {
  return useMutation({
    mutationFn: async ({
      workspaceId,
      range,
      userMessage,
      threadId,
      language = 'ko',
    }: {
      workspaceId: string
      range: ReportRange
      userMessage: string
      threadId: string
      language?: 'ko' | 'en'
    }) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'chat',
          range,
          userMessage,
          threadId,
          language,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '메시지 전송에 실패했습니다')
      }

      return res.json() as Promise<{
        analysisMarkdown: string
        analystQuestions: unknown[]
        threadId: string
      }>
    },
  })
}
