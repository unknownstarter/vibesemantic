/**
 * GA4 Event Schema Detection
 * Detects event schemas (event names, parameters, dimensions) from GA4 property
 * and stores them for intelligent event recommendation based on project purpose
 */

import { google } from 'googleapis'
import { getValidCredentials } from './api'
import { getOAuth2Client } from './oauth'
import { executeGA4Request } from './rate-limiter'
import { createServiceClient } from '@/lib/supabase/server'
import type { ProjectProfile, WorkspacePurpose } from '@/types/database'

export interface EventSchema {
  event_name: string
  event_type: 'standard' | 'custom'
  description?: string
  parameters: Record<string, {
    type: 'string' | 'number' | 'boolean'
    description?: string
    sample_values: string[]
  }>
  common_dimensions: Record<string, {
    type: 'string' | 'number'
    sample_values: string[]
  }>
  priority: number // 1=highest, 5=lowest
  event_count_30d: number
  last_seen_date: string
}

/**
 * Get purpose-specific event priorities
 */
function getPurposeEventPriorities(purpose: WorkspacePurpose): {
  high: string[]
  medium: string[]
  low: string[]
} {
  const priorities: Record<WorkspacePurpose, { high: string[]; medium: string[]; low: string[] }> = {
    product: {
      high: ['page_view', 'screen_view', 'user_engagement', 'session_start', 'first_visit', 'first_open'],
      medium: ['click', 'scroll', 'view_item', 'view_item_list', 'select_item', 'add_to_cart'],
      low: ['app_remove', 'app_clear_data', 'os_update'],
    },
    marketing: {
      high: ['page_view', 'session_start', 'first_visit', 'click', 'view_item', 'purchase'],
      medium: ['sign_up', 'login', 'generate_lead', 'search', 'view_search_results'],
      low: ['app_remove', 'app_clear_data'],
    },
    biz: {
      high: ['purchase', 'sign_up', 'login', 'generate_lead', 'add_payment_info'],
      medium: ['page_view', 'session_start', 'view_item', 'add_to_cart'],
      low: ['app_remove', 'app_clear_data'],
    },
    sales: {
      high: ['generate_lead', 'sign_up', 'purchase', 'add_payment_info', 'begin_checkout'],
      medium: ['page_view', 'click', 'view_item', 'add_to_cart'],
      low: ['app_remove', 'app_clear_data'],
    },
  }

  return priorities[purpose] || priorities.product
}

/**
 * Detect event schemas from GA4 property
 * Analyzes recent event data to infer event parameters and dimensions
 */
