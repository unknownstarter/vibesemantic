/**
 * CSV Schema Probe: Profiler (deterministic) + Schema Proposal (LLM, semantic only)
 *
 * - Profiler: code only (parser + data-pattern-analyzer, optional Pandas). No LLM.
 *   Output: dateColumn, metricColumns, dimensionColumns, aggregationRules.
 * - Schema Proposal: LLM receives Profiler output and suggests display names / llmQuestions only.
 *
 * One probe call = "Profiler result" + optional "Proposal result" (display names, questions).
 */

import { ChatOpenAI } from '@langchain/openai'
import { maskSensitiveData, getDetailedColumnAnalysis, type ColumnAnalysis } from './parser'
import type { MetricColumn, DimensionColumn, LLMQuestion, ProjectProfile, WorkspacePurpose } from '@/types/database'
import { getIndustryKPIs, matchGoalsToKPIs } from '@/lib/templates/industry-kpis'
import { analyzeDataPatterns } from './data-pattern-analyzer'

export interface ProbeResult {
  dateColumn: string | null
  metricColumns: MetricColumn[]
  dimensionColumns: DimensionColumn[]
  aggregationRules: Record<string, string>
  llmQuestions: LLMQuestion[]
}

/** Options for runCsvProfiler (deterministic, no LLM). */
export interface RunCsvProfilerOptions {
  language?: 'ko' | 'en'
  fileContent?: string
}

/**
 * Run CSV Profiler only: deterministic column classification from parser + data-pattern-analyzer
 * (and optional Pandas). No LLM. Returns dateColumn, metricColumns, dimensionColumns,
 * aggregationRules, and llmQuestions for uncertain columns (from pattern analysis only).
 */
export async function runCsvProfiler(
  headers: string[],
  rows: string[][],
  options: RunCsvProfilerOptions = {}
): Promise<ProbeResult> {
  const { language = 'ko', fileContent } = options

  let columnAnalysis: Record<string, ColumnAnalysis>
  if (fileContent && rows.length > 1000) {
    const pandasAnalysis = await getPandasColumnAnalysis(fileContent, rows.length)
    columnAnalysis = pandasAnalysis ?? getDetailedColumnAnalysis(headers, rows)
  } else {
    columnAnalysis = getDetailedColumnAnalysis(headers, rows)
  }

  const dataPatternAnalyses: Record<string, ReturnType<typeof analyzeDataPatterns>> = {}
  headers.forEach((header, colIndex) => {
    dataPatternAnalyses[header] = analyzeDataPatterns(header, colIndex, rows, columnAnalysis[header])
  })

  return buildProfilerResultFromAnalysis(
    headers,
    columnAnalysis,
    dataPatternAnalyses,
    language
  )
}

/**
 * Build ProbeResult from column analysis and data pattern analysis only (no LLM).
 * Used by runCsvProfiler and by probeSchema fallback.
 */
