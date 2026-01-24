import { google, analyticsadmin_v1beta, analyticsdata_v1beta } from 'googleapis'
import { getOAuth2Client, decryptToken, encryptToken, refreshAccessToken } from './oauth'
import { createServiceClient } from '@/lib/supabase/server'

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

  // 1. Daily KPIs
  const kpisResponse = await analyticsData.properties.runReport({
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

  // 2. Channel Daily
  const channelResponse = await analyticsData.properties.runReport({
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

  // 3. Top Pages Daily
  const pagesResponse = await analyticsData.properties.runReport({
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

  return {
    kpis: kpisResponse.data,
    channels: channelResponse.data,
    pages: pagesResponse.data,
  }
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

  try {
    const data = await getGA4Analytics(
      projectId,
      property.property_id,
      startDateStr,
      endDateStr
    )

    // 1. Daily KPIs upsert
    if (data.kpis.rows) {
      const kpiRows = data.kpis.rows.map(row => ({
        project_id: projectId,
        date: formatGA4Date(row.dimensionValues![0].value!),
        sessions: parseInt(row.metricValues![0].value || '0'),
        active_users: parseInt(row.metricValues![1].value || '0'),
        new_users: parseInt(row.metricValues![2].value || '0'),
        engaged_sessions: parseInt(row.metricValues![3].value || '0'),
        engagement_rate: parseFloat(row.metricValues![4].value || '0'),
        bounce_rate: parseFloat(row.metricValues![5].value || '0'),
        avg_session_duration: parseFloat(row.metricValues![6].value || '0'),
      }))

      await supabase
        .from('mart_ga4_daily_kpis')
        .upsert(kpiRows, { onConflict: 'project_id,date' })
    }

    // 2. Channel Daily upsert
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

      await supabase
        .from('mart_ga4_channel_daily')
        .upsert(channelRows, { onConflict: 'project_id,date,channel_group' })
    }

    // 3. Top Pages Daily upsert (일별 상위 50개만)
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

      await supabase
        .from('mart_ga4_top_pages_daily')
        .upsert(pageRows, { onConflict: 'project_id,date,page_path' })
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

// GA4 날짜 형식(YYYYMMDD) → ISO 날짜(YYYY-MM-DD)
function formatGA4Date(ga4Date: string): string {
  return `${ga4Date.slice(0, 4)}-${ga4Date.slice(4, 6)}-${ga4Date.slice(6, 8)}`
}
