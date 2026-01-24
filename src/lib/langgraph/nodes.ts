import { createClient } from '@/lib/supabase/server'
import type { AnalysisState, MartSummary, AnalystQuestion } from './types'
import type { Json } from '@/types/database'

// Node 0: Guard and Route
export async function guardAndRoute(state: AnalysisState): Promise<Partial<AnalysisState>> {
  const supabase = await createClient()

  // RBAC 체크
  const { data: membership } = await supabase
    .from('project_members')
    .select('role, status')
    .eq('project_id', state.projectId)
    .eq('user_id', state.userId)
    .single()

  if (!membership || membership.status !== 'active') {
    return { error: 'Access denied: Not a project member' }
  }

  // Project 상태 체크 - GA4 또는 CSV 중 하나라도 ready면 OK
  const { data: project } = await supabase
    .from('projects')
    .select('setup_status')
    .eq('id', state.projectId)
    .single()

  // CSV 데이터셋이 ingested 상태인지 확인
  const { data: csvDatasets } = await supabase
    .from('csv_datasets')
    .select('status')
    .eq('project_id', state.projectId)
    .in('status', ['confirmed', 'ingested'])

  const hasGA4Ready = project?.setup_status === 'ready' || project?.setup_status === 'ga4_ready'
  const hasCsvReady = csvDatasets && csvDatasets.length > 0

  if (!hasGA4Ready && !hasCsvReady) {
    return { error: 'Project not ready: Connect GA4 or upload CSV data first' }
  }

  // Workspace 상태 체크
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('status')
    .eq('id', state.workspaceId)
    .single()

  if (!workspace) {
    return { error: 'Workspace not found' }
  }

  return {} // 통과
}