function buildProfilerResultFromAnalysis(
  headers: string[],
  columnAnalysis: Record<string, ColumnAnalysis>,
  dataPatternAnalyses: Record<string, ReturnType<typeof analyzeDataPatterns>>,
  language: 'ko' | 'en'
): ProbeResult {
  const dateColumn = headers.find((h) => columnAnalysis[h]?.type === 'date') ?? null

  const metricColumns: MetricColumn[] = []
  const dimensionColumns: DimensionColumn[] = []
  const uncertainColumns: string[] = []

  headers.forEach((header) => {
    if (header === dateColumn) return
    const analysis = columnAnalysis[header]
    const pattern = dataPatternAnalyses[header]
    if (!analysis) return

    if (pattern?.isEventName && !pattern.needsConfirmation) {
      dimensionColumns.push({ name: header, displayName: header, type: 'string' })
      return
    }
    if (
      pattern &&
      (pattern.isEventCount ||
        pattern.isUserCount ||
        pattern.isRevenue ||
        pattern.isEventsPerUser ||
        (pattern.isMetric && !pattern.needsConfirmation))
    ) {
      const t =
        pattern.isRevenue || analysis.type === 'currency'
          ? 'currency'
          : analysis.type === 'percentage'
            ? 'percentage'
            : 'number'
      metricColumns.push({
        name: header,
        displayName: header,
        type: t,
        aggregation: pattern.suggestedAggregation ?? 'sum',
      })
      return
    }
    if (pattern?.isDimension && !pattern.needsConfirmation) {
      dimensionColumns.push({ name: header, displayName: header, type: 'string' })
      return
    }
    if (pattern?.needsConfirmation) {
      uncertainColumns.push(header)
    }

    if (['number', 'currency', 'percentage'].includes(analysis.type)) {
      const isLikelyId =
        analysis.type === 'id' ||
        (analysis.stats?.uniqueRatio &&
          analysis.stats.uniqueRatio > 0.95 &&
          (header.toLowerCase().includes('id') || header.toLowerCase().includes('uuid')))
      if (isLikelyId) return
      const isRate =
        /rate|ratio|avg|percentage|%|당|per/i.test(header) || header.includes('당')
      metricColumns.push({
        name: header,
        displayName: header,
        type: (analysis.type === 'currency'
          ? 'currency'
          : analysis.type === 'percentage'
            ? 'percentage'
            : 'number') as 'number' | 'currency' | 'percentage',
        aggregation: isRate || analysis.type === 'percentage' ? 'avg' : 'sum',
      })
      return
    }
    if (analysis.type === 'string') {
      const uniqueRatio = analysis.stats?.uniqueRatio ?? 0
      const isLikelyId =
        uniqueRatio > 0.95 &&
        (header.toLowerCase().includes('id') || header.toLowerCase().includes('uuid'))
      if (!isLikelyId && uniqueRatio > 0.05) {
        dimensionColumns.push({ name: header, displayName: header, type: 'string' })
      } else if (!isLikelyId) {
        dimensionColumns.push({ name: header, displayName: header, type: 'string' })
        uncertainColumns.push(header)
      }
    }
  })

  const aggregationRules: Record<string, string> = {}
  metricColumns.forEach((m) => {
    aggregationRules[m.name] = m.aggregation
  })

  const llmQuestions: LLMQuestion[] = []
  const uncertainMetrics = uncertainColumns.filter((h) => {
    const a = columnAnalysis[h]
    return a && ['number', 'currency', 'percentage'].includes(a.type)
  })
  const uncertainDimensions = uncertainColumns.filter((h) => {
    const a = columnAnalysis[h]
    return a && a.type === 'string'
  })
  if (uncertainMetrics.length > 0) {
    llmQuestions.push({
      id: 'uncertain_metrics',
      question:
        language === 'ko'
          ? `다음 컬럼들이 지표(metric)로 분류되었지만 확인이 필요합니다: ${uncertainMetrics.join(', ')}. 실제 데이터 값을 확인하여 지표로 사용할지 결정해주세요.`
          : `The following columns were classified as metrics but need confirmation: ${uncertainMetrics.join(', ')}. Please review the actual data values to confirm.`,
      quickReplies: uncertainMetrics.slice(0, 8).map((h) => ({
        label: h,
        value: h,
        action: 'confirm_metric' as const,
      })),
    })
  }
  if (uncertainDimensions.length > 0) {
    llmQuestions.push({
      id: 'uncertain_dimensions',
      question:
        language === 'ko'
          ? `다음 컬럼들이 차원(dimension)으로 분류되었지만 확인이 필요합니다: ${uncertainDimensions.join(', ')}. 실제 데이터 값을 확인하여 차원으로 사용할지 결정해주세요.`
          : `The following columns were classified as dimensions but need confirmation: ${uncertainDimensions.join(', ')}. Please review the actual data values to confirm.`,
      quickReplies: uncertainDimensions.slice(0, 8).map((h) => ({
        label: h,
        value: h,
        action: 'confirm_dimension' as const,
      })),
    })
  }
  if (metricColumns.length === 0) {
    const potential = headers.filter((h) => {
      const a = columnAnalysis[h]
      return a && ['number', 'currency', 'percentage'].includes(a.type)
    })
    llmQuestions.push({
      id: 'no_metrics_detected',
      question:
        language === 'ko'
          ? '지표(숫자) 컬럼을 자동으로 감지하지 못했습니다. CSV 파일의 헤더를 확인하고 분석하고 싶은 숫자 컬럼을 선택해주세요.'
          : 'No metric columns detected. Please check CSV headers and select numeric columns to analyze.',
      quickReplies: (potential.length ? potential : headers).slice(0, 8).map((h) => ({
        label: h,
        value: h,
        action: 'add_metric' as const,
      })),
    })
  }

  return {
    dateColumn,
    metricColumns,
    dimensionColumns,
    aggregationRules,
    llmQuestions,
  }
}

/** Schema Proposal output: display names and semantic questions only. No structure, no numbers. */
export interface SchemaProposalResult {
  displayNames: Record<string, string>
  llmQuestions: LLMQuestion[]
}

const SCHEMA_PROPOSAL_SYSTEM_PROMPT = `You are a data analyst expert. Your task is SEMANTIC SUGGESTION ONLY.

You will receive:
1. A pre-computed column classification (dateColumn, metricColumns, dimensionColumns, aggregationRules). Do NOT change it.
2. Sample data.

Your job: Suggest ONLY
- **displayName**: A short, human-readable name for each metric and dimension column (e.g. "총 세션 수", "유입 채널"). Use the requested language.
- **llmQuestions**: Optional 0–3 short semantic suggestions or questions for the user (e.g. "이 컬럼은 매출로 보입니다. 지표로 사용할까요?"). No numbers, no aggregation.

Do NOT output: dateColumn, metricColumns, dimensionColumns, aggregationRules, or any structural change.
Do NOT suggest numbers, formulas, or normalization.`