export async function detectEventSchemas(
  projectId: string,
  propertyId: string,
  purpose: WorkspacePurpose,
  projectProfile?: ProjectProfile
): Promise<EventSchema[]> {
  const credentials = await getValidCredentials(projectId)
  if (!credentials) throw new Error('No valid GA4 credentials')

  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: credentials.accessToken })

  const analyticsData = google.analyticsdata({
    version: 'v1beta',
    auth: oauth2Client,
  })

  // Get date range (last 30 days)
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - 30)

  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  // 1. Get all events with their counts (to prioritize)
  const eventsResponse = await executeGA4Request(() =>
    analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: startDateStr, endDate: endDateStr }],
        dimensions: [{ name: 'eventName' }],
        metrics: [
          { name: 'eventCount' },
          { name: 'totalUsers' },
        ],
        orderBys: [
          { metric: { metricName: 'eventCount' }, desc: true },
        ],
        limit: '500', // Get top 500 events
      },
    })
  )

  if (!eventsResponse.data.rows || eventsResponse.data.rows.length === 0) {
    console.warn('[Event Schema Detection] No events found')
    return []
  }

  const purposePriorities = getPurposeEventPriorities(purpose)
  const eventSchemas: EventSchema[] = []

  // 2. For each event, get sample data to infer parameters
  // Process in batches to avoid rate limits
  const eventNames = eventsResponse.data.rows.map(row => row.dimensionValues![0].value!)
  const batchSize = 10

  for (let i = 0; i < eventNames.length; i += batchSize) {
    const batch = eventNames.slice(i, i + batchSize)

    await Promise.all(
      batch.map(async (eventName) => {
        try {
          // Get event data with common dimensions to infer schema
          const eventDataResponse = await executeGA4Request(() =>
            analyticsData.properties.runReport({
              property: `properties/${propertyId}`,
              requestBody: {
                dateRanges: [{ startDate: startDateStr, endDate: endDateStr }],
                dimensions: [
                  { name: 'date' },
                  { name: 'eventName' },
                  // Common dimensions that might be used
                  { name: 'country' },
                  { name: 'city' },
                  { name: 'deviceCategory' },
                  { name: 'platform' },
                  { name: 'sessionDefaultChannelGroup' },
                ],
                metrics: [
                  { name: 'eventCount' },
                  { name: 'totalUsers' },
                ],
                dimensionFilter: {
                  filter: {
                    fieldName: 'eventName',
                    stringFilter: {
                      matchType: 'EXACT',
                      value: eventName,
                    },
                  },
                },
                limit: '100', // Sample 100 rows to infer parameters
              },
            })
          )

          const rows = eventDataResponse.data.rows || []
          if (rows.length === 0) return

          // Get event count from first query
          const eventCountRow = eventsResponse.data.rows?.find(r => r.dimensionValues?.[0]?.value === eventName)
          const eventCount = parseInt(eventCountRow?.metricValues?.[0]?.value || '0')
          const lastSeenDate = rows.length > 0 && rows[0].dimensionValues?.[0]?.value 
            ? formatGA4Date(rows[0].dimensionValues[0].value) 
            : endDateStr

          // Determine event type (standard GA4 events vs custom)
          const standardEvents = [
            'page_view', 'screen_view', 'session_start', 'first_visit', 'first_open',
            'user_engagement', 'click', 'scroll', 'view_item', 'view_item_list',
            'select_item', 'add_to_cart', 'remove_from_cart', 'begin_checkout',
            'add_payment_info', 'purchase', 'refund', 'sign_up', 'login', 'search',
            'generate_lead', 'view_promotion', 'select_promotion', 'add_to_wishlist',
            'share', 'app_remove', 'app_clear_data', 'os_update',
          ]
          const eventType = standardEvents.includes(eventName) ? 'standard' : 'custom'

          // Infer parameters from sample data
          // Note: GA4 Data API doesn't directly expose event parameters in aggregated reports
          // We'll need to use BigQuery export or make assumptions based on event name patterns
          const parameters: EventSchema['parameters'] = {}
          const commonDimensions: EventSchema['common_dimensions'] = {}

          // Infer common dimensions from sample data
          if (rows.length > 0) {
            const sampleRow = rows[0]
            // Dimensions: date, eventName, country, city, deviceCategory, platform, sessionDefaultChannelGroup
            if (sampleRow.dimensionValues && sampleRow.dimensionValues.length > 2) {
              const countryValues = new Set<string>()
              const cityValues = new Set<string>()
              const deviceValues = new Set<string>()
              const platformValues = new Set<string>()
              const channelValues = new Set<string>()

              rows.slice(0, 20).forEach(row => {
                if (row.dimensionValues && row.dimensionValues.length > 2) {
                  if (row.dimensionValues[2]?.value) countryValues.add(row.dimensionValues[2].value)
                  if (row.dimensionValues[3]?.value) cityValues.add(row.dimensionValues[3].value)
                  if (row.dimensionValues[4]?.value) deviceValues.add(row.dimensionValues[4].value)
                  if (row.dimensionValues[5]?.value) platformValues.add(row.dimensionValues[5].value)
                  if (row.dimensionValues[6]?.value) channelValues.add(row.dimensionValues[6].value)
                }
              })

              if (countryValues.size > 0) {
                commonDimensions.country = {
                  type: 'string',
                  sample_values: Array.from(countryValues).slice(0, 5),
                }
              }
              if (cityValues.size > 0 && cityValues.size < 100) { // Only if not too many unique values
                commonDimensions.city = {
                  type: 'string',
                  sample_values: Array.from(cityValues).slice(0, 5),
                }
              }
              if (deviceValues.size > 0) {
                commonDimensions.deviceCategory = {
                  type: 'string',
                  sample_values: Array.from(deviceValues).slice(0, 5),
                }
              }
              if (platformValues.size > 0) {
                commonDimensions.platform = {
                  type: 'string',
                  sample_values: Array.from(platformValues).slice(0, 5),
                }
              }
              if (channelValues.size > 0) {
                commonDimensions.channel = {
                  type: 'string',
                  sample_values: Array.from(channelValues).slice(0, 5),
                }
              }
            }
          }

          // Infer parameters based on event name patterns and industry knowledge
          // This is a heuristic - in production, you'd want to use BigQuery export for accurate parameter detection
          if (eventName.includes('purchase') || eventName.includes('transaction')) {
            parameters.value = { type: 'number', description: 'Transaction value', sample_values: [] }
            parameters.currency = { type: 'string', description: 'Currency code', sample_values: ['USD', 'KRW'] }
            parameters.items = { type: 'string', description: 'Items purchased', sample_values: [] }
          }
          if (eventName.includes('view_item') || eventName.includes('view_product')) {
            parameters.item_id = { type: 'string', description: 'Item ID', sample_values: [] }
            parameters.item_name = { type: 'string', description: 'Item name', sample_values: [] }
            parameters.item_category = { type: 'string', description: 'Item category', sample_values: [] }
          }
          if (eventName.includes('sign_up') || eventName.includes('signup')) {
            parameters.method = { type: 'string', description: 'Sign-up method', sample_values: ['email', 'google', 'facebook'] }
          }
          if (eventName.includes('click') || eventName.includes('button_click')) {
            parameters.button_text = { type: 'string', description: 'Button text', sample_values: [] }
            parameters.button_id = { type: 'string', description: 'Button ID', sample_values: [] }
          }

          // Determine priority based on purpose and event count
          let priority = 3 // Default medium
          if (purposePriorities.high.includes(eventName)) {
            priority = 1
          } else if (purposePriorities.medium.includes(eventName)) {
            priority = 2
          } else if (purposePriorities.low.includes(eventName)) {
            priority = 5
          } else if (eventCount > 10000) {
            priority = 2 // High volume events get higher priority
          } else if (eventCount < 100) {
            priority = 4 // Low volume events get lower priority
          }

          // Generate description based on event name and type
          let description: string | undefined
          if (eventType === 'standard') {
            const descriptions: Record<string, string> = {
              page_view: '사용자가 페이지를 조회한 이벤트',
              screen_view: '사용자가 화면을 조회한 이벤트',
              session_start: '새 세션이 시작된 이벤트',
              first_visit: '사용자의 첫 방문',
              first_open: '앱의 첫 실행',
              user_engagement: '사용자 참여 이벤트',
              click: '클릭 이벤트',
              scroll: '스크롤 이벤트',
              purchase: '구매 완료 이벤트',
              sign_up: '회원가입 이벤트',
              login: '로그인 이벤트',
              generate_lead: '리드 생성 이벤트',
            }
            description = descriptions[eventName] || `${eventName} 이벤트`
          } else {
            description = `커스텀 이벤트: ${eventName}`
          }

          eventSchemas.push({
            event_name: eventName,
            event_type: eventType,
            description,
            parameters,
            common_dimensions: commonDimensions,
            priority,
            event_count_30d: eventCount,
            last_seen_date: lastSeenDate,
          })
        } catch (error) {
          console.error(`[Event Schema Detection] Error processing event ${eventName}:`, error)
          // Continue with other events
        }
      })
    )

    // Rate limiting: wait between batches
    if (i + batchSize < eventNames.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return eventSchemas
}

/**
 * Save detected event schemas to database
 */
export async function saveEventSchemas(
  projectId: string,
  propertyId: string,
  schemas: EventSchema[]
): Promise<void> {
  const supabase = createServiceClient()

  // Delete existing schemas for this property
  await supabase
    .from('ga4_event_schemas')
    .delete()
    .eq('project_id', projectId)
    .eq('property_id', propertyId)

  // Insert new schemas
  if (schemas.length > 0) {
    const inserts = schemas.map(schema => ({
      project_id: projectId,
      property_id: propertyId,
      event_name: schema.event_name,
      event_type: schema.event_type,
      description: schema.description,
      parameters: schema.parameters,
      common_dimensions: schema.common_dimensions,
      priority: schema.priority,
      is_active: true,
      last_seen_date: schema.last_seen_date,
      event_count_30d: schema.event_count_30d,
    }))

    const { error } = await supabase
      .from('ga4_event_schemas')
      .insert(inserts)

    if (error) {
      console.error('[Event Schema Save] Error:', error)
      throw error
    }

    console.log(`[Event Schema Save] Saved ${schemas.length} event schemas for property ${propertyId}`)
  }
}

/**
 * Get recommended events for a project based on purpose
 */
export async function getRecommendedEvents(
  projectId: string,
  propertyId: string,
  purpose: WorkspacePurpose
): Promise<EventSchema[]> {
  const supabase = createServiceClient()

  const { data: schemas, error } = await supabase
    .from('ga4_event_schemas')
    .select('*')
    .eq('project_id', projectId)
    .eq('property_id', propertyId)
    .eq('is_active', true)
    .order('priority', { ascending: true })
    .order('event_count_30d', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[Get Recommended Events] Error:', error)
    return []
  }

  return (schemas || []).map(s => ({
    event_name: s.event_name,
    event_type: s.event_type as 'standard' | 'custom',
    description: s.description || undefined,
    parameters: (s.parameters as EventSchema['parameters']) || {},
    common_dimensions: (s.common_dimensions as EventSchema['common_dimensions']) || {},
    priority: s.priority,
    event_count_30d: s.event_count_30d,
    last_seen_date: s.last_seen_date || '',
  }))
}

// Helper function
function formatGA4Date(ga4Date: string): string {
  return `${ga4Date.slice(0, 4)}-${ga4Date.slice(4, 6)}-${ga4Date.slice(6, 8)}`
}
