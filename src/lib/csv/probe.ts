/**
 * CSV Schema Probe using LLM
 * Analyzes CSV headers and sample data to generate mapping suggestions
 * Optionally uses project profile to prioritize relevant KPIs
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
  // Step 1: Try Pandas analysis first (if file content provided and file is large enough)
  // Use Pandas for files with > 1000 rows or when explicitly requested
  let columnAnalysis: Record<string, ColumnAnalysis>
  
  if (fileContent && allRows.length > 1000) {
    console.log('[Probe] Using Pandas for enhanced column analysis (large file)')
    const pandasAnalysis = await getPandasColumnAnalysis(fileContent, allRows.length)
    if (pandasAnalysis) {
      columnAnalysis = pandasAnalysis
      console.log('[Probe] Pandas analysis completed')
    } else {
      // Fallback to TypeScript
      console.log('[Probe] Pandas failed, using TypeScript analysis')
      columnAnalysis = getDetailedColumnAnalysis(headers, allRows)
    }
  } else {
    // Use TypeScript for small files (faster)
    columnAnalysis = getDetailedColumnAnalysis(headers, allRows)
  }

  console.log('[Probe] === COLUMN ANALYSIS ===')
  console.log(`[Probe] Analyzing ${allRows.length} rows (full dataset)`)
  if (projectProfile) {
    console.log(`[Probe] Project context: ${projectProfile.serviceName} (${projectProfile.industry})`)
  }
  if (workspacePurposes && workspacePurposes.length > 0) {
    console.log(`[Probe] Workspace purposes: ${workspacePurposes.join(', ')}`)
  }
  Object.entries(columnAnalysis).forEach(([col, analysis]) => {
    console.log(`[Probe] "${col}": ${analysis.type} (${(analysis.confidence * 100).toFixed(0)}%) | samples: ${analysis.sampleValues.slice(0, 2).join(', ')}`)
  })

  // Step 1.5: Analyze actual data patterns (not just headers)
  console.log('[Probe] === DATA PATTERN ANALYSIS ===')
  const dataPatternAnalyses: Record<string, ReturnType<typeof analyzeDataPatterns>> = {}
  const columnsNeedingConfirmation: string[] = []
  
  headers.forEach((header, colIndex) => {
    const patternAnalysis = analyzeDataPatterns(header, colIndex, allRows, columnAnalysis[header])
    dataPatternAnalyses[header] = patternAnalysis
    
    if (patternAnalysis.needsConfirmation) {
      columnsNeedingConfirmation.push(header)
      console.log(`[Probe] "${header}": Needs confirmation (confidence: ${(patternAnalysis.confidence * 100).toFixed(0)}%)`)
    } else {
      console.log(`[Probe] "${header}": ${patternAnalysis.suggestedType} (${(patternAnalysis.confidence * 100).toFixed(0)}%) - ${patternAnalysis.isEventName ? 'Event Name' : patternAnalysis.isEventCount ? 'Event Count' : patternAnalysis.isUserCount ? 'User Count' : patternAnalysis.isRevenue ? 'Revenue' : patternAnalysis.isEventsPerUser ? 'Events Per User' : patternAnalysis.suggestedType}`)
    }
  })

  // Step 2: Build enriched prompt with project context and workspace purposes
  // Use full data for analysis, but mask sensitive data for LLM
  const maskedRows = maskSensitiveData(allRows)
  const userPrompt = buildEnrichedPrompt(headers, maskedRows, columnAnalysis, language, projectProfile, workspacePurposes, dataPatternAnalyses)

  // Step 3: Call LLM
  const model = new ChatOpenAI({
    modelName: 'gpt-4o',
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0.1,
  })

  try {
    const response = await model.invoke([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ])

    const content = typeof response.content === 'string'
      ? response.content
      : response.content.map(c => 'text' in c ? c.text : '').join('')

    // Parse JSON response
    let jsonStr = content.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim()
    }

    const result = JSON.parse(jsonStr) as ProbeResult
    
    // Validate column names match headers exactly
    const headerSet = new Set(headers)
    const invalidColumns: string[] = []
    
    if (result.dateColumn && !headerSet.has(result.dateColumn)) {
      invalidColumns.push(`dateColumn: "${result.dateColumn}"`)
    }
    
    result.metricColumns?.forEach(m => {
      if (!headerSet.has(m.name)) {
        invalidColumns.push(`metric: "${m.name}"`)
      }
    })
    
    result.dimensionColumns?.forEach(d => {
      if (!headerSet.has(d.name)) {
        invalidColumns.push(`dimension: "${d.name}"`)
      }
    })
    
    // Validate LLM output: ensure all column names match exactly
    const allHeadersSet = new Set(headers)
    const invalidMetrics = (result.metricColumns || []).filter(m => !allHeadersSet.has(m.name))
    const invalidDimensions = (result.dimensionColumns || []).filter(d => !allHeadersSet.has(d.name))
    
    if (invalidMetrics.length > 0 || invalidDimensions.length > 0) {
      console.error(`[Probe] LLM column name mismatch:\n${invalidMetrics.map(m => `Metric: "${m.name}"`).join(', ')}\n${invalidDimensions.map(d => `Dimension: "${d.name}"`).join(', ')}\n\nActual headers: ${headers.join(', ')}`)
      // Don't throw error - fallback to auto-detection instead
      console.log('[Probe] Falling back to auto-detection for all columns')
    }
    
    console.log('[Probe] === LLM RESULT ===')
    console.log(`[Probe] Date: ${result.dateColumn || 'null (no date column)'}`)
    console.log(`[Probe] Metrics (${result.metricColumns?.length || 0}): ${result.metricColumns?.map(m => m.name).join(', ')}`)
    console.log(`[Probe] Dimensions (${result.dimensionColumns?.length || 0}): ${result.dimensionColumns?.map(d => d.name).join(', ')}`)
    
    // 자동 감지 개선: numeric 타입 컬럼 중 metric으로 분류되지 않은 컬럼 자동 추가
    const detectedMetricNames = new Set((result.metricColumns || []).map(m => m.name))
    const autoDetectedMetrics: typeof result.metricColumns = []
    
    // 데이터 패턴 기반 자동 감지 (실제 데이터 값 분석)
    headers.forEach((header, colIndex) => {
      // 이미 metric으로 분류되었거나 date 컬럼이면 스킵
      if (detectedMetricNames.has(header) || header === result.dateColumn) {
        return
      }
      
      const analysis = columnAnalysis[header]
      const patternAnalysis = dataPatternAnalyses[header]
      
      if (!patternAnalysis) return
      
      // 데이터 패턴 분석 결과를 우선 사용
      if (patternAnalysis.isEventName) {
        // 이벤트 이름은 dimension으로 처리 (아래 dimension 로직에서 처리)
        return
      }
      
      if (patternAnalysis.isEventCount || patternAnalysis.isUserCount || patternAnalysis.isRevenue || patternAnalysis.isEventsPerUser) {
        // 데이터 패턴이 명확한 경우 무조건 metric으로 추가
        autoDetectedMetrics.push({
          name: header,
          displayName: header,
          type: (patternAnalysis.isRevenue || analysis.type === 'currency' ? 'currency' : 
                 analysis.type === 'percentage' ? 'percentage' : 'number') as 'number' | 'currency' | 'percentage',
          aggregation: patternAnalysis.suggestedAggregation || 'sum',
        })
        return
      }
      
      // 패턴이 명확하지 않지만 numeric 타입인 경우
      if (patternAnalysis.isMetric && !patternAnalysis.needsConfirmation) {
        autoDetectedMetrics.push({
          name: header,
          displayName: header,
          type: (analysis.type === 'currency' ? 'currency' : 
                 analysis.type === 'percentage' ? 'percentage' : 'number') as 'number' | 'currency' | 'percentage',
          aggregation: patternAnalysis.suggestedAggregation || 'sum',
        })
        return
      }
      
      // numeric 타입이지만 패턴 분석이 없거나 불확실한 경우
      // **포괄적 접근**: 모든 numeric 컬럼을 기본적으로 metric으로 포함
      if (analysis && ['number', 'currency', 'percentage'].includes(analysis.type)) {
        // ID 타입은 제외 (더 엄격한 조건: uniqueRatio > 0.95 AND name contains "id")
        const isLikelyId = analysis.type === 'id' || 
          (analysis.stats?.uniqueRatio && analysis.stats.uniqueRatio > 0.95 && 
           (header.toLowerCase().includes('id') || header.toLowerCase().includes('uuid')))
        if (isLikelyId) {
          return
        }
        
        // 패턴 분석이 불확실하면 헤더 이름 기반으로 판단
        const isRate = /rate|ratio|avg|percentage|%|retention|conversion|ctr|cpc|당|per/i.test(header) ||
          header.includes('당') || header.includes('per')
        const isCount = /count|수|총|total|sum/i.test(header) ||
          header.includes('수') || header.includes('총')
        const isRevenue = /revenue|수익|매출|profit|이익/i.test(header)
        
        const aggregation = (isRate || analysis.type === 'percentage' || header.includes('당')) 
          ? 'avg' as const 
          : 'sum' as const
        
        // 이미 추가되지 않은 경우에만 추가
        if (!autoDetectedMetrics.some(m => m.name === header)) {
          autoDetectedMetrics.push({
            name: header,
            displayName: header,
            type: (isRevenue || analysis.type === 'currency' ? 'currency' : 
                   analysis.type === 'percentage' ? 'percentage' : 'number') as 'number' | 'currency' | 'percentage',
            aggregation,
          })
        }
      }
    })
    
    // 자동 감지된 metric 추가
    if (autoDetectedMetrics.length > 0) {
      console.log(`[Probe] Auto-detected ${autoDetectedMetrics.length} additional metric columns: ${autoDetectedMetrics.map(m => m.name).join(', ')}`)
    }
    
    // If LLM returned invalid column names, use auto-detection only
    const useAutoDetectionOnly = invalidMetrics.length > 0 || invalidDimensions.length > 0
    
    // Merge LLM results with auto-detected metrics (remove duplicates)
    const llmMetricNames = new Set((result.metricColumns || []).map(m => m.name))
    const mergedMetrics = useAutoDetectionOnly 
      ? autoDetectedMetrics 
      : [
          ...(result.metricColumns || []),
          ...autoDetectedMetrics.filter(m => !llmMetricNames.has(m.name)) // LLM이 놓친 컬럼만 추가
        ]
    
    const allMetricColumns = mergedMetrics
    
    // For dimensions, 데이터 패턴 기반 자동 감지
    const autoDetectedDimensions: typeof result.dimensionColumns = []
    const uncertainColumns: string[] = []
    
    headers.forEach((header, colIndex) => {
      // 이미 metric이나 date 컬럼이면 스킵
      if (allMetricColumns.some(m => m.name === header) || header === result.dateColumn) {
        return
      }
      
      const analysis = columnAnalysis[header]
      const patternAnalysis = dataPatternAnalyses[header]
      
      // 데이터 패턴 분석 결과를 우선 사용
      if (patternAnalysis) {
        if (patternAnalysis.isEventName) {
          // 이벤트 이름 패턴이 감지된 경우 무조건 dimension
          autoDetectedDimensions.push({
            name: header,
            displayName: header,
            type: 'string' as const,
          })
          return
        }
        
        if (patternAnalysis.isDimension && !patternAnalysis.needsConfirmation) {
          // dimension 패턴이 명확한 경우
          autoDetectedDimensions.push({
            name: header,
            displayName: header,
            type: 'string' as const,
          })
          return
        }
        
        if (patternAnalysis.needsConfirmation) {
          // 불확실한 경우 확인 필요 목록에 추가
          uncertainColumns.push(header)
        }
      }
      
      // **2단계: 타입 기반 포괄적 포함 - 모든 string 컬럼을 dimension으로 포함**
      if (analysis && analysis.type === 'string') {
        const uniqueRatio = analysis.stats?.uniqueRatio || 0
        // 더 관대한 조건: uniqueRatio < 0.95이면 dimension으로 포함
        // 명확한 ID만 제외 (uniqueRatio > 0.95 AND name contains "id")
        const isLikelyId = uniqueRatio > 0.95 && 
          (header.toLowerCase().includes('id') || header.toLowerCase().includes('uuid'))
        
        if (!isLikelyId && uniqueRatio > 0.05) {
          // 대부분의 string 컬럼을 dimension으로 포함
          if (!autoDetectedDimensions.some(d => d.name === header)) {
            autoDetectedDimensions.push({
              name: header,
              displayName: header,
              type: 'string' as const,
            })
          }
        } else if (isLikelyId) {
          // 명확한 ID는 제외
          return
        } else {
          // 매우 낮은 uniqueness (거의 모든 값이 동일)는 확인 필요하지만 일단 포함
          if (!autoDetectedDimensions.some(d => d.name === header)) {
            autoDetectedDimensions.push({
              name: header,
              displayName: header,
              type: 'string' as const,
            })
          }
          uncertainColumns.push(header)
        }
      }
    })
    
    // Merge LLM results with auto-detected dimensions (remove duplicates)
    const llmDimensionNames = new Set((result.dimensionColumns || []).map(d => d.name))
    const mergedDimensions = useAutoDetectionOnly
      ? autoDetectedDimensions
      : [
          ...(result.dimensionColumns || []),
          ...autoDetectedDimensions.filter(
            d => !llmDimensionNames.has(d.name) && // LLM이 놓친 컬럼만 추가
                 !allMetricColumns.some(m => m.name === d.name) &&
                 d.name !== result.dateColumn
          )
        ]
    
    const allDimensionColumns = mergedDimensions
    
    // aggregationRules 업데이트 (자동 감지된 metric 포함)
    const allAggregationRules = { ...(result.aggregationRules || {}) }
    autoDetectedMetrics.forEach(m => {
      allAggregationRules[m.name] = m.aggregation
    })
    
    // 최종 검증: **포괄적 접근** - 모든 컬럼이 포함되었는지 확인하고 누락된 컬럼 자동 추가
    const missingMetrics: string[] = []
    const missingDimensions: string[] = []
    const allIncludedColumns = new Set<string>()
    
    if (result.dateColumn) allIncludedColumns.add(result.dateColumn)
    allMetricColumns.forEach(m => allIncludedColumns.add(m.name))
    allDimensionColumns.forEach(d => allIncludedColumns.add(d.name))
    
    headers.forEach((h, colIndex) => {
      // 이미 포함된 컬럼은 스킵
      if (allIncludedColumns.has(h)) return
      
      const patternAnalysis = dataPatternAnalyses[h]
      const analysis = columnAnalysis[h]
      
      if (!analysis) {
        // 분석이 없는 경우도 일단 포함 (확인 필요)
        missingDimensions.push(h)
        return
      }
      
      // 데이터 패턴 분석 결과를 우선 사용
      if (patternAnalysis) {
        if (patternAnalysis.isEventName && !patternAnalysis.needsConfirmation) {
          missingDimensions.push(h)
          return
        }
        
        if ((patternAnalysis.isEventCount || patternAnalysis.isUserCount || 
             patternAnalysis.isRevenue || patternAnalysis.isEventsPerUser || 
             patternAnalysis.isMetric) && !patternAnalysis.needsConfirmation) {
          missingMetrics.push(h)
          return
        }
      }
      
      // 패턴 분석이 없거나 불확실한 경우 타입 기반으로 판단
      if (analysis && ['number', 'currency', 'percentage'].includes(analysis.type)) {
        // 더 관대한 조건: ID가 아니면 모두 metric으로 포함
        const isLikelyId = analysis.type === 'id' || 
          (analysis.stats?.uniqueRatio && analysis.stats.uniqueRatio > 0.95 && 
           (h.toLowerCase().includes('id') || h.toLowerCase().includes('uuid')))
        if (!isLikelyId) {
          missingMetrics.push(h)
        }
      } else if (analysis && analysis.type === 'string') {
        const uniqueRatio = analysis.stats?.uniqueRatio || 0
        // 더 관대한 조건: 명확한 ID가 아니면 모두 dimension으로 포함
        const isLikelyId = uniqueRatio > 0.95 && 
          (h.toLowerCase().includes('id') || h.toLowerCase().includes('uuid'))
        if (!isLikelyId && uniqueRatio > 0.05) {
          missingDimensions.push(h)
        } else if (!isLikelyId) {
          // 매우 낮은 uniqueness도 일단 포함 (확인 필요)
          missingDimensions.push(h)
        }
      } else {
        // 알 수 없는 타입도 일단 dimension으로 포함 (확인 필요)
        missingDimensions.push(h)
      }
    })
    
    // 누락된 metric 컬럼 자동 추가
    if (missingMetrics.length > 0) {
      console.log(`[Probe] Adding missing metrics based on data patterns: ${missingMetrics.join(', ')}`)
      missingMetrics.forEach(h => {
        const analysis = columnAnalysis[h]
        const patternAnalysis = dataPatternAnalyses[h]
        const isRate = /rate|ratio|avg|percentage|%|당|per/i.test(h) || h.includes('당')
        allMetricColumns.push({
          name: h,
          displayName: h,
          type: (analysis.type === 'currency' ? 'currency' : 
                 analysis.type === 'percentage' ? 'percentage' : 'number') as 'number' | 'currency' | 'percentage',
          aggregation: patternAnalysis?.suggestedAggregation || (isRate || analysis.type === 'percentage' ? 'avg' : 'sum') as 'sum' | 'avg',
        })
        allAggregationRules[h] = patternAnalysis?.suggestedAggregation || (isRate || analysis.type === 'percentage' ? 'avg' : 'sum')
      })
    }
    
    // 누락된 dimension 컬럼 자동 추가
    if (missingDimensions.length > 0) {
      console.log(`[Probe] Adding missing dimensions based on data patterns: ${missingDimensions.join(', ')}`)
      missingDimensions.forEach(h => {
        allDimensionColumns.push({
          name: h,
          displayName: h,
          type: 'string' as const,
        })
      })
    }
    
    // 불확실한 컬럼에 대한 질문 생성 (사용자가 수동으로 확인할 수 있도록)
    const llmQuestions: LLMQuestion[] = [...(result.llmQuestions || [])]
    
    if (uncertainColumns.length > 0) {
      const uncertainMetrics = uncertainColumns.filter(h => {
        const analysis = columnAnalysis[h]
        return analysis && ['number', 'currency', 'percentage'].includes(analysis.type)
      })
      const uncertainDimensions = uncertainColumns.filter(h => {
        const analysis = columnAnalysis[h]
        return analysis && analysis.type === 'string'
      })
      
      if (uncertainMetrics.length > 0) {
        llmQuestions.push({
          id: 'uncertain_metrics',
          question: language === 'ko' 
            ? `다음 컬럼들이 지표(metric)로 분류되었지만 확인이 필요합니다: ${uncertainMetrics.join(', ')}. 실제 데이터 값을 확인하여 지표로 사용할지 결정해주세요.`
            : `The following columns were classified as metrics but need confirmation: ${uncertainMetrics.join(', ')}. Please review the actual data values to confirm.`,
          quickReplies: uncertainMetrics.slice(0, 8).map(h => ({
            label: h,
            value: h,
            action: 'confirm_metric' as const,
          })),
        })
      }
      
      if (uncertainDimensions.length > 0) {
        llmQuestions.push({
          id: 'uncertain_dimensions',
          question: language === 'ko'
            ? `다음 컬럼들이 차원(dimension)으로 분류되었지만 확인이 필요합니다: ${uncertainDimensions.join(', ')}. 실제 데이터 값을 확인하여 차원으로 사용할지 결정해주세요.`
            : `The following columns were classified as dimensions but need confirmation: ${uncertainDimensions.join(', ')}. Please review the actual data values to confirm.`,
          quickReplies: uncertainDimensions.slice(0, 8).map(h => ({
            label: h,
            value: h,
            action: 'confirm_dimension' as const,
          })),
        })
      }
    }
    
    // Validate and ensure arrays
    return {
      dateColumn: result.dateColumn || null,
      metricColumns: allMetricColumns,
      dimensionColumns: allDimensionColumns,
      aggregationRules: allAggregationRules,
      llmQuestions: llmQuestions, // Include questions for uncertain columns
    }
  } catch (error) {
    console.error('[Probe] LLM error:', error)
    
    // Fallback: use column analysis directly
    const fallbackResult = fallbackProbe(headers, columnAnalysis, language)
    
    // If fallback also fails to detect metrics, add helpful question
    if (fallbackResult.metricColumns.length === 0) {
      fallbackResult.llmQuestions.push({
        id: 'no_metrics_detected',
        question: language === 'ko' 
          ? '지표(숫자) 컬럼을 자동으로 감지하지 못했습니다. CSV 파일의 헤더를 확인하고 분석하고 싶은 숫자 컬럼을 선택해주세요.'
          : 'No metric columns detected. Please check CSV headers and select numeric columns to analyze.',
        quickReplies: headers
          .filter(h => {
            const analysis = columnAnalysis[h]
            return analysis && ['number', 'currency', 'percentage'].includes(analysis.type)
          })
          .slice(0, 8)
          .map(h => ({
            label: h,
            value: h,
            action: 'add_metric' as const,
          })),
      })
    }
    
    return fallbackResult
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