/**
 * Build prompt for Schema Proposal (LLM): meaning/display names only. No structure, no aggregation.
 */
function buildSchemaProposalPrompt(
  profilerResult: ProbeResult,
  headers: string[],
  maskedRows: string[][],
  language: 'ko' | 'en',
  projectProfile?: ProjectProfile,
  workspacePurposes?: WorkspacePurpose[]
): string {
  const { dateColumn, metricColumns, dimensionColumns, aggregationRules } = profilerResult
  const metricNames = metricColumns.map((m) => m.name).join(', ')
  const dimensionNames = dimensionColumns.map((d) => d.name).join(', ')
  const tableHeader = headers.join(' | ')
  const displayRows = maskedRows.length > 10 ? maskedRows.slice(0, 5) : maskedRows.slice(0, 3)
  const tableRows = displayRows
    .map((row) => row.map((c) => (c.length > 12 ? c.slice(0, 10) + '...' : c)).join(' | '))
    .join('\n')

  let context = ''
  if (projectProfile?.industry || projectProfile?.serviceName) {
    context = `\nProject: ${projectProfile.serviceName ?? 'Unknown'}, Industry: ${projectProfile.industry ?? 'General'}.`
  }
  if (workspacePurposes?.length) {
    context += `\nPurpose: ${workspacePurposes.join(', ')}.`
  }

  return `=== CURRENT CLASSIFICATION (do not change) ===
dateColumn: ${dateColumn ?? 'null'}
metricColumns: ${metricNames || '(none)'}
dimensionColumns: ${dimensionNames || '(none)'}
aggregationRules: ${JSON.stringify(aggregationRules)}
${context}

=== SAMPLE DATA ===
${tableHeader}
${'-'.repeat(40)}
${tableRows}

=== YOUR TASK (semantic only) ===
Suggest ONLY:
1. **displayNames**: Object mapping each column name (from metricColumns and dimensionColumns) to a short human-readable name in ${language === 'ko' ? 'Korean' : 'English'}.
2. **llmQuestions**: Optional array of 0–3 items: { "id": "q1", "question": "short semantic suggestion or question", "quickReplies": [] }. Example: "이 컬럼은 매출로 보입니다. 지표로 사용할까요?"

Do NOT change the list of columns. Do NOT output aggregation or numbers.

OUTPUT FORMAT (JSON only):
{
  "displayNames": { "column_name": "Human Name", ... },
  "llmQuestions": [ { "id": "q1", "question": "...", "quickReplies": [] } ]
}`
}

/**
 * Run Schema Proposal only: LLM suggests display names and semantic questions. No structure, no numbers.
 */
export async function runSchemaProposal(
  profilerResult: ProbeResult,
  headers: string[],
  maskedRows: string[][],
  options: {
    language?: 'ko' | 'en'
    projectProfile?: ProjectProfile
    workspacePurposes?: WorkspacePurpose[]
  } = {}
): Promise<SchemaProposalResult> {
  const { language = 'ko', projectProfile, workspacePurposes } = options
  const userPrompt = buildSchemaProposalPrompt(
    profilerResult,
    headers,
    maskedRows,
    language,
    projectProfile,
    workspacePurposes
  )

  const model = new ChatOpenAI({
    modelName: 'gpt-4o',
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0.1,
  })

  const response = await model.invoke([
    { role: 'system', content: SCHEMA_PROPOSAL_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ])

  const content =
    typeof response.content === 'string'
      ? response.content
      : response.content.map((c) => ('text' in c ? c.text : '')).join('')

  let jsonStr = content.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim()
  }

  const parsed = JSON.parse(jsonStr) as { displayNames?: Record<string, string>; llmQuestions?: LLMQuestion[] }
  const displayNames = parsed.displayNames && typeof parsed.displayNames === 'object' ? parsed.displayNames : {}
  const llmQuestions = Array.isArray(parsed.llmQuestions)
    ? parsed.llmQuestions.filter((q) => q?.id && q?.question)
    : []

  return { displayNames, llmQuestions }
}

/**
 * Get purpose-specific metric priorities
 */
