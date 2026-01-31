import { google, analyticsadmin_v1beta, analyticsdata_v1beta } from 'googleapis'
import { getOAuth2Client, decryptToken, encryptToken, refreshAccessToken } from './oauth'
import { createServiceClient } from '@/lib/supabase/server'
import { executeGA4Request, withRateLimitAndRetry } from './rate-limiter'
import { isSemanticLayerEnabled, isEventCollectionEnabled } from '@/lib/feature-flags'
import type { ProjectProfile, Json } from '@/types/database'

interface GA4Credentials {
  accessToken: string
  refreshToken: string
  tokenExpiresAt: Date
}

// 토큰을 가져오고 필요시 갱신
export async function getValidCredentials(projectId: string): Promise<GA4Credentials | null> {
  const supabase = createServiceClient()
  
  const { data: connection, error } = await supabase
    .from('ga4_connections')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (error || !connection) return null

  const accessToken = decryptToken(connection.access_token_enc)
  const refreshToken = decryptToken(connection.refresh_token_enc)
  const tokenExpiresAt = new Date(connection.token_expires_at)

  // 토큰이 5분 내 만료면 갱신
  if (tokenExpiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    try {
      const newCredentials = await refreshAccessToken(refreshToken)
      
      // DB 업데이트
      await supabase
        .from('ga4_connections')
        .update({
          access_token_enc: encryptToken(newCredentials.access_token!),
          token_expires_at: new Date(newCredentials.expiry_date!).toISOString(),
        })
        .eq('project_id', projectId)

      return {
        accessToken: newCredentials.access_token!,
        refreshToken,
        tokenExpiresAt: new Date(newCredentials.expiry_date!),
      }
    } catch {
      return null
    }
  }

  return { accessToken, refreshToken, tokenExpiresAt }
}

// GA4 Admin API로 Property 목록 가져오기
export async function listGA4Properties(accessToken: string): Promise<analyticsadmin_v1beta.Schema$GoogleAnalyticsAdminV1betaProperty[]> {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const analyticsAdmin = google.analyticsadmin({
    version: 'v1beta',
    auth: oauth2Client,
  })

  const properties: analyticsadmin_v1beta.Schema$GoogleAnalyticsAdminV1betaProperty[] = []

  try {
    // 1. 먼저 접근 가능한 모든 accounts 조회
    const accountsResponse = await analyticsAdmin.accounts.list({
      pageSize: 200,
    })

    const accounts = accountsResponse.data.accounts || []
    console.log(`[GA4] Found ${accounts.length} accounts`)

    // 2. 각 account의 properties 조회
    for (const account of accounts) {
      if (!account.name) continue
      
      let pageToken: string | undefined
      do {
        const response = await analyticsAdmin.properties.list({
          pageSize: 200,
          pageToken,
          filter: `parent:${account.name}`, // e.g., 'parent:accounts/123456'
        })

        if (response.data.properties) {
          properties.push(...response.data.properties)
        }
        pageToken = response.data.nextPageToken ?? undefined
      } while (pageToken)
    }

    console.log(`[GA4] Found ${properties.length} properties total`)
  } catch (error) {
    console.error('[GA4] Error listing properties:', error)
    throw error
  }

  return properties
}

