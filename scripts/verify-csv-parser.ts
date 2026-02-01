/**
 * 프로젝트 파서(parseCsvMetadata)로 픽스처 검증.
 * 컬럼명에 무관하게 파서가 헤더·샘플 행을 추출하는지 확인.
 * 실행: npx tsx scripts/verify-csv-parser.ts (프로젝트 루트에서)
 */

import * as fs from 'fs'
import * as path from 'path'

const FIXTURES_DIR = path.join(__dirname, 'fixtures')
const FIXTURE_FILES = [
  'myleads_simple.csv',
  'revenue_daily.csv',
  'traffic_weekly.csv',
  'kpi_monthly.csv',
  'segments_no_date.csv',
]

async function main() {
  // Dynamic import so we run from project root and path alias works when run via Next/tsx
  const parserPath = path.join(__dirname, '..', 'src', 'lib', 'csv', 'parser.ts')
  if (!fs.existsSync(parserPath)) {
    console.error('Parser not found:', parserPath)
    process.exitCode = 1
    return
  }

  const { parseCsvMetadata } = await import('../src/lib/csv/parser')
  console.log('=== 프로젝트 파서(parseCsvMetadata) 검증 ===\n')

  let allOk = true
  for (const fileName of FIXTURE_FILES) {
    const filePath = path.join(FIXTURES_DIR, fileName)
    if (!fs.existsSync(filePath)) {
      console.log(`[${fileName}] SKIP (file not found)`)
      continue
    }
    const content = fs.readFileSync(filePath, 'utf-8')
    const result = parseCsvMetadata(content, 20)
    const ok = result.headers.length >= 2 && result.sampleRows.length >= 1 && result.totalRows >= 1
    if (!ok) allOk = false
    console.log(`[${fileName}]`, ok ? 'OK' : 'FAIL')
    console.log('   headers:', result.headers.join(', '))
    console.log('   totalRows:', result.totalRows, 'sampleRows:', result.sampleRows.length)
    if (result.sampleRows.length) {
      console.log('   first row:', result.sampleRows[0].join(', '))
    }
    console.log('')
  }

  if (!allOk) process.exitCode = 1
  console.log('=== 완료 ===')
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