function getPurposeMetricPriorities(purposes: WorkspacePurpose[]): string {
  const purposeFocus: Record<WorkspacePurpose, string[]> = {
    product: [
      '사용자 행동 지표: DAU, MAU, 세션, 페이지뷰, 참여율, 이탈률',
      '기능 사용률: 클릭, 스크롤, 이벤트 발생 횟수',
      '사용자 여정: 전환율, 이탈 포인트, 재방문율',
    ],
    marketing: [
      '채널 성과: 세션, 사용자, 전환율, ROI',
      '캠페인 효율: 클릭률(CTR), 전환율(CVR), 비용당 전환',
      '트래픽 품질: 참여율, 이탈률, 세션 시간',
    ],
    biz: [
      '비즈니스 KPI: 매출, 수익, ARPU, ARPDAU, LTV',
      '성장 지표: 사용자 증가율, 매출 성장률, 전환율',
      '핵심 지표: DAU/MAU, 리텐션, 과금률',
    ],
    sales: [
      '리드 생성: 리드 수, 리드 품질 점수',
      '전환 지표: 리드→고객 전환율, 전환 시간',
      '영업 효율: 리드당 비용, 고객 획득 비용(CAC)',
    ],
  }

  const relevantFocuses = purposes.map(p => purposeFocus[p] || []).flat()
  if (relevantFocuses.length === 0) return ''

  return `
=== 분석 목적별 우선순위 ===
이 프로젝트는 다음 목적으로 데이터를 분석합니다: ${purposes.join(', ')}
다음 유형의 지표를 우선적으로 식별하세요:
${relevantFocuses.map((focus, i) => `${i + 1}. ${focus}`).join('\n')}

중요: 컬럼 이름이나 의미가 위 우선순위와 일치하면 높은 확신으로 metric으로 분류하세요.
`
}

/**
 * Build context-rich prompt for LLM with detailed column analysis
 * Optionally includes project context and workspace purposes for better KPI prioritization
 */