// GA4 Data API로 데이터 조회
export async function getGA4Analytics(
  projectId: string,
  propertyId: string,
  startDate: string,
  endDate: string,
  options?: {
    includeRetention?: boolean
    includeEvents?: boolean
    projectProfile?: ProjectProfile
  }
) {
  const credentials = await getValidCredentials(projectId)
  if (!credentials) throw new Error('No valid GA4 credentials')

  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: credentials.accessToken })

  const analyticsData = google.analyticsdata({
    version: 'v1beta',
    auth: oauth2Client,
  })

  // 1. Daily KPIs (with rate limiting)
  const kpisResponse = await executeGA4Request(() =>
    analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'newUsers' },
          { name: 'engagedSessions' },
          { name: 'engagementRate' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
      },
    })
  )

  // 2. Channel Daily (with rate limiting)
  const channelResponse = await executeGA4Request(() =>
    analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: 'date' },
          { name: 'sessionDefaultChannelGroup' },
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'newUsers' },
          { name: 'engagedSessions' },
        ],
        limit: '10000',
      },
    })
  )

  // 3. Top Pages Daily (with rate limiting)
  const pagesResponse = await executeGA4Request(() =>
    analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [
          { name: 'date' },
          { name: 'pagePath' },
          { name: 'pageTitle' },
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'engagementRate' },
        ],
        orderBys: [
          { dimension: { dimensionName: 'date' } },
          { metric: { metricName: 'screenPageViews' }, desc: true },
        ],
        limit: '10000',
      },
    })
  )

  const result: {
    kpis: analyticsdata_v1beta.Schema$RunReportResponse
    channels: analyticsdata_v1beta.Schema$RunReportResponse
    pages: analyticsdata_v1beta.Schema$RunReportResponse
    retention?: analyticsdata_v1beta.Schema$RunReportResponse
    events?: analyticsdata_v1beta.Schema$RunReportResponse
  } = {
    kpis: kpisResponse.data,
    channels: channelResponse.data,
    pages: pagesResponse.data,
  }

  // 4. Retention Metrics (optional, with rate limiting)
  if (options?.includeRetention) {
    const retentionResponse = await executeGA4Request(() =>
      analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'date' }],
          metrics: [
            { name: 'active1DayUsers' },
            { name: 'active7DayUsers' },
            { name: 'active28DayUsers' },
            { name: 'dauPerMau' },
            { name: 'dauPerWau' },
            { name: 'wauPerMau' },
          ],
        },
      })
    )
    result.retention = retentionResponse.data
  }

  // 5. Event Data (optional, with rate limiting)
  // Include common dimensions for better data mart structure
  if (options?.includeEvents) {
    const eventsResponse = await executeGA4Request(() =>
      analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [
            { name: 'date' },
            { name: 'eventName' },
            { name: 'country' },
            { name: 'city' },
            { name: 'deviceCategory' },
            { name: 'platform' },
            { name: 'sessionDefaultChannelGroup' },
          ],
          metrics: [
            { name: 'eventCount' },
            { name: 'totalUsers' },
            { name: 'eventsPerSession' },
          ],
          orderBys: [
            { dimension: { dimensionName: 'date' } },
            { metric: { metricName: 'eventCount' }, desc: true },
          ],
          limit: '10000',
        },
      })
    )
    result.events = eventsResponse.data
  }

  return result
}

// Retention 메트릭만 별도로 조회 (비동기 수집용)
export async function getGA4RetentionMetrics(
  projectId: string,
  propertyId: string,
  startDate: string,
  endDate: string
) {
  const credentials = await getValidCredentials(projectId)
  if (!credentials) throw new Error('No valid GA4 credentials')

  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: credentials.accessToken })

  const analyticsData = google.analyticsdata({
    version: 'v1beta',
    auth: oauth2Client,
  })

  const response = await executeGA4Request(() =>
    analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'active1DayUsers' },
          { name: 'active7DayUsers' },
          { name: 'active28DayUsers' },
          { name: 'dauPerMau' },
          { name: 'dauPerWau' },
          { name: 'wauPerMau' },
        ],
      },
    })
  )

  return response.data
}

// Event 데이터만 별도로 조회 (비동기 수집용)
// Now includes common dimensions for better data mart structure
export async function getGA4EventData(
  projectId: string,
  propertyId: string,
  startDate: string,
  endDate: string,
  eventNames?: string[],
  includeDimensions: boolean = true
) {
  const credentials = await getValidCredentials(projectId)
  if (!credentials) throw new Error('No valid GA4 credentials')

  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: credentials.accessToken })

  const analyticsData = google.analyticsdata({
    version: 'v1beta',
    auth: oauth2Client,
  })

  // Build filter for specific events if provided
  const dimensionFilter = eventNames?.length
    ? {
        filter: {
          fieldName: 'eventName',
          inListFilter: {
            values: eventNames,
          },
        },
      }
    : undefined

  // Include common dimensions for better data mart structure
  // Note: pagePath and pageTitle are only available for page_view events,
  // so we exclude them from general event queries to avoid API errors
  const dimensions = includeDimensions
    ? [
        { name: 'date' },
        { name: 'eventName' },
        { name: 'country' },
        { name: 'city' },
        { name: 'deviceCategory' },
        { name: 'platform' },
        { name: 'sessionDefaultChannelGroup' },
        // pagePath and pageTitle are event-specific and may cause errors
        // They should be queried separately for page_view events only
      ]
    : [
        { name: 'date' },
        { name: 'eventName' },
      ]

  const response = await executeGA4Request(() =>
    analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions,
        metrics: [
          { name: 'eventCount' },
          { name: 'totalUsers' },
          { name: 'eventsPerSession' },
        ],
        dimensionFilter,
        orderBys: [
          { dimension: { dimensionName: 'date' } },
          { metric: { metricName: 'eventCount' }, desc: true },
        ],
        limit: '10000',
      },
    })
  )

  return response.data
}

