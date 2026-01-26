/**
 * CSV Schema Probe using LLM
 * Analyzes CSV headers and sample data to generate mapping suggestions
 * Optionally uses project profile to prioritize relevant KPIs
 */

import { ChatOpenAI } from '@langchain/openai'
import { maskSensitiveData, getDetailedColumnAnalysis, type ColumnAnalysis } from './parser'
import type { MetricColumn, DimensionColumn, LLMQuestion, ProjectProfile, WorkspacePurpose } from '@/types/database'
import { getIndustryKPIs, matchGoalsToKPIs } from '@/lib/templates/industry-kpis'

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
  workspacePurposes?: WorkspacePurpose[]
): string {
  // Format column analysis for LLM
  const columnDescriptions = headers.map(h => {
    const analysis = columnAnalysis[h]
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
    
    if (analysis.sampleValues.length > 0) {
      description += `\n  Examples: ${analysis.sampleValues.slice(0, 3).map(v => `"${v}"`).join(', ')}`
    }
    
    if (analysis.stats) {
      const stats = analysis.stats
      if (stats.min !== undefined) {
        description += `\n  Range: ${stats.min.toFixed(2)} ~ ${stats.max?.toFixed(2)}, Avg: ${stats.avg?.toFixed(2)}`
      }
      if (stats.uniqueRatio !== undefined) {
        description += `, Unique: ${(stats.uniqueRatio * 100).toFixed(0)}%`
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

1. **DATE column** (optional, can be null): Time-series key for aggregation
   - Look for: 📅 DATE type, or columns with "date", "날짜", "일자", "period" in name
   - **CRITICAL**: If NO date column exists in the CSV (like event aggregate data, summary reports), you MUST return null (JSON null value, not string "null")
   - **IMPORTANT**: Date column is NOT required! Many CSVs are aggregate reports without time dimension (e.g., event counts by type, user segments, product categories). This is perfectly valid - just set dateColumn to null.
   - Date information might be in the filename, title, or metadata - but if it's not in a column, set dateColumn to null

2. **METRIC columns** (numeric measures to analyze):
   - Include: 📊 NUMBER, 💰 CURRENCY, 📈 PERCENTAGE types
   - These are KPIs like revenue, users, sessions, eCPM, ARPDAU, retention rate, etc.
   - Exclude: 🔑 ID type columns
   - For metrics with names containing "rate", "ratio", "%", "avg" → use aggregation: "avg"
   - For counts, sums, totals → use aggregation: "sum"
${projectProfile ? '   - PRIORITIZE columns that match the recommended KPIs for this industry\n' : ''}
3. **DIMENSION columns** (categorical for grouping):
   - Include: 📝 TEXT type with reasonable uniqueness (< 90%)
   - Examples: country, channel, segment, category, platform
   - Exclude: High-uniqueness text (likely descriptions or IDs)

CRITICAL:
- Column names in output MUST exactly match input headers (case-sensitive!)
- Every non-ID column should be categorized as either metric OR dimension
- ${language === 'ko' ? 'Use Korean for displayName' : 'Use English for displayName'}

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
3. Be INCLUSIVE for metrics - any numeric KPI should be captured
4. Column names must be EXACT matches (case-sensitive, including spaces and special characters)
5. **CRITICAL**: If the CSV has NO date column (aggregate data without time dimension), you MUST set dateColumn to null (not an empty string, not a column name, but the JSON value null)
6. **CRITICAL**: Every column name in your output MUST exactly match the input headers. Check character-by-character including Korean characters, underscores, spaces.

METRIC IDENTIFICATION TIPS:
- KPI names: eCPM, ARPDAU, ARPU, LTV, DAU, MAU, retention, conversion, CTR, CPC, CPM, etc.
- Financial: revenue, cost, spend, profit, ROAS, etc.
- Engagement: sessions, pageviews, time_spent, bounce_rate, etc.
- Any percentage or rate is likely a metric

DIMENSION IDENTIFICATION TIPS:
- Segmentation: user_type, segment, cohort, tier, etc.
- Geographic: country, region, city, etc.
- Categorical: channel, platform, device, source, medium, etc.
- Temporal categories: day_of_week, hour, month_name (NOT date)

OUTPUT: Return ONLY valid JSON, no explanation.`

export async function probeSchema(
  headers: string[],
  allRows: string[][], // Changed from sampleRows to allRows - analyze full dataset
  language: 'ko' | 'en' = 'ko',
  projectProfile?: ProjectProfile,
  workspacePurposes?: WorkspacePurpose[]
): Promise<ProbeResult> {
  // Step 1: Deep analyze all columns using FULL dataset (not just sample)
  // This gives us accurate statistics, distributions, and patterns
  const columnAnalysis = getDetailedColumnAnalysis(headers, allRows)

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

  // Step 2: Build enriched prompt with project context and workspace purposes
  // Use full data for analysis, but mask sensitive data for LLM
  const maskedRows = maskSensitiveData(allRows)
  const userPrompt = buildEnrichedPrompt(headers, maskedRows, columnAnalysis, language, projectProfile, workspacePurposes)

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
    
    if (invalidColumns.length > 0) {
      console.error(`[Probe] Invalid column names from LLM: ${invalidColumns.join(', ')}`)
      console.error(`[Probe] Available headers: ${headers.join(', ')}`)
      throw new Error(
        `LLM returned invalid column names that don't match CSV headers: ${invalidColumns.join(', ')}. ` +
        `Available headers: ${headers.join(', ')}`
      )
    }
    
    console.log('[Probe] === LLM RESULT ===')
    console.log(`[Probe] Date: ${result.dateColumn || 'null (no date column)'}`)
    console.log(`[Probe] Metrics (${result.metricColumns?.length || 0}): ${result.metricColumns?.map(m => m.name).join(', ')}`)
    console.log(`[Probe] Dimensions (${result.dimensionColumns?.length || 0}): ${result.dimensionColumns?.map(d => d.name).join(', ')}`)
    
    // 자동 감지 개선: numeric 타입 컬럼 중 metric으로 분류되지 않은 컬럼 자동 추가
    const detectedMetricNames = new Set((result.metricColumns || []).map(m => m.name))
    const autoDetectedMetrics: typeof result.metricColumns = []
    
    headers.forEach(header => {
      // 이미 metric으로 분류되었거나 date 컬럼이면 스킵
      if (detectedMetricNames.has(header) || header === result.dateColumn) {
        return
      }
      
      const analysis = columnAnalysis[header]
      // numeric 타입 컬럼이지만 metric으로 분류되지 않은 경우 자동 추가
      // ID 타입은 제외 (uniqueRatio가 높은 숫자 컬럼)
      if (analysis && ['number', 'currency', 'percentage'].includes(analysis.type)) {
        // ID 타입은 제외 (높은 uniqueness는 ID일 가능성)
        if (analysis.type === 'id' || (analysis.stats?.uniqueRatio && analysis.stats.uniqueRatio > 0.9)) {
          return
        }
        
        const isRate = /rate|ratio|avg|percentage|%|retention|conversion|ctr|cpc/i.test(header)
        autoDetectedMetrics.push({
          name: header,
          displayName: header,
          type: (analysis.type === 'currency' ? 'currency' : 
                 analysis.type === 'percentage' ? 'percentage' : 'number') as 'number' | 'currency' | 'percentage',
          aggregation: (isRate || analysis.type === 'percentage' ? 'avg' : 'sum') as 'sum' | 'avg',
        })
      }
    })
    
    // 자동 감지된 metric 추가
    if (autoDetectedMetrics.length > 0) {
      console.log(`[Probe] Auto-detected ${autoDetectedMetrics.length} additional metric columns: ${autoDetectedMetrics.map(m => m.name).join(', ')}`)
    }
    
    const allMetricColumns = [...(result.metricColumns || []), ...autoDetectedMetrics]
    
    // aggregationRules 업데이트 (자동 감지된 metric 포함)
    const allAggregationRules = { ...(result.aggregationRules || {}) }
    autoDetectedMetrics.forEach(m => {
      allAggregationRules[m.name] = m.aggregation
    })
    
    // Validate and ensure arrays
    return {
      dateColumn: result.dateColumn || null,
      metricColumns: allMetricColumns,
      dimensionColumns: result.dimensionColumns || [],
      aggregationRules: allAggregationRules,
      llmQuestions: result.llmQuestions || [],
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
  const dateColumn = headers.find(h => columnAnalysis[h].type === 'date') || null

  // Metric columns: all numeric types except ID
  const metricColumns: MetricColumn[] = headers
    .filter(h => {
      const type = columnAnalysis[h].type
      return ['number', 'currency', 'percentage'].includes(type)
    })
    .map(h => {
      const analysis = columnAnalysis[h]
      const isRate = /rate|ratio|avg|percentage|%|retention|conversion|ctr|cpc/i.test(h)
      
      return {
        name: h,
        displayName: h,
        type: (analysis.type === 'currency' ? 'currency' : 
               analysis.type === 'percentage' ? 'percentage' : 'number') as 'number' | 'currency' | 'percentage',
        aggregation: (isRate || analysis.type === 'percentage' ? 'avg' : 'sum') as 'sum' | 'avg',
      }
    })

  // Dimension columns: string type with reasonable uniqueness
  const dimensionColumns: DimensionColumn[] = headers
    .filter(h => {
      if (h === dateColumn) return false
      if (metricColumns.some(m => m.name === h)) return false
      
      const analysis = columnAnalysis[h]
      if (analysis.type === 'id') return false
      if (analysis.type !== 'string') return false
      
      // Exclude high-uniqueness text (likely descriptions)
      const uniqueRatio = analysis.stats?.uniqueRatio || 0
      return uniqueRatio < 0.9
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