// Node 1: Load Context and Mart Summary
export async function loadContextAndMartSummary(
  state: AnalysisState
): Promise<Partial<AnalysisState>> {
  const supabase = await createClient()
  const dataAccessed: string[] = []

  // 날짜 범위 계산
  const endDate = new Date()
  const days = state.range === '7d' ? 7 : 30
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - days)

  const startStr = startDate.toISOString().split('T')[0]
  const endStr = endDate.toISOString().split('T')[0]

  // 1. GA4 Metrics 조회 (새로운 유연한 테이블 - 우선 사용)
  const { data: ga4Metrics } = await supabase
    .from('mart_ga4_metrics')
    .select('*')
    .eq('project_id', state.projectId)
    .gte('date', startStr)
    .lte('date', endStr)
    .order('date')
  
  dataAccessed.push('mart_ga4_metrics')

  // 2. Legacy: Daily KPIs 조회 (fallback용)
  const { data: kpis } = await supabase
    .from('mart_ga4_daily_kpis')
    .select('*')
    .eq('project_id', state.projectId)
    .gte('date', startStr)
    .lte('date', endStr)
    .order('date')
  
  dataAccessed.push('mart_ga4_daily_kpis')

  // 3. Legacy: Channel Daily 조회 (fallback용)
  const { data: channels } = await supabase
    .from('mart_ga4_channel_daily')
    .select('*')
    .eq('project_id', state.projectId)
    .gte('date', startStr)
    .lte('date', endStr)
  
  dataAccessed.push('mart_ga4_channel_daily')

  // 4. Legacy: Top Pages 조회 (GA4)
  const { data: pages } = await supabase
    .from('mart_ga4_top_pages_daily')
    .select('*')
    .eq('project_id', state.projectId)
    .gte('date', startStr)
    .lte('date', endStr)
    .order('screen_page_views', { ascending: false })
    .limit(20)
  
  dataAccessed.push('mart_ga4_top_pages_daily')

  // 4. CSV Metrics 조회 (새로 추가)
  const { data: csvMetrics } = await supabase
    .from('mart_csv_daily_metrics')
    .select('*')
    .eq('project_id', state.projectId)
    .gte('date', startStr)
    .lte('date', endStr)
    .order('date')

  dataAccessed.push('mart_csv_daily_metrics')

  // ============ GA4 METRICS 집계 (새 유연한 테이블 우선) ============
  
  // 새 테이블에서 KPI 집계 (전체 지표: dimensions = {})
  const ga4GlobalMetrics = ga4Metrics?.filter(m => 
    !m.dimensions || Object.keys(m.dimensions || {}).length === 0
  ) || []
  
  // 지표별 집계 헬퍼
  const sumMetric = (metricName: string) => 
    ga4GlobalMetrics
      .filter(m => m.metric_name === metricName)
      .reduce((sum, m) => sum + (Number(m.metric_value) || 0), 0)
  
  const avgMetric = (metricName: string) => {
    const values = ga4GlobalMetrics.filter(m => m.metric_name === metricName)
    if (values.length === 0) return 0
    return values.reduce((sum, m) => sum + (Number(m.metric_value) || 0), 0) / values.length
  }

  // 새 테이블 우선, 없으면 legacy 사용
  const useNewTable = ga4GlobalMetrics.length > 0
  
  const totalSessions = useNewTable 
    ? sumMetric('sessions')
    : kpis?.reduce((sum, k) => sum + (k.sessions || 0), 0) || 0
  const totalActiveUsers = useNewTable
    ? sumMetric('active_users')
    : kpis?.reduce((sum, k) => sum + (k.active_users || 0), 0) || 0
  const totalNewUsers = useNewTable
    ? sumMetric('new_users')
    : kpis?.reduce((sum, k) => sum + (k.new_users || 0), 0) || 0
  const avgEngagementRate = useNewTable
    ? avgMetric('engagement_rate')
    : (kpis && kpis.length > 0
      ? kpis.reduce((sum, k) => sum + (Number(k.engagement_rate) || 0), 0) / kpis.length
      : 0)
  const avgBounceRate = useNewTable
    ? avgMetric('bounce_rate')
    : (kpis && kpis.length > 0
      ? kpis.reduce((sum, k) => sum + (Number(k.bounce_rate) || 0), 0) / kpis.length
      : 0)
  const avgSessionDuration = useNewTable
    ? avgMetric('avg_session_duration')
    : (kpis && kpis.length > 0
      ? kpis.reduce((sum, k) => sum + (Number(k.avg_session_duration) || 0), 0) / kpis.length
      : 0)

  // 채널별 집계 (새 테이블에서 dimensions.channel_group 사용)
  const channelMap = new Map<string, { sessions: number; users: number }>()
  
  // 새 테이블의 채널별 데이터
  const ga4ChannelMetrics = ga4Metrics?.filter(m => 
    m.dimensions && (m.dimensions as Record<string, string>)['channel_group']
  ) || []
  
  if (ga4ChannelMetrics.length > 0) {
    // 새 테이블 사용
    ga4ChannelMetrics.forEach(m => {
      const channelGroup = (m.dimensions as Record<string, string>)['channel_group']
      if (!channelGroup) return
      
      const existing = channelMap.get(channelGroup) || { sessions: 0, users: 0 }
      if (m.metric_name === 'sessions') {
        existing.sessions += Number(m.metric_value) || 0
      } else if (m.metric_name === 'active_users') {
        existing.users += Number(m.metric_value) || 0
      }
      channelMap.set(channelGroup, existing)
    })
  } else {
    // Legacy 테이블 사용
    channels?.forEach(c => {
      const existing = channelMap.get(c.channel_group) || { sessions: 0, users: 0 }
      channelMap.set(c.channel_group, {
        sessions: existing.sessions + (c.sessions || 0),
        users: existing.users + (c.active_users || 0),
      })
    })
  }
  
  const topChannels = Array.from(channelMap.entries())
    .map(([name, data]) => ({
      name,
      sessions: data.sessions,
      users: data.users,
      percentage: totalSessions > 0 ? (data.sessions / totalSessions) * 100 : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 5)

  // 페이지별 집계 (중복 제거)
  const pageMap = new Map<string, { 
    title: string | null
    views: number
    engagementRate: number
    count: number 
  }>()
  pages?.forEach(p => {
    const existing = pageMap.get(p.page_path)
    if (existing) {
      existing.views += p.screen_page_views || 0
      existing.engagementRate += Number(p.engagement_rate) || 0
      existing.count++
    } else {
      pageMap.set(p.page_path, {
        title: p.page_title,
        views: p.screen_page_views || 0,
        engagementRate: Number(p.engagement_rate) || 0,
        count: 1,
      })
    }
  })

  const topPages = Array.from(pageMap.entries())
    .map(([path, data]) => ({
      path,
      title: data.title,
      views: data.views,
      engagementRate: data.engagementRate / data.count,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)

  // 일별 트렌드
  const dailyTrend = kpis?.map(k => ({
    date: k.date,
    sessions: k.sessions || 0,
    users: k.active_users || 0,
  })) || []

  // CSV Metrics 집계
  const csvMetricsSummary: Record<string, {
    total: number
    byDimension: Record<string, Record<string, number>>
    trend: Array<{ date: string; value: number }>
  }> = {}

  if (csvMetrics && csvMetrics.length > 0) {
    csvMetrics.forEach(m => {
      if (!csvMetricsSummary[m.metric_name]) {
        csvMetricsSummary[m.metric_name] = {
          total: 0,
          byDimension: {},
          trend: [],
        }
      }
      
      const metric = csvMetricsSummary[m.metric_name]
      const value = m.metric_value || 0
      metric.total += value

      // By dimension
      if (m.dimension_key && m.dimension_value) {
        if (!metric.byDimension[m.dimension_key]) {
          metric.byDimension[m.dimension_key] = {}
        }
        const dimValue = metric.byDimension[m.dimension_key][m.dimension_value] || 0
        metric.byDimension[m.dimension_key][m.dimension_value] = dimValue + value
      }

      // Trend (aggregate by date)
      const existingTrend = metric.trend.find(t => t.date === m.date)
      if (existingTrend) {
        existingTrend.value += value
      } else {
        metric.trend.push({ date: m.date, value })
      }
    })

    // Sort trends by date
    Object.values(csvMetricsSummary).forEach(m => {
      m.trend.sort((a, b) => a.date.localeCompare(b.date))
    })
  }

  // 5. GA4 + CSV 통합 트렌드 (date 기준 join)
  // 두 데이터 소스가 모두 있을 때 date 기준으로 통합
  let integratedTrend: Array<{
    date: string
    ga4Sessions?: number
    ga4Users?: number
    csvMetrics?: Record<string, number>
  }> | undefined = undefined

  const hasGA4Data = kpis && kpis.length > 0
  const hasCsvData = csvMetrics && csvMetrics.length > 0

  if (hasGA4Data && hasCsvData) {
    // 모든 날짜를 수집
    const allDates = new Set<string>()
    kpis.forEach(k => allDates.add(k.date))
    csvMetrics.forEach(m => allDates.add(m.date))

    // 날짜별로 통합
    integratedTrend = Array.from(allDates).sort().map(date => {
      const ga4Day = kpis.find(k => k.date === date)
      const csvDay = csvMetrics.filter(m => m.date === date)
      
      const csvMetricsForDay: Record<string, number> = {}
      csvDay.forEach(m => {
        csvMetricsForDay[m.metric_name] = (csvMetricsForDay[m.metric_name] || 0) + (m.metric_value || 0)
      })

      return {
        date,
        ga4Sessions: ga4Day?.sessions || undefined,
        ga4Users: ga4Day?.active_users || undefined,
        csvMetrics: Object.keys(csvMetricsForDay).length > 0 ? csvMetricsForDay : undefined,
      }
    })
  }

  // 6. 데이터 소스 요약 정보
  const dataSources = {
    ga4: hasGA4Data ? {
      available: true,
      dateRange: kpis && kpis.length > 0 
        ? { start: kpis[0].date, end: kpis[kpis.length - 1].date }
        : null,
      recordCount: kpis?.length || 0,
    } : { available: false },
    csv: hasCsvData ? {
      available: true,
      metrics: Object.keys(csvMetricsSummary),
      recordCount: csvMetrics?.length || 0,
    } : { available: false },
    integrated: !!(hasGA4Data && hasCsvData),
  }

  const martSummary: MartSummary = {
    period: {
      start: startStr,
      end: endStr,
      days,
    },
    kpis: {
      totalSessions,
      totalActiveUsers,
      totalNewUsers,
      avgEngagementRate: Math.round(avgEngagementRate * 10000) / 100, // percentage
      avgBounceRate: Math.round(avgBounceRate * 10000) / 100,
      avgSessionDuration: Math.round(avgSessionDuration),
    },
    topChannels,
    topPages,
    dailyTrend,
    // CSV 데이터 추가
    csvMetrics: Object.keys(csvMetricsSummary).length > 0 ? csvMetricsSummary : undefined,
    // 통합 트렌드 (GA4 + CSV)
    integratedTrend,
    // 데이터 소스 정보
    dataSources,
  }

  return { martSummary, dataAccessed }
}

// Node 2 결과물 파싱: Analyst Questions 추출 및 마크다운에서 제거
export function parseAnalystQuestions(markdown: string): AnalystQuestion[] {
  // Analyst Questions 섹션 찾기 (여러 포맷 지원)
  const questionsMatch = markdown.match(/#{1,4}\s*Analyst Questions[\s\S]*?(?=#{1,4}\s+[A-Z]|$)/i)
  if (!questionsMatch) return getDefaultQuestions()

  const section = questionsMatch[0]
  const questions: AnalystQuestion[] = []

  // 방법 1: 번호 매긴 질문 찾기 (1. 질문내용?)
  const numberedPattern = /\d+\.\s*\*?\*?([^\n*]+\?)\*?\*?/g
  let match
  let idx = 0

  while ((match = numberedPattern.exec(section)) !== null && idx < 3) {
    const questionText = match[1].trim()
      .replace(/^\*+|\*+$/g, '') // 볼드 마크다운 제거
      .trim()
    
    if (questionText.length > 10 && questionText.includes('?')) {
      questions.push({
        id: `q${idx + 1}`,
        question: questionText,
        context: extractContext(section, questionText),
        quickReplies: generateQuickReplies(questionText),
      })
      idx++
    }
  }

  // 방법 2: 번호 없이 질문만 있는 경우 (- 로 시작하는 질문)
  if (questions.length === 0) {
    const bulletPattern = /[-•]\s*([^\n]+\?)/g
    while ((match = bulletPattern.exec(section)) !== null && idx < 3) {
      const questionText = match[1].trim()
        .replace(/^\*+|\*+$/g, '')
        .trim()
      
      // "Quick Reply" 같은 메타 텍스트 제외
      if (questionText.length > 10 && 
          questionText.includes('?') && 
          !questionText.toLowerCase().includes('quick reply') &&
          !questionText.toLowerCase().includes('next_params')) {
        questions.push({
          id: `q${idx + 1}`,
          question: questionText,
          context: '분석 결과 기반',
          quickReplies: generateQuickReplies(questionText),
        })
        idx++
      }
    }
  }

  return questions.length > 0 ? questions : getDefaultQuestions()
}

// 질문의 컨텍스트 추출
function extractContext(section: string, question: string): string {
  // 질문 앞에 있는 컨텍스트 찾기
  const idx = section.indexOf(question)
  if (idx > 0) {
    const before = section.substring(Math.max(0, idx - 200), idx)
    const contextMatch = before.match(/context[:\s]*([^\n]+)/i)
    if (contextMatch) return contextMatch[1].trim()
  }
  return '분석 결과 기반'
}

// 리포트 마크다운에서 Analyst Questions 섹션 제거 (UI에서 별도 렌더링하므로)
export function removeAnalystQuestionsSection(markdown: string): string {
  // Analyst Questions 섹션 제거 (다음 헤더 전까지)
  return markdown
    .replace(/#{1,4}\s*Analyst Questions[\s\S]*?(?=#{1,4}\s+[A-Z]|$)/gi, '')
    .trim()
}

function generateQuickReplies(question: string): AnalystQuestion['quickReplies'] {
  const replies: AnalystQuestion['quickReplies'] = []

  // 질문 내용에 따라 적절한 quick replies 생성
  if (question.includes('채널') || question.includes('channel')) {
    replies.push(
      { label: '채널별 상세 분석', nextParams: { focus: 'channel' } },
      { label: '지난 30일 비교', nextParams: { range: '30d', focus: 'channel' } }
    )
  } else if (question.includes('페이지') || question.includes('page')) {
    replies.push(
      { label: '페이지 성과 분석', nextParams: { focus: 'page' } },
      { label: '참여도 낮은 페이지', nextParams: { focus: 'page', segment: 'low_engagement' } }
    )
  } else if (question.includes('추세') || question.includes('trend')) {
    replies.push(
      { label: '7일 추세', nextParams: { range: '7d', focus: 'trend' } },
      { label: '30일 추세', nextParams: { range: '30d', focus: 'trend' } }
    )
  }

  // 기본 replies 추가
  if (replies.length < 2) {
    replies.push(
      { label: '자세히 분석', nextParams: { range: '7d' } },
      { label: '30일 데이터로 확인', nextParams: { range: '30d' } }
    )
  }

  return replies.slice(0, 4)
}

function getDefaultQuestions(): AnalystQuestion[] {
  return [
    {
      id: 'q1',
      question: '가장 효율적인 유입 채널의 전환율을 높이려면 어떤 전략이 필요할까요?',
      context: '채널별 세션 분포 분석 기반',
      quickReplies: [
        { label: '채널별 상세 분석', nextParams: { focus: 'channel' } },
        { label: '30일 데이터 비교', nextParams: { range: '30d' } },
      ],
    },
    {
      id: 'q2',
      question: '참여도가 낮은 페이지들의 개선 우선순위를 어떻게 정해야 할까요?',
      context: '페이지별 참여율 분석 기반',
      quickReplies: [
        { label: '페이지 상세 분석', nextParams: { focus: 'page' } },
        { label: '낮은 참여도 페이지', nextParams: { focus: 'page', segment: 'low_engagement' } },
      ],
    },
  ]
}

// Node 3: Persist and Audit (분리된 함수로)
export async function persistResults(
  state: AnalysisState,
  analysisMarkdown: string,
  analystQuestions: AnalystQuestion[],
  martSummary?: MartSummary
): Promise<void> {
  const supabase = await createClient()

  // Chat message 저장 (user message가 있으면)
  if (state.userMessage) {
    await supabase.from('chat_messages').insert({
      workspace_id: state.workspaceId,
      thread_id: state.threadId,
      role: 'user',
      content: state.userMessage,
    })
  }

  // Assistant message 저장
  await supabase.from('chat_messages').insert({
    workspace_id: state.workspaceId,
    thread_id: state.threadId,
    role: 'assistant' as const,
    content: analysisMarkdown,
    metadata: { questions: JSON.parse(JSON.stringify(analystQuestions)) } as Json,
  })

  // Report 모드면 reports 테이블에도 저장 (차트용 martSummary 포함)
  if (state.mode === 'report') {
    await supabase.from('reports').insert({
      workspace_id: state.workspaceId,
      range: state.range,
      report_markdown: analysisMarkdown,
      metadata: { 
        questions: JSON.parse(JSON.stringify(analystQuestions)),
        martSummary: martSummary ? JSON.parse(JSON.stringify(martSummary)) : undefined,
      } as Json,
    })
  }

  // Analysis thread 업데이트
  await supabase
    .from('analysis_threads')
    .upsert({
      workspace_id: state.workspaceId,
      thread_id: state.threadId,
      last_range: state.range,
      last_snapshot_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id,thread_id' })

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: state.userId,
    project_id: state.projectId,
    workspace_id: state.workspaceId,
    action: state.mode === 'report' ? 'agent.report.generate' : 'agent.chat.message',
    data_accessed: state.dataAccessed,
    llm_payload_summary: {
      mode: state.mode,
      range: state.range,
      questionsCount: analystQuestions.length,
      responseLength: analysisMarkdown.length,
    },
  })
}
