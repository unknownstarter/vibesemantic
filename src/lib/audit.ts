import { createClient } from './supabase/server'
import type { Json } from '@/types/database'

export interface AuditLogParams {
  userId: string
  projectId?: string
  workspaceId?: string
  action: string
  dataAccessed?: string[]
  llmPayloadSummary?: Record<string, unknown>
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const supabase = await createClient()
    
    await supabase.from('audit_logs').insert({
      user_id: params.userId,
      project_id: params.projectId,
      workspace_id: params.workspaceId,
      action: params.action,
      data_accessed: params.dataAccessed || [],
      llm_payload_summary: (params.llmPayloadSummary || {}) as Json,
    })
  } catch (error) {
    // Audit log 실패가 메인 로직을 막지 않도록
    console.error('Failed to create audit log:', error)
  }
}

// 자주 사용하는 액션 상수
export const AuditActions = {
  // Project
  PROJECT_CREATE: 'project.create',
  PROJECT_UPDATE: 'project.update',
  PROJECT_DELETE: 'project.delete',
  PROJECT_PROFILE_UPDATE: 'project.profile.update',
  
  // GA4
  GA4_CONNECT: 'ga4.connect',
  GA4_PROPERTY_SELECT: 'ga4.property.select',
  GA4_REFRESH: 'ga4.refresh',
  
  // Workspace
  WORKSPACE_CREATE: 'workspace.create',
  WORKSPACE_UPDATE: 'workspace.update',
  
  // Agent
  AGENT_REPORT_GENERATE: 'agent.report.generate',
  AGENT_CHAT_MESSAGE: 'agent.chat.message',
  AGENT_QUICK_REPLY: 'agent.quick_reply',
} as const
