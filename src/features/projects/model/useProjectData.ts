import { useState, useEffect } from 'react'
import type { Project, MemberRole, Workspace } from '@/types/database'

export interface ProjectData {
  project: Project
  role: MemberRole
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

interface UseProjectDataResult {
  data: ProjectData | null
  workspaces: Workspace[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useProjectData(projectId: string): UseProjectDataResult {
  const [data, setData] = useState<ProjectData | null>(null)
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; name: string; purpose: string; status: string; created_at: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [projectRes, workspacesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/workspaces`),
      ])

      if (!projectRes.ok) {
        throw new Error(`프로젝트를 불러올 수 없습니다: ${projectRes.statusText}`)
      }

      if (!workspacesRes.ok) {
        throw new Error(`워크스페이스 목록을 불러올 수 없습니다: ${workspacesRes.statusText}`)
      }

      const [projectData, workspacesData] = await Promise.all([
        projectRes.json(),
        workspacesRes.json(),
      ])

      setData(projectData)
      setWorkspaces(workspacesData.workspaces || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다'
      setError(errorMessage)
      console.error('Failed to fetch project data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      fetchData()
    }
  }, [projectId])

  return {
    data,
    workspaces,
    loading,
    error,
    refetch: fetchData,
  }
}