function buildEnrichedPrompt(
  headers: string[],
  allRows: string[][], // Changed from sampleRows to allRows for full analysis
  columnAnalysis: Record<string, ColumnAnalysis>,
  language: 'ko' | 'en',
  projectProfile?: ProjectProfile,
  workspacePurposes?: WorkspacePurpose[],
  dataPatternAnalyses?: Record<string, ReturnType<typeof analyzeDataPatterns>>
): string {
  // Format column analysis for LLM (with data pattern analysis)
  const columnDescriptions = headers.map(h => {
    const analysis = columnAnalysis[h]
    const patternAnalysis = dataPatternAnalyses?.[h]
    const typeLabel = {
      date: '📅 DATE',
      number: '📊 NUMBER',
      currency: '💰 CURRENCY',
      percentage: '📈 PERCENTAGE',
      string: '📝 TEXT',
      id: '🔑 ID (exclude)',
      unknown: '❓ UNKNOWN',
    }[analysis.type]

    let description = `- "${h}": ${typeLabel} (confidence: ${(analysis.confidence * 100).toFixed(0)}%)`
    
    // Add data pattern insights
    if (patternAnalysis) {
      const patterns: string[] = []
      if (patternAnalysis.isEventName) patterns.push('이벤트 이름 패턴 감지')
      if (patternAnalysis.isEventCount) patterns.push('이벤트 수 패턴 감지')
      if (patternAnalysis.isUserCount) patterns.push('사용자 수 패턴 감지')
      if (patternAnalysis.isRevenue) patterns.push('수익 패턴 감지')
      if (patternAnalysis.isEventsPerUser) patterns.push('사용자당 이벤트 수 패턴 감지')
      if (patternAnalysis.needsConfirmation) patterns.push('⚠️ 확인 필요')
      
      if (patterns.length > 0) {
        description += `\n  데이터 패턴: ${patterns.join(', ')}`
        description += `\n  제안: ${patternAnalysis.suggestedType}${patternAnalysis.suggestedAggregation ? ` (${patternAnalysis.suggestedAggregation})` : ''} (신뢰도: ${(patternAnalysis.confidence * 100).toFixed(0)}%)`
      }
    }
    
    if (analysis.sampleValues.length > 0) {
      description += `\n  실제 값 예시: ${analysis.sampleValues.slice(0, 5).map(v => `"${v}"`).join(', ')}`
    }
    
    if (analysis.stats) {
      const stats = analysis.stats
      if (stats.min !== undefined) {
        description += `\n  범위: ${stats.min.toFixed(2)} ~ ${stats.max?.toFixed(2)}, 평균: ${stats.avg?.toFixed(2)}`
      }
      if (stats.uniqueRatio !== undefined) {
        description += `, 고유값 비율: ${(stats.uniqueRatio * 100).toFixed(0)}%`
      }
    }
    
    return description
  }).join('\n')

  // Format sample data as readable table (show more rows if we have full data)
  const tableHeader = headers.join(' | ')
  const displayRows = allRows.length > 20 ? allRows.slice(0, 10) : allRows.slice(0, 5) // Show more if full data available
  const tableRows = displayRows.map(row => 
    row.map(cell => cell.length > 15 ? cell.slice(0, 12) + '...' : cell).join(' | ')
  ).join('\n')

  // Add data volume info
  const dataVolumeInfo = allRows.length > 20 
    ? `\n전체 데이터: ${allRows.length}행 (위는 샘플 ${displayRows.length}행)`
    : `\n데이터: ${allRows.length}행`

  // Build project context section if profile is available
  let projectContext = ''
  if (projectProfile) {
    const industryKPIs = getIndustryKPIs(projectProfile.industry)
    const prioritizedKPIs = matchGoalsToKPIs(projectProfile.goals, industryKPIs)
    const topKPIs = prioritizedKPIs.slice(0, 10)

    projectContext = `
=== PROJECT CONTEXT ===
Service: ${projectProfile.serviceName || 'Unknown'}
Industry: ${projectProfile.industry || 'General'}
Target: ${projectProfile.targetAudience || 'General users'}
Goals: ${projectProfile.goals?.join(', ') || 'Not specified'}

RECOMMENDED KPIs FOR THIS INDUSTRY:
${topKPIs.map(kpi => `- ${kpi.displayName} (${kpi.name}): ${kpi.description}`).join('\n')}

PRIORITY: When matching columns to metrics, prioritize the recommended KPIs above.
If a column name matches or is similar to a recommended KPI, mark it with higher priority.

`
  }

  // Add workspace purpose context
  const purposeContext = workspacePurposes && workspacePurposes.length > 0
    ? getPurposeMetricPriorities(workspacePurposes)
    : ''

  return `=== CSV COLUMN ANALYSIS ===
Total columns: ${headers.length}
${dataVolumeInfo}
${projectContext}${purposeContext}
DETECTED COLUMN TYPES:
${columnDescriptions}

SAMPLE DATA:
${tableHeader}
${'-'.repeat(50)}
${tableRows}

=== YOUR TASK ===
Based on the analysis above${projectProfile ? ' and the project context' : ''}, categorize EVERY column:

**CRITICAL PHILOSOPHY**: Be INCLUSIVE, not EXCLUSIVE! When in doubt, include the column. Users can always deselect it later.
**IMPORTANT**: 데이터 패턴 분석 결과를 우선적으로 신뢰하세요! 실제 데이터 값이 헤더 이름보다 더 정확한 지표입니다.

1. **DATE column** (optional, can be null): Time-series key for aggregation
   - Look for: 📅 DATE type, or columns with "date", "날짜", "일자", "period" in name
   - **CRITICAL**: If NO date column exists in the CSV (like event aggregate data, summary reports), you MUST return null (JSON null value, not string "null")
   - **IMPORTANT**: Date column is NOT required! Many CSVs are aggregate reports without time dimension (e.g., event counts by type, user segments, product categories). This is perfectly valid - just set dateColumn to null.
   - Date information might be in the filename, title, or metadata - but if it's not in a column, set dateColumn to null

2. **METRIC columns** (numeric measures to analyze):
   - **INCLUSIVE RULE**: Include ALL numeric columns (📊 NUMBER, 💰 CURRENCY, 📈 PERCENTAGE) EXCEPT:
     * Only exclude if explicitly marked as 🔑 ID type AND has >95% uniqueness (likely unique identifiers)
     * When in doubt, INCLUDE it as a metric - users can deselect if wrong
   - **CRITICAL**: 데이터 패턴 분석에서 "이벤트 수 패턴", "사용자 수 패턴", "수익 패턴", "사용자당 이벤트 수 패턴"이 감지된 컬럼은 무조건 metric으로 분류하세요!
   - **CRITICAL**: Event-related metrics MUST be included:
     * 이벤트 수, event count, event_count, events → metric (sum)
     * 총 사용자, total users, active users, 활성 사용자, 사용자 수 → metric (sum)
     * 활성 사용자당 이벤트 수, events per user, events per active user → metric (avg)
     * 총수익, total revenue, revenue, 수익, 매출 → metric (sum)
   - **CRITICAL**: "이벤트 이름" (event name) is a DIMENSION, not a metric - it's a categorical identifier
   - For metrics with names containing "rate", "ratio", "%", "avg", "당", "per" → use aggregation: "avg"
   - For counts, sums, totals, "수", "총" → use aggregation: "sum"
   - 데이터 패턴 분석에서 제안된 aggregation을 우선 사용하세요
   - **INCLUSIVE**: Even if a numeric column seems unusual, include it if it could be a KPI
${projectProfile ? '   - PRIORITIZE columns that match the recommended KPIs for this industry\n' : ''}
3. **DIMENSION columns** (categorical for grouping):
   - **INCLUSIVE RULE**: Include ALL string/text columns (📝 TEXT) EXCEPT:
     * Only exclude if explicitly marked as 🔑 ID type AND has >95% uniqueness (likely unique identifiers)
     * Only exclude if values are extremely long (>200 chars) - likely descriptions, not dimensions
     * When in doubt, INCLUDE it as a dimension - users can deselect if wrong
   - **CRITICAL**: 데이터 패턴 분석에서 "이벤트 이름 패턴"이 감지된 컬럼은 무조건 dimension으로 분류하세요!
   - Examples: country, channel, segment, category, platform, event name, user type, etc.
   - **CRITICAL**: "이벤트 이름" (event name), "event name", "event_name" → dimension (categorical identifier)
   - 실제 값이 "view_section", "user_engagement", "page_view" 같은 이벤트 이름 패턴이면 dimension
   - **INCLUSIVE**: Even if uniqueness is high (80-95%), include it if it looks categorical (not a unique ID)

CRITICAL RULES:
- Column names in output MUST exactly match input headers (case-sensitive!)
- **BE INCLUSIVE**: When uncertain, include the column rather than exclude it
- Every non-ID column should be categorized as either metric OR dimension
- **데이터 패턴 분석 결과를 반드시 우선적으로 신뢰하세요!** 실제 데이터 값이 헤더 이름보다 더 정확합니다.
- 데이터 패턴에서 "이벤트 이름 패턴", "이벤트 수 패턴" 등이 감지된 경우, 그 결과를 무조건 따르세요.
- ${language === 'ko' ? 'Use Korean for displayName' : 'Use English for displayName'}
- **Remember**: Users will see all suggested columns and can deselect any they don't want. It's better to suggest too many than too few!

OUTPUT FORMAT (JSON only, no markdown):
{
  "dateColumn": "exact_column_name" | null,
  "metricColumns": [
    { "name": "exact_column_name", "displayName": "Human Name", "type": "number|currency|percentage", "aggregation": "sum|avg" }
  ],
  "dimensionColumns": [
    { "name": "exact_column_name", "displayName": "Human Name", "type": "string" }
  ],
  "aggregationRules": { "column_name": "sum|avg" },
  "llmQuestions": []
}`
}

