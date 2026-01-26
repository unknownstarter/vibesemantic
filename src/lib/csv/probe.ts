/**
 * CSV Schema Probe using LLM
 * Analyzes CSV headers and sample data to generate mapping suggestions
 * Optionally uses project profile to prioritize relevant KPIs
 */

import { ChatOpenAI } from '@langchain/openai'
import { maskSensitiveData, getDetailedColumnAnalysis, type ColumnAnalysis } from './parser'
import type { MetricColumn, DimensionColumn, LLMQuestion, ProjectProfile } from '@/types/database'
import { getIndustryKPIs, matchGoalsToKPIs } from '@/lib/templates/industry-kpis'

export interface ProbeResult {
  dateColumn: string | null
  metricColumns: MetricColumn[]
  dimensionColumns: DimensionColumn[]
  aggregationRules: Record<string, string>
  llmQuestions: LLMQuestion[]
}

/**
 * Build context-rich prompt for LLM with detailed column analysis
 * Optionally includes project context for better KPI prioritization
 */
function buildEnrichedPrompt(
  headers: string[],
  sampleRows: string[][],
  columnAnalysis: Record<string, ColumnAnalysis>,
  language: 'ko' | 'en',
  projectProfile?: ProjectProfile
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

  // Format sample data as readable table
  const tableHeader = headers.join(' | ')
  const tableRows = sampleRows.slice(0, 5).map(row => 
    row.map(cell => cell.length > 15 ? cell.slice(0, 12) + '...' : cell).join(' | ')
  ).join('\n')

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

  return `=== CSV COLUMN ANALYSIS ===
Total columns: ${headers.length}
${projectContext}
DETECTED COLUMN TYPES:
${columnDescriptions}

SAMPLE DATA:
${tableHeader}
${'-'.repeat(50)}
${tableRows}

=== YOUR TASK ===
Based on the analysis above${projectProfile ? ' and the project context' : ''}, categorize EVERY column:

1. **DATE column** (exactly 1 or null): Time-series key for aggregation
   - Look for: 📅 DATE type, or columns with "date", "날짜", "일자", "period" in name
   - If no clear date column, set to null (aggregate data without time dimension)

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
4. Column names must be EXACT matches (case-sensitive)

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
  sampleRows: string[][],
  language: 'ko' | 'en' = 'ko',
  projectProfile?: ProjectProfile
): Promise<ProbeResult> {
  // Step 1: Deep analyze all columns
  const columnAnalysis = getDetailedColumnAnalysis(headers, sampleRows)

  console.log('[Probe] === COLUMN ANALYSIS ===')
  if (projectProfile) {
    console.log(`[Probe] Project context: ${projectProfile.serviceName} (${projectProfile.industry})`)
  }
  Object.entries(columnAnalysis).forEach(([col, analysis]) => {
    console.log(`[Probe] "${col}": ${analysis.type} (${(analysis.confidence * 100).toFixed(0)}%) | samples: ${analysis.sampleValues.slice(0, 2).join(', ')}`)
  })

  // Step 2: Build enriched prompt with project context
  const maskedRows = maskSensitiveData(sampleRows)
  const userPrompt = buildEnrichedPrompt(headers, maskedRows, columnAnalysis, language, projectProfile)

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
    
    console.log('[Probe] === LLM RESULT ===')
    console.log(`[Probe] Date: ${result.dateColumn}`)
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
