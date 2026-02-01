/**
 * CSV 파이프라인 검증 스크립트
 * 1) 로컬: 여러 CSV 픽스처를 컬럼명 무관하게 검증 (날짜 1개 + 수치 메트릭 N개)
 * 2) API (선택): 업로드 → Probe → Confirm → Ingest → 리포트/채팅 검증
 *
 * 사용법:
 *   npm run verify-csv
 *   FIXTURE=revenue_daily.csv npm run verify-csv   # API 시 특정 픽스처만
 *   BASE_URL=... PROJECT_ID=... WORKSPACE_ID=... AUTH_COOKIE=... npm run verify-csv
 */

import * as fs from 'fs'
import * as path from 'path'

const FIXTURES_DIR = path.join(__dirname, 'fixtures')
const FIXTURE_FILES = [
  'myleads_simple.csv',
  'revenue_daily.csv',
  'traffic_weekly.csv',
  'kpi_monthly.csv',
  'segments_no_date.csv', // 날짜 컬럼 없음 — 집계 데이터
]
const DEFAULT_API_FIXTURE = 'myleads_simple.csv'

const BASE_URL = process.env.BASE_URL || ''
const PROJECT_ID = process.env.PROJECT_ID || ''
const WORKSPACE_ID = process.env.WORKSPACE_ID || ''
const AUTH_COOKIE = process.env.AUTH_COOKIE || ''
const FIXTURE_ENV = process.env.FIXTURE || DEFAULT_API_FIXTURE

interface ValidationResult {
  ok: boolean
  headers?: string[]
  rowCount?: number
  dateCol?: string
  metricCols?: string[]
  errors: string[]
}

/** 날짜 패턴: YYYY-MM-DD, YYYY/MM/DD, YYYY-MM, YYYYMMDD 등 */
function looksLikeDate(value: string): boolean {
  const v = value.trim()
  return (
    /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(v) ||
    /^\d{4}\/\d{2}\/\d{2}$/.test(v) ||
    /^\d{4}-\d{2}$/.test(v) ||
    /^\d{8}$/.test(v) ||
    /^\d{4}\.\d{2}\.\d{2}$/.test(v)
  )
}

function isNumeric(value: string): boolean {
  const cleaned = value.replace(/[$€¥₩£,\s]/g, '').replace(/%$/, '')
  const n = parseFloat(cleaned)
  return cleaned !== '' && !Number.isNaN(n) && isFinite(n)
}

/**
 * 컬럼명에 무관하게 CSV 구조 검증.
 * - 수치 메트릭 1개 이상 필수.
 * - 날짜 컬럼은 선택(없으면 집계 데이터로 간주).
 */
function validateCsvFile(filePath: string): ValidationResult {
  const errors: string[] = []
  if (!fs.existsSync(filePath)) {
    return { ok: false, errors: [`File not found: ${filePath}`] }
  }
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) {
    return { ok: false, errors: ['CSV must have header + at least one data row'] }
  }
  const headers = lines[0].split(',').map((h) => h.trim()).filter(Boolean)
  if (headers.length < 2) {
    return { ok: false, errors: ['At least 2 columns required'] }
  }
  const rowCount = lines.length - 1
  if (rowCount < 2) {
    errors.push(`At least 2 data rows required, got ${rowCount}`)
  }

  const dataRows = lines.slice(1).map((line) => line.split(',').map((c) => c.trim()))
  let dateColIndex = -1
  const metricIndices: number[] = []

  for (let colIdx = 0; colIdx < headers.length; colIdx++) {
    const values = dataRows.map((r) => r[colIdx] ?? '').filter((v) => v.length > 0)
    if (values.length === 0) continue
    const dateLike = values.filter(looksLikeDate).length
    const numericLike = values.filter(isNumeric).length
    if (dateLike / values.length >= 0.5) {
      if (dateColIndex >= 0) errors.push(`Multiple date-like columns (${headers[dateColIndex]}, ${headers[colIdx]})`)
      else dateColIndex = colIdx
    } else if (numericLike / values.length >= 0.5) {
      metricIndices.push(colIdx)
    }
  }

  // 날짜 컬럼 없음 허용 (집계 데이터). 메트릭은 필수.
  if (metricIndices.length === 0) {
    errors.push('No numeric metric column found')
  }

  const dateCol = dateColIndex >= 0 ? headers[dateColIndex] : undefined
  const metricCols = metricIndices.map((i) => headers[i])

  return {
    ok: errors.length === 0,
    headers,
    rowCount,
    dateCol,
    metricCols,
    errors,
  }
}