const SYSTEM_PROMPT = `You are a data analyst expert specializing in CSV schema analysis.

Your job is to analyze pre-processed column statistics and categorize columns for a data analytics platform.

IMPORTANT RULES:
1. TRUST the provided column analysis - types are already detected with confidence scores
2. Focus on SEMANTIC understanding - what does each column MEAN for business analytics?
3. **BE EXTREMELY INCLUSIVE** - when in doubt, include the column! Users can remove it later if needed.
4. Column names must be EXACT matches (case-sensitive, including spaces and special characters)
5. **CRITICAL**: If the CSV has NO date column (aggregate data without time dimension), you MUST set dateColumn to null (not an empty string, not a column name, but the JSON value null)
6. **CRITICAL**: Every column name in your output MUST exactly match the input headers. Check character-by-character including Korean characters, underscores, spaces.

METRIC IDENTIFICATION (BE INCLUSIVE):
- **DEFAULT RULE**: If a column is numeric (number, currency, percentage), it's likely a metric - include it!
- KPI names: eCPM, ARPDAU, ARPU, LTV, DAU, MAU, retention, conversion, CTR, CPC, CPM, etc.
- Financial: revenue, cost, spend, profit, ROAS, 수익, 매출, 비용, etc.
- Engagement: sessions, pageviews, time_spent, bounce_rate, etc.
- Event metrics: 이벤트 수, event count, event_count, events, etc.
- User metrics: 총 사용자, total users, active users, 활성 사용자, 사용자 수, etc.
- Calculated metrics: 활성 사용자당 이벤트 수, events per user, rate, ratio, avg, etc.
- Any percentage or rate is likely a metric
- **CRITICAL**: If a column name contains numbers, counts, totals, or rates in Korean or English, it's almost certainly a metric
- **INCLUDE ALL NUMERIC COLUMNS** unless they are clearly IDs (uniqueRatio > 0.95 AND column name contains "id" or "ID")

DIMENSION IDENTIFICATION (BE INCLUSIVE):
- **DEFAULT RULE**: If a column is text/string type and not an ID, it's likely a dimension - include it!
- Segmentation: user_type, segment, cohort, tier, etc.
- Geographic: country, region, city, etc.
- Categorical: channel, platform, device, source, medium, etc.
- Event names: 이벤트 이름, event name, event_name, etc.
- Temporal categories: day_of_week, hour, month_name (NOT date)
- **INCLUDE ALL TEXT COLUMNS** unless they are clearly IDs (uniqueRatio > 0.95 AND column name contains "id" or "ID")

OUTPUT: Return ONLY valid JSON, no explanation.`

/**
 * Enhanced column analysis using Pandas (optional, for better accuracy)
 */
