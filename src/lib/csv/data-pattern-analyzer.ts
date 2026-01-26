/**
 * Data Pattern Analyzer
 * Analyzes actual data values (not just headers) to determine column classification
 */

import type { ColumnAnalysis } from './parser'

export interface DataPatternAnalysis {
  isEventName: boolean // e.g., "view_section", "user_engagement"
  isEventCount: boolean // numeric values that look like event counts
  isUserCount: boolean // numeric values that look like user counts
  isRevenue: boolean // numeric values that look like revenue
  isEventsPerUser: boolean // calculated ratio values
  isDimension: boolean // categorical values (low uniqueness, text)
  isMetric: boolean // numeric values that should be metrics
  confidence: number // 0-1
  suggestedType: 'metric' | 'dimension' | 'unknown'
  suggestedAggregation?: 'sum' | 'avg'
  needsConfirmation: boolean // if uncertain, needs user confirmation
}

/**
 * Analyze data values to detect patterns
 */
export function analyzeDataPatterns(
  header: string,
  columnIndex: number,
  allRows: string[][],
  columnAnalysis: ColumnAnalysis
): DataPatternAnalysis {
  // Extract actual values from this column
  const values = allRows
    .map(row => row[columnIndex]?.trim())
    .filter(v => v && v.length > 0)
    .slice(0, 100) // Analyze up to 100 rows for performance

  if (values.length === 0) {
    return {
      isEventName: false,
      isEventCount: false,
      isUserCount: false,
      isRevenue: false,
      isEventsPerUser: false,
      isDimension: false,
      isMetric: false,
      confidence: 0,
      suggestedType: 'unknown',
      needsConfirmation: true,
    }
  }

  const sampleValues = values.slice(0, 10)
  const uniqueValues = new Set(values)
  const uniqueRatio = uniqueValues.size / values.length

  // === EVENT NAME DETECTION ===
  // Event names are typically: snake_case, camelCase, or kebab-case
  // Examples: "view_section", "user_engagement", "page_view", "session_start", "click", "scroll"
  // Also check if header contains "이벤트 이름" or "event name"
  const headerLower = header.toLowerCase()
  const headerSuggestsEventName = /이벤트.*이름|event.*name|event_name/i.test(header)
  
  // Pattern 1: snake_case or kebab-case (view_section, page-view)
  const snakeCasePattern = /^[a-z][a-z0-9_\-]+$/i
  // Pattern 2: camelCase (viewSection, pageView)
  const camelCasePattern = /^[a-z][a-zA-Z0-9]*$/
  // Pattern 3: simple lowercase words (click, scroll, view)
  const simpleWordPattern = /^[a-z][a-z0-9]*$/i
  
  const eventNameMatches = sampleValues.filter(v => {
    const trimmed = v.trim()
    if (trimmed.length === 0) return false
    
    // Check various event name patterns
    return (snakeCasePattern.test(trimmed) && (trimmed.includes('_') || trimmed.includes('-'))) ||
           camelCasePattern.test(trimmed) ||
           (simpleWordPattern.test(trimmed) && trimmed.length > 2 && trimmed.length < 30)
  })
  
  const looksLikeEventName = eventNameMatches.length >= Math.max(1, sampleValues.length * 0.6) // 60% 이상 매칭
  const isEventName = (looksLikeEventName || headerSuggestsEventName) && 
                      uniqueRatio > 0.2 && uniqueRatio < 0.95 && // 적당한 uniqueness
                      columnAnalysis.type === 'string' // 텍스트 타입이어야 함

  // === EVENT COUNT DETECTION ===
  // Event counts are integers, usually > 0, moderate values
  const isNumeric = columnAnalysis.type === 'number' || columnAnalysis.type === 'currency'
  const numericValues = values
    .map(v => {
      // Remove currency symbols and commas
      const cleaned = v.replace(/[$€¥₩£,\s]/g, '')
      return parseFloat(cleaned)
    })
    .filter(n => !isNaN(n) && isFinite(n))
  
  // Check if values look like event counts (integers, positive, reasonable range)
  const integerCount = numericValues.filter(n => Number.isInteger(n) || Math.abs(n % 1) < 0.01).length
  const isMostlyIntegers = numericValues.length > 0 && integerCount / numericValues.length >= 0.8
  
  // Also check if header suggests event count
  const headerSuggestsEventCount = /이벤트.*수|event.*count|event_count/i.test(header)
  
  const isEventCount = isNumeric && 
    numericValues.length > 0 &&
    numericValues.every(n => n >= 0 && n < 1000000) && // reasonable range
    numericValues.some(n => n > 0) && // at least some non-zero
    (uniqueRatio < 0.8 || headerSuggestsEventCount) && // not too unique (counts can repeat) OR header suggests it
    (isMostlyIntegers || headerSuggestsEventCount) // mostly integers OR header suggests it

  // === USER COUNT DETECTION ===
  // User counts are integers, usually smaller than event counts
  const headerSuggestsUserCount = /총.*사용자|total.*user|active.*user|사용자.*수/i.test(header)
  
  const isUserCount = isNumeric &&
    numericValues.length > 0 &&
    numericValues.every(n => n >= 0 && n < 100000) && // smaller range
    numericValues.some(n => n > 0) &&
    (uniqueRatio < 0.7 || headerSuggestsUserCount) && // not too unique OR header suggests it
    (isMostlyIntegers || headerSuggestsUserCount) // mostly integers OR header suggests it

  // === REVENUE DETECTION ===
  // Revenue can be currency or numbers, often with decimals
  const headerSuggestsRevenue = /총.*수익|total.*revenue|revenue|수익|매출/i.test(header)
  
  const isRevenue = ((columnAnalysis.type === 'currency' || headerSuggestsRevenue) || 
    (isNumeric && numericValues.some(n => n > 100))) && // revenue usually > 100 OR header suggests it
    numericValues.length > 0

  // === EVENTS PER USER DETECTION ===
  // Calculated ratios, usually decimals between 0-100
  const headerSuggestsEventsPerUser = /활성.*사용자당.*이벤트|events?.*per.*user|events?.*per.*active/i.test(header)
  
  const isEventsPerUser = isNumeric &&
    numericValues.length > 0 &&
    numericValues.every(n => n >= 0 && n < 1000) && // reasonable ratio range
    (numericValues.some(n => n !== Math.floor(n)) || headerSuggestsEventsPerUser) && // has decimals OR header suggests it
    (uniqueRatio > 0.5 || headerSuggestsEventsPerUser) // more unique (calculated values) OR header suggests it

  // === DIMENSION DETECTION ===
  // Text columns with moderate uniqueness (categorical)
  const isDimension = columnAnalysis.type === 'string' &&
    !isEventName && // event names are handled separately
    uniqueRatio > 0.1 && uniqueRatio < 0.9 && // not too unique, not too repetitive
    values.every(v => v.length < 100) // reasonable length

  // === METRIC DETECTION ===
  // Numeric columns that aren't IDs and aren't already classified
  const isMetric = isNumeric &&
    columnAnalysis.type !== 'id' &&
    !isEventName &&
    !isEventCount &&
    !isUserCount &&
    !isRevenue &&
    !isEventsPerUser &&
    (uniqueRatio < 0.95 || numericValues.length < 10) // not too unique (unless small dataset)

  // Determine suggested type and confidence
  let suggestedType: 'metric' | 'dimension' | 'unknown' = 'unknown'
  let confidence = 0
  let suggestedAggregation: 'sum' | 'avg' | undefined
  let needsConfirmation = false

  if (isEventName) {
    suggestedType = 'dimension'
    confidence = 0.95 // 높은 신뢰도
  } else if (isEventCount) {
    suggestedType = 'metric'
    confidence = 0.9 // 높은 신뢰도
    suggestedAggregation = 'sum'
  } else if (isUserCount) {
    suggestedType = 'metric'
    confidence = 0.9 // 높은 신뢰도
    suggestedAggregation = 'sum'
  } else if (isRevenue) {
    suggestedType = 'metric'
    confidence = 0.9 // 높은 신뢰도
    suggestedAggregation = 'sum'
  } else if (isEventsPerUser) {
    suggestedType = 'metric'
    confidence = 0.9 // 높은 신뢰도
    suggestedAggregation = 'avg'
  } else if (isDimension) {
    suggestedType = 'dimension'
    confidence = 0.75
  } else if (isMetric) {
    suggestedType = 'metric'
    confidence = 0.7
    suggestedAggregation = 'sum' // default to sum for metrics
  } else {
    // Uncertain - needs confirmation
    needsConfirmation = true
    confidence = 0.3
    
    // Try to guess based on type
    if (columnAnalysis.type === 'number' || columnAnalysis.type === 'currency' || columnAnalysis.type === 'percentage') {
      suggestedType = 'metric'
      suggestedAggregation = columnAnalysis.type === 'percentage' ? 'avg' : 'sum'
      confidence = 0.4
    } else if (columnAnalysis.type === 'string') {
      suggestedType = 'dimension'
      confidence = 0.4
    }
  }

  return {
    isEventName,
    isEventCount,
    isUserCount,
    isRevenue,
    isEventsPerUser,
    isDimension,
    isMetric,
    confidence,
    suggestedType,
    suggestedAggregation,
    needsConfirmation,
  }
}
