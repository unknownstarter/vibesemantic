import type {
  MemberRole,
  ProjectProfile,
  WorkspacePurpose,
  AgentConfig,
  ReportRange,
  MetricDefinition,
} from '@/types/database'

export type { WorkspacePurpose, ProjectProfile, ReportRange, MetricDefinition } from '@/types/database'

// Graph State
export interface AnalysisState {
  // Context
  userId: string
  projectId: string
  workspaceId: string
  role: MemberRole
  language: 'ko' | 'en'
  
  // Project/Workspace info
  projectProfile: ProjectProfile
  workspacePurpose: WorkspacePurpose
  agentConfig: AgentConfig
  
  // Input
  mode: 'report' | 'chat'
  range: ReportRange
  userMessage?: string
  threadId: string
  
  // Mart Summary (LLM에 전달할 최소 데이터)
  martSummary?: MartSummary
  
  // Output
  analysisMarkdown?: string
  analystQuestions?: AnalystQuestion[]
  
  // Internal
  dataAccessed: string[]
  error?: string
}

// LLM에 전달할 Mart 요약
export interface MartSummary {
  period: {
    start: string
    end: string
    days: number
  }
  kpis: {
    totalSessions: number
    totalActiveUsers: number
    totalNewUsers: number
    avgEngagementRate: number
    avgBounceRate: number
    avgSessionDuration: number
    // 변화율 (7d vs 이전 7d)
    sessionsTrend?: number
    usersTrend?: number
  }
  topChannels: Array<{
    name: string
    sessions: number
    users: number
    percentage: number
  }>
  topPages: Array<{
    path: string
    title: string | null
    views: number
    engagementRate: number
  }>
  dailyTrend: Array<{
    date: string
    sessions: number
    users: number
  }>
  // CSV 데이터 (추가)
  csvMetrics?: Record<string, {
    total: number
    byDimension: Record<string, Record<string, number>>
    trend: Array<{ date: string; value: number }>
  }>
  // GA4 + CSV 통합 트렌드 (date 기준 join)
  integratedTrend?: Array<{
    date: string
    ga4Sessions?: number
    ga4Users?: number
    csvMetrics?: Record<string, number>
  }>
  // 데이터 소스 정보
  dataSources?: {
    ga4: { available: boolean; dateRange?: { start: string; end: string } | null; recordCount?: number }
    csv: { available: boolean; metrics?: string[]; recordCount?: number }
    integrated: boolean
  }
  // Semantic Layer: 프로젝트별 메트릭 정의
  metricDefinitions?: MetricDefinition[]
}

// 분석가 질문 (Quick Reply 포함)
export interface AnalystQuestion {
  id: string
  question: string
  context: string // 어떤 컨텍스트에서 나온 질문인지
  quickReplies: QuickReply[]
}

export interface QuickReply {
  label: string
  nextParams: {
    range?: ReportRange
    focus?: 'channel' | 'page' | 'trend' | 'conversion'
    segment?: string
  }
}

// 노드별 반환 타입
export interface GuardResult {
  allowed: boolean
  error?: string
}

export interface ContextLoadResult {
  martSummary: MartSummary
  dataAccessed: string[]
}

export interface LLMGenerateResult {
  analysisMarkdown: string
  analystQuestions: AnalystQuestion[]
}