// GA4 데이터를 Mart 테이블에 저장
export async function refreshMartData(
  projectId: string,
  range: '7d' | '30d'
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()

  // 선택된 property 가져오기
  const { data: property, error: propError } = await supabase
    .from('ga4_properties')
    .select('property_id')
    .eq('project_id', projectId)
    .eq('is_selected', true)
    .single()

  if (propError || !property) {
    return { success: false, error: 'No GA4 property selected' }
  }

  // 날짜 범위 계산
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - (range === '7d' ? 7 : 30))

  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  // Feature flags 확인
  const [semanticEnabled, eventsEnabled] = await Promise.all([
    isSemanticLayerEnabled(projectId),
    isEventCollectionEnabled(projectId),
  ])

  try {
    const data = await getGA4Analytics(
      projectId,
      property.property_id,
      startDateStr,
      endDateStr,
      {
        includeRetention: semanticEnabled,
        includeEvents: eventsEnabled,
      }
    )

    // schema_version for Staging (GA4: from ga4_event_schemas or default 1)
    const { data: schemaRow } = await supabase
      .from('ga4_event_schemas')
      .select('schema_version')
      .eq('project_id', projectId)
      .limit(1)
      .single()
    const schemaVersion = schemaRow?.schema_version ?? 1

    // 1. Staging: daily_kpis → then Mart
    if (data.kpis.rows) {
      // Build retention data map for merging
      const retentionMap = new Map<string, {
        active_1day_users: number
        active_7day_users: number
        active_28day_users: number
        dau_per_mau: number
        dau_per_wau: number
        wau_per_mau: number
      }>()

      if (data.retention?.rows) {
        for (const row of data.retention.rows) {
          const date = formatGA4Date(row.dimensionValues![0].value!)
          retentionMap.set(date, {
            active_1day_users: parseInt(row.metricValues![0].value || '0'),
            active_7day_users: parseInt(row.metricValues![1].value || '0'),
            active_28day_users: parseInt(row.metricValues![2].value || '0'),
            dau_per_mau: parseFloat(row.metricValues![3].value || '0'),
            dau_per_wau: parseFloat(row.metricValues![4].value || '0'),
            wau_per_mau: parseFloat(row.metricValues![5].value || '0'),
          })
        }
      }

      const kpiRows = data.kpis.rows.map(row => {
        const date = formatGA4Date(row.dimensionValues![0].value!)
        const retention = retentionMap.get(date)

        return {
          project_id: projectId,
          date,
          sessions: parseInt(row.metricValues![0].value || '0'),
          active_users: parseInt(row.metricValues![1].value || '0'),
          new_users: parseInt(row.metricValues![2].value || '0'),
          engaged_sessions: parseInt(row.metricValues![3].value || '0'),
          engagement_rate: parseFloat(row.metricValues![4].value || '0'),
          bounce_rate: parseFloat(row.metricValues![5].value || '0'),
          avg_session_duration: parseFloat(row.metricValues![6].value || '0'),
          // Retention metrics (null if not fetched)
          ...(retention ?? {}),
        }
      })

      await supabase.from('staging_ga4_raw').insert({
        project_id: projectId,
        schema_version: schemaVersion,
        report_type: 'daily_kpis',
        payload: kpiRows,
      })
      await supabase
        .from('mart_ga4_daily_kpis')
        .upsert(kpiRows, { onConflict: 'project_id,date' })
    }

    // 2. Staging: channel_daily → then Mart
    if (data.channels.rows) {
      const channelRows = data.channels.rows.map(row => ({
        project_id: projectId,
        date: formatGA4Date(row.dimensionValues![0].value!),
        channel_group: row.dimensionValues![1].value || 'Unknown',
        sessions: parseInt(row.metricValues![0].value || '0'),
        active_users: parseInt(row.metricValues![1].value || '0'),
        new_users: parseInt(row.metricValues![2].value || '0'),
        engaged_sessions: parseInt(row.metricValues![3].value || '0'),
      }))

      await supabase.from('staging_ga4_raw').insert({
        project_id: projectId,
        schema_version: schemaVersion,
        report_type: 'channel_daily',
        payload: channelRows,
      })
      await supabase
        .from('mart_ga4_channel_daily')
        .upsert(channelRows, { onConflict: 'project_id,date,channel_group' })
    }

    // 3. Staging: top_pages_daily → then Mart (일별 상위 50개만)
    if (data.pages.rows) {
      // 날짜별로 그룹화 후 상위 50개만
      const pagesByDate = new Map<string, typeof data.pages.rows>()
      for (const row of data.pages.rows) {
        const date = row.dimensionValues![0].value!
        if (!pagesByDate.has(date)) {
          pagesByDate.set(date, [])
        }
        const pages = pagesByDate.get(date)!
        if (pages.length < 50) {
          pages.push(row)
        }
      }

      const pageRows = Array.from(pagesByDate.values())
        .flat()
        .map(row => ({
          project_id: projectId,
          date: formatGA4Date(row.dimensionValues![0].value!),
          page_path: row.dimensionValues![1].value || '/',
          page_title: row.dimensionValues![2].value || null,
          sessions: parseInt(row.metricValues![0].value || '0'),
          active_users: parseInt(row.metricValues![1].value || '0'),
          screen_page_views: parseInt(row.metricValues![2].value || '0'),
          engagement_rate: parseFloat(row.metricValues![3].value || '0'),
        }))

      await supabase.from('staging_ga4_raw').insert({
        project_id: projectId,
        schema_version: schemaVersion,
        report_type: 'top_pages_daily',
        payload: pageRows,
      })
      await supabase
        .from('mart_ga4_top_pages_daily')
        .upsert(pageRows, { onConflict: 'project_id,date,page_path' })
    }

    // 4. Staging: events → then Mart (if enabled)
    // Now includes dimensions for better data mart structure
    if (data.events?.rows && eventsEnabled) {
      const eventRows = data.events.rows.map(row => {
        const dimensionValues = row.dimensionValues || []
        const date = formatGA4Date(dimensionValues[0]?.value || '')
        const eventName = dimensionValues[1]?.value || 'unknown'

        // Build dimensions object from available dimension values
        // Dimensions order from getGA4Analytics (includeEvents=true):
        // date, eventName, country, deviceCategory, platform, sessionDefaultChannelGroup
        // Note: getGA4Analytics uses different dimension set than getGA4EventData
        const dimensions: Record<string, string> = {}
        if (dimensionValues.length > 2) {
          const dimensionNames = ['country', 'deviceCategory', 'platform', 'channel']
          dimensionValues.slice(2).forEach((dim, idx) => {
            if (dim?.value && dimensionNames[idx]) {
              // Map sessionDefaultChannelGroup to 'channel' for consistency
              const key = idx === 3 ? 'channel' : dimensionNames[idx]
              dimensions[key] = dim.value
            }
          })
        }

        // Event params would need BigQuery export for accurate detection
        // For now, we'll infer from event schemas if available
        const eventParams: Record<string, unknown> = {}

        return {
          project_id: projectId,
          source: 'ga4',
          date,
          event_name: eventName,
          event_count: parseInt(row.metricValues![0].value || '0'),
          unique_users: parseInt(row.metricValues![1].value || '0'),
          events_per_user: parseFloat(row.metricValues![2].value || '0'),
          dimensions: dimensions as Json,
          event_params: eventParams as Json,
        }
      })

      await supabase.from('staging_ga4_raw').insert({
        project_id: projectId,
        schema_version: schemaVersion,
        report_type: 'events',
        payload: eventRows,
      })
      await supabase
        .from('mart_events')
        .upsert(eventRows, { onConflict: 'project_id,source,date,event_name,dimensions' })
    }

    // Project status 및 data_refreshed_at 업데이트
    const { data: project } = await supabase
      .from('projects')
      .select('setup_status')
      .eq('id', projectId)
      .single()

    const updateData: Record<string, unknown> = {
      data_refreshed_at: new Date().toISOString(),
    }

    if (project?.setup_status === 'ga4_ready') {
      updateData.setup_status = 'ready'
    }

    await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)

    return { success: true }
  } catch (error) {
    console.error('GA4 data refresh error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// 비동기로 Event 데이터만 수집 (백그라운드 작업용)
export async function refreshEventDataAsync(
  projectId: string,
  range: '7d' | '30d'
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()

  // 선택된 property 가져오기
  const { data: property, error: propError } = await supabase
    .from('ga4_properties')
    .select('property_id')
    .eq('project_id', projectId)
    .eq('is_selected', true)
    .single()

  if (propError || !property) {
    return { success: false, error: 'No GA4 property selected' }
  }

  // 날짜 범위 계산
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - (range === '7d' ? 7 : 30))

  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  try {
    const eventsData = await getGA4EventData(
      projectId,
      property.property_id,
      startDateStr,
      endDateStr
    )

    if (eventsData.rows) {
      const eventRows = eventsData.rows.map(row => {
        const dimensionValues = row.dimensionValues || []
        const date = formatGA4Date(dimensionValues[0]?.value || '')
        const eventName = dimensionValues[1]?.value || 'unknown'

        // Build dimensions object from available dimension values
        // Dimensions order depends on includeDimensions flag:
        // If true: date, eventName, country, city, deviceCategory, platform, channel
        // If false: date, eventName
        const dimensions: Record<string, string> = {}
        if (dimensionValues.length > 2) {
          // Map dimensions based on actual structure from getGA4EventData
          const dimensionNames = ['country', 'city', 'deviceCategory', 'platform', 'channel']
          dimensionValues.slice(2).forEach((dim, idx) => {
            if (dim?.value && dimensionNames[idx]) {
              dimensions[dimensionNames[idx]] = dim.value
            }
          })
        }

        // Event params would need BigQuery export for accurate detection
        const eventParams: Record<string, unknown> = {}

        return {
          project_id: projectId,
          source: 'ga4',
          date,
          event_name: eventName,
          event_count: parseInt(row.metricValues![0].value || '0'),
          unique_users: parseInt(row.metricValues![1].value || '0'),
          events_per_user: parseFloat(row.metricValues![2].value || '0'),
          dimensions: dimensions as Json,
          event_params: eventParams as Json,
        }
      })

      await supabase
        .from('mart_events')
        .upsert(eventRows, { onConflict: 'project_id,source,date,event_name,dimensions' })
    }

    return { success: true }
  } catch (error) {
    console.error('GA4 event data refresh error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Retention 메트릭만 비동기로 수집 (백그라운드 작업용)
export async function refreshRetentionDataAsync(
  projectId: string,
  range: '7d' | '30d'
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()

  // 선택된 property 가져오기
  const { data: property, error: propError } = await supabase
    .from('ga4_properties')
    .select('property_id')
    .eq('project_id', projectId)
    .eq('is_selected', true)
    .single()

  if (propError || !property) {
    return { success: false, error: 'No GA4 property selected' }
  }

  // 날짜 범위 계산
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - (range === '7d' ? 7 : 30))

  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  try {
    const retentionData = await getGA4RetentionMetrics(
      projectId,
      property.property_id,
      startDateStr,
      endDateStr
    )

    if (retentionData.rows) {
      const retentionUpdates = retentionData.rows.map(row => ({
        project_id: projectId,
        date: formatGA4Date(row.dimensionValues![0].value!),
        active_1day_users: parseInt(row.metricValues![0].value || '0'),
        active_7day_users: parseInt(row.metricValues![1].value || '0'),
        active_28day_users: parseInt(row.metricValues![2].value || '0'),
        dau_per_mau: parseFloat(row.metricValues![3].value || '0'),
        dau_per_wau: parseFloat(row.metricValues![4].value || '0'),
        wau_per_mau: parseFloat(row.metricValues![5].value || '0'),
      }))

      // Update existing rows with retention data
      for (const update of retentionUpdates) {
        await supabase
          .from('mart_ga4_daily_kpis')
          .update({
            active_1day_users: update.active_1day_users,
            active_7day_users: update.active_7day_users,
            active_28day_users: update.active_28day_users,
            dau_per_mau: update.dau_per_mau,
            dau_per_wau: update.dau_per_wau,
            wau_per_mau: update.wau_per_mau,
          })
          .eq('project_id', update.project_id)
          .eq('date', update.date)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('GA4 retention data refresh error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// GA4 날짜 형식(YYYYMMDD) → ISO 날짜(YYYY-MM-DD)
function formatGA4Date(ga4Date: string): string {
  return `${ga4Date.slice(0, 4)}-${ga4Date.slice(4, 6)}-${ga4Date.slice(6, 8)}`
}