async function api(
  method: string,
  url: string,
  body?: unknown,
  contentType?: string
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const headers: Record<string, string> = {}
  if (AUTH_COOKIE) headers['Cookie'] = AUTH_COOKIE
  if (body instanceof FormData) {
    // Do not set Content-Type; fetch will set multipart/form-data with boundary
  } else if (contentType) {
    headers['Content-Type'] = contentType
  } else if (body != null && typeof body === 'object') {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(url, {
    method,
    headers,
    body:
      body instanceof FormData
        ? body
        : body != null && typeof body === 'object' && !(body instanceof FormData)
          ? JSON.stringify(body)
          : undefined,
  })
  let data: unknown
  try {
    data = await res.json()
  } catch {
    data = await res.text()
  }
  return { ok: res.ok, status: res.status, data }
}

async function runApiFlow(fixtureFileName: string): Promise<{ ok: boolean; steps: string[]; error?: string }> {
  const steps: string[] = []
  if (!BASE_URL || !PROJECT_ID || !WORKSPACE_ID || !AUTH_COOKIE) {
    return {
      ok: false,
      steps: [],
      error: 'Set BASE_URL, PROJECT_ID, WORKSPACE_ID, AUTH_COOKIE to run API flow',
    }
  }

  const fixturePath = path.join(FIXTURES_DIR, fixtureFileName)
  if (!fs.existsSync(fixturePath)) {
    return { ok: false, steps: [], error: `Fixture not found: ${fixturePath}` }
  }

  const base = BASE_URL.replace(/\/$/, '')
  const projectSlug = PROJECT_ID
  const workspaceSlug = WORKSPACE_ID

  // 1) Create dataset
  const createRes = await api('POST', `${base}/api/projects/${projectSlug}/csv/datasets`, {
    name: `verify-${fixtureFileName.replace('.csv', '')}`,
    purpose: 'marketing',
  })
  if (!createRes.ok) {
    return { ok: false, steps: ['Create dataset'], error: String(createRes.data) }
  }
  const datasetId = (createRes.data as { dataset?: { id: string } })?.dataset?.id
  if (!datasetId) {
    return { ok: false, steps: ['Create dataset'], error: 'No dataset id in response' }
  }
  steps.push('Create dataset OK')

  // 2) Upload CSV
  const csvContent = fs.readFileSync(fixturePath)
  const form = new FormData()
  form.append('files', new Blob([csvContent], { type: 'text/csv' }), fixtureFileName)
  const uploadRes = await api('POST', `${base}/api/projects/${projectSlug}/csv/datasets/${datasetId}/upload`, form)
  if (!uploadRes.ok) {
    return { ok: false, steps, error: `Upload: ${JSON.stringify(uploadRes.data)}` }
  }
  steps.push('Upload CSV OK')

  // 3) Probe
  const probeRes = await api('POST', `${base}/api/projects/${projectSlug}/csv/datasets/${datasetId}/probe`, {
    language: 'ko',
  })
  if (!probeRes.ok) {
    return { ok: false, steps, error: `Probe: ${JSON.stringify(probeRes.data)}` }
  }
  const mapping = probeRes.data as { mapping?: { dateColumn?: string; metricColumns?: unknown[] } }
  const dateCol = mapping.mapping?.dateColumn
  const metricCols = mapping.mapping?.metricColumns as { name: string }[] | undefined
  if (!dateCol && !metricCols?.length) {
    return { ok: false, steps, error: 'Probe did not return dateColumn or metricColumns' }
  }
  steps.push(`Probe OK (date: ${dateCol ?? 'null'}, metrics: ${metricCols?.map((m) => m.name).join(', ') ?? '[]'})`)

  // 4) Confirm
  const confirmRes = await api('POST', `${base}/api/projects/${projectSlug}/csv/datasets/${datasetId}/confirm`, {})
  if (!confirmRes.ok) {
    return { ok: false, steps, error: `Confirm: ${JSON.stringify(confirmRes.data)}` }
  }
  steps.push('Confirm OK')

  // 5) Ingest
  const ingestRes = await api('POST', `${base}/api/projects/${projectSlug}/csv/datasets/${datasetId}/ingest?range=30d`, {})
  if (!ingestRes.ok) {
    return { ok: false, steps, error: `Ingest: ${JSON.stringify(ingestRes.data)}` }
  }
  steps.push('Ingest OK')

  // 6) Report
  const reportRes = await api('POST', `${base}/api/workspaces/${workspaceSlug}/agent`, {
    mode: 'report',
    range: '7d',
    language: 'ko',
  })
  if (!reportRes.ok) {
    return { ok: false, steps, error: `Report: ${JSON.stringify(reportRes.data)}` }
  }
  const reportData = reportRes.data as {
    analysisMarkdown?: string
    martSummary?: { dataSources?: { ga4?: { available?: boolean }; csv?: { available?: boolean } } }
  }
  const md = reportData.analysisMarkdown || ''
  const ds = reportData.martSummary?.dataSources
  const hasCsv = ds?.csv?.available === true
  const hasGa4 = ds?.ga4?.available === true
  if (!hasCsv) {
    return { ok: false, steps, error: 'Report martSummary.dataSources.csv.available is not true' }
  }
  if (md.includes('유기적 검색') && !hasGa4) {
    return { ok: false, steps, error: 'Report contains "유기적 검색" but GA4 data is not available (CSV-only hallucination)' }
  }
  steps.push('Report OK (CSV-only, no channel hallucination)')

  // 7) Chat
  const chatRes = await api('POST', `${base}/api/workspaces/${workspaceSlug}/agent`, {
    mode: 'chat',
    range: '7d',
    userMessage: 'Sessions 트렌드 알려줘',
    threadId: `thread_verify_${Date.now()}`,
    language: 'ko',
  })
  if (!chatRes.ok) {
    return { ok: false, steps, error: `Chat: ${JSON.stringify(chatRes.data)}` }
  }
  steps.push('Chat OK')

  return { ok: true, steps }
}

async function main() {
  console.log('=== CSV 파이프라인 검증 (다양한 형식) ===\n')

  let allPassed = true
  for (const fileName of FIXTURE_FILES) {
    const filePath = path.join(FIXTURES_DIR, fileName)
    const validation = validateCsvFile(filePath)
    const ok = validation.ok
    if (!ok) allPassed = false
    console.log(`1. 로컬 검증 [${fileName}]:`, ok ? 'OK' : 'FAIL')
    console.log('   헤더:', validation.headers?.join(', ') ?? '-')
    console.log('   행 수:', validation.rowCount ?? '-')
    if (validation.dateCol) console.log('   날짜 컬럼:', validation.dateCol)
    if (validation.metricCols?.length) console.log('   메트릭 컬럼:', validation.metricCols.join(', '))
    if (validation.errors.length) {
      validation.errors.forEach((e) => console.log('   오류:', e))
    }
    console.log('')
  }

  if (!allPassed) {
    process.exitCode = 1
    console.log('=== 일부 픽스처 검증 실패 ===')
    return
  }

  console.log('2. API 플로우 (선택 픽스처:', FIXTURE_ENV, ')')
  const apiResult = await runApiFlow(FIXTURE_ENV)
  if (apiResult.error) {
    console.log('   ', apiResult.error)
    if (!BASE_URL || !AUTH_COOKIE) {
      console.log('   (BASE_URL, PROJECT_ID, WORKSPACE_ID, AUTH_COOKIE 설정 시 API 단계 실행)')
    }
  } else {
    apiResult.steps.forEach((s) => console.log('   ', s))
  }

  if (!apiResult.ok && BASE_URL && AUTH_COOKIE) {
    process.exitCode = 1
  }

  console.log('\n=== 완료 ===')
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