async function getPandasColumnAnalysis(
  fileContent: string,
  maxRows: number = 10000
): Promise<Record<string, ColumnAnalysis> | null> {
  const brainApiUrl = process.env.BRAIN_API_URL
  const brainApiKey = process.env.BRAIN_API_KEY

  if (!brainApiUrl || !brainApiKey) {
    return null // Fallback to TypeScript analysis
  }

  try {
    // Encode file content as base64
    const base64Content = Buffer.from(fileContent, 'utf-8').toString('base64')

    const response = await fetch(`${brainApiUrl}/api/v1/profiler/csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': brainApiKey,
      },
      body: JSON.stringify({
        file_content: base64Content,
        max_rows: maxRows,
        language: 'ko',
      }),
    })

    if (!response.ok) {
      console.warn('[Probe] Pandas profiler failed, using TypeScript analysis')
      return null
    }

    const data = await response.json()
    return data.column_analysis as Record<string, ColumnAnalysis>
  } catch (error) {
    console.warn('[Probe] Pandas profiler error, using TypeScript analysis:', error)
    return null
  }
}

export async function probeSchema(
  headers: string[],
  allRows: string[][], // Changed from sampleRows to allRows - analyze full dataset
  language: 'ko' | 'en' = 'ko',
  projectProfile?: ProjectProfile,
  workspacePurposes?: WorkspacePurpose[],
  fileContent?: string // Optional: full CSV content for Pandas profiling
): Promise<ProbeResult> {
  // Step 1: Profiler (deterministic) — no LLM. Structure from code only.
  const profilerResult = await runCsvProfiler(headers, allRows, { language, fileContent })
  console.log('[Probe] === PROFILER RESULT (deterministic) ===')
  console.log(
    `[Probe] Date: ${profilerResult.dateColumn ?? 'null'}, Metrics: ${profilerResult.metricColumns.length}, Dimensions: ${profilerResult.dimensionColumns.length}`
  )

  // Step 2: Schema Proposal (LLM) — meaning/display names only. No structure, no numbers.
  const maskedRows = maskSensitiveData(allRows)
  try {
    const proposal = await runSchemaProposal(profilerResult, headers, maskedRows, {
      language,
      projectProfile,
      workspacePurposes,
    })

    const headerSet = new Set(headers)
    const metricColumns: MetricColumn[] = profilerResult.metricColumns.map((m) => ({
      ...m,
      displayName: headerSet.has(m.name) && proposal.displayNames[m.name]
        ? proposal.displayNames[m.name]
        : m.displayName,
    }))
    const dimensionColumns: DimensionColumn[] = profilerResult.dimensionColumns.map((d) => ({
      ...d,
      displayName: headerSet.has(d.name) && proposal.displayNames[d.name]
        ? proposal.displayNames[d.name]
        : d.displayName,
    }))
    const llmQuestions: LLMQuestion[] = [
      ...profilerResult.llmQuestions,
      ...proposal.llmQuestions,
    ]

    console.log('[Probe] === MERGED (Profiler structure + Proposal display names/questions) ===')
    return {
      dateColumn: profilerResult.dateColumn,
      metricColumns,
      dimensionColumns,
      aggregationRules: profilerResult.aggregationRules,
      llmQuestions,
    }
  } catch (_llmError) {
    console.error('[Probe] Schema Proposal (LLM) error, returning Profiler result only:', _llmError)
    return profilerResult
  }
}

/**
 * Fallback probe using pre-computed column analysis
 */
function fallbackProbe(
  headers: string[],
  columnAnalysis: Record<string, ColumnAnalysis>,
  language: 'ko' | 'en'
): ProbeResult {
  console.log('[Probe] === FALLBACK MODE ===')

  // Find date column
  const dateColumn = headers.find(h => columnAnalysis[h]?.type === 'date') || null

  // Metric columns: all numeric types except ID
  // 명시적 패턴 매칭 우선
  const metricColumns: MetricColumn[] = []
  const processedHeaders = new Set<string>()
  
  headers.forEach(h => {
    if (h === dateColumn) return
    
    const analysis = columnAnalysis[h]
    if (!analysis) return
    
    // 명시적 패턴 매칭
    const trimmed = h.trim()
    
    // "이벤트 수" - 무조건 metric (sum)
    if (/^이벤트\s*수$|^event\s*count$/i.test(trimmed)) {
      metricColumns.push({
        name: h,
        displayName: h,
        type: 'number',
        aggregation: 'sum',
      })
      processedHeaders.add(h)
      return
    }
    
    // "총 사용자" - 무조건 metric (sum)
    if (/^총\s*사용자$|^total\s*users?$/i.test(trimmed)) {
      metricColumns.push({
        name: h,
        displayName: h,
        type: 'number',
        aggregation: 'sum',
      })
      processedHeaders.add(h)
      return
    }
    
    // "활성 사용자당 이벤트 수" - 무조건 metric (avg)
    if (/활성.*사용자당.*이벤트.*수|events?\s*per\s*(active\s*)?user/i.test(h)) {
      metricColumns.push({
        name: h,
        displayName: h,
        type: 'number',
        aggregation: 'avg',
      })
      processedHeaders.add(h)
      return
    }
    
    // "총수익" - 무조건 metric (sum, currency)
    if (/^총\s*수익$|^total\s*revenue$/i.test(trimmed)) {
      metricColumns.push({
        name: h,
        displayName: h,
        type: 'currency',
        aggregation: 'sum',
      })
      processedHeaders.add(h)
      return
    }
    
    // 일반 numeric 타입
    if (['number', 'currency', 'percentage'].includes(analysis.type)) {
      // 더 엄격한 ID 조건: uniqueRatio > 0.95 AND name contains "id"
      const isLikelyId = analysis.type === 'id' || 
        (analysis.stats?.uniqueRatio && analysis.stats.uniqueRatio > 0.95 && 
         (h.toLowerCase().includes('id') || h.toLowerCase().includes('uuid')))
      if (isLikelyId) {
        return // ID 타입 제외
      }
      
      const isRate = /rate|ratio|avg|percentage|%|retention|conversion|ctr|cpc|당|per/i.test(h) ||
        h.includes('당') || h.includes('per')
      
      metricColumns.push({
        name: h,
        displayName: h,
        type: (analysis.type === 'currency' ? 'currency' : 
               analysis.type === 'percentage' ? 'percentage' : 'number') as 'number' | 'currency' | 'percentage',
        aggregation: (isRate || analysis.type === 'percentage' ? 'avg' : 'sum') as 'sum' | 'avg',
      })
      processedHeaders.add(h)
    }
  })

  // Dimension columns: string type with reasonable uniqueness
  // "이벤트 이름"은 무조건 dimension
  const dimensionColumns: DimensionColumn[] = headers
    .filter(h => {
      if (h === dateColumn) return false
      if (processedHeaders.has(h)) return false
      
      const analysis = columnAnalysis[h]
      if (!analysis) return false
      
      // "이벤트 이름"은 무조건 dimension
      const trimmed = h.trim()
      if (/^이벤트\s*이름$|^event\s*name$|^event_name$/i.test(trimmed)) {
        return true
      }
      
      // 더 엄격한 ID 조건
      const isLikelyId = analysis.type === 'id' || 
        (analysis.stats?.uniqueRatio && analysis.stats.uniqueRatio > 0.95 && 
         (h.toLowerCase().includes('id') || h.toLowerCase().includes('uuid')))
      if (isLikelyId) return false
      if (analysis.type !== 'string') return false
      
      // 더 관대한 조건: uniqueRatio < 0.95이면 dimension으로 포함
      const uniqueRatio = analysis.stats?.uniqueRatio || 0
      return uniqueRatio < 0.95 && uniqueRatio > 0.05
    })
    .map(h => ({
      name: h,
      displayName: h,
      type: 'string' as const,
    }))

  // Build aggregation rules
  const aggregationRules: Record<string, string> = {}
  metricColumns.forEach(m => {
    aggregationRules[m.name] = m.aggregation
  })

  // Questions only if truly problematic
  const llmQuestions: LLMQuestion[] = []
  
  if (metricColumns.length === 0) {
    // Find potential numeric columns that weren't detected
    const potentialMetrics = headers.filter(h => {
      const analysis = columnAnalysis[h]
      if (!analysis) return false
      // Check if it looks numeric but wasn't classified as such
      const sampleValues = analysis.sampleValues || []
      const hasNumericValues = sampleValues.some(v => {
        const cleaned = v.replace(/[$€¥₩£,\s%]/g, '')
        return !isNaN(parseFloat(cleaned)) && cleaned !== ''
      })
      return hasNumericValues && analysis.type !== 'id'
    })
    
    llmQuestions.push({
      id: 'no_metrics',
      question: language === 'ko' 
        ? '지표(숫자) 컬럼을 자동으로 감지하지 못했습니다. CSV 파일의 헤더를 확인하고 분석하고 싶은 숫자 컬럼을 선택해주세요.'
        : 'No metric columns detected. Please check CSV headers and select numeric columns to analyze.',
      quickReplies: (potentialMetrics.length > 0 ? potentialMetrics : headers)
        .slice(0, 8)
        .map(h => ({
          label: h,
          value: h,
          action: 'add_metric' as const,
        })),
    })
  }

  console.log('[Probe] Fallback results:', {
    date: dateColumn,
    metrics: metricColumns.map(m => m.name),
    dimensions: dimensionColumns.map(d => d.name),
  })

  return {
    dateColumn,
    metricColumns,
    dimensionColumns,
    aggregationRules,
    llmQuestions,
  }
}
