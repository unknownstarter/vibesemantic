/**
 * React Query 기반 프로젝트 데이터 Hook
 * useProjectData의 React Query 버전
 */

import { useProjectQuery, useWorkspacesQuery } from '@/lib/react-query/queries'

export interface ProjectData {
  project: {
    id: string
    name: string
    setup_status: string
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

export function useProjectDataReactQuery(projectId: string) {
  const projectQuery = useProjectQuery(projectId)
  const workspacesQuery = useWorkspacesQuery(projectId)

  return {
    data: projectQuery.data || null,
    workspaces: workspacesQuery.data || [],
    loading: projectQuery.isLoading || workspacesQuery.isLoading,
    error: projectQuery.error?.message || workspacesQuery.error?.message || null,
    refetch: async () => {
      await Promise.all([projectQuery.refetch(), workspacesQuery.refetch()])
    },
  }
}
