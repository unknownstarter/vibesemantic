# CSV 파이프라인 검증 계획 (간단 CSV → 마트 → 리포트/채팅)

**작성일**: 2026-02-01  
**목적**: 첨부 이미지와 유사한 간단 CSV(Date, Sessions, Leads)가 API 인식·추출 → 마트 적재 → 리포트/채팅까지 올바르게 동작하는지 스킬 관점에서 검증

---

## 1. 테스트 데이터 (다양한 형식)

**목적**: "Date, Sessions, Leads" 한 가지만 인식하도록 얇팍하게 고친 게 아닌지 검증.  
데이터 분석가·데이터 사이언티스트 관점에서 **다양한 컬럼명·날짜 형식** 픽스처로 파서·Probe·Ingest 검증.

| 파일 | 날짜 컬럼 | 메트릭 컬럼 | 날짜 형식 |
|------|-----------|-------------|-----------|
| myleads_simple.csv | Date | Sessions, Leads | YYYY-MM-DD |
| revenue_daily.csv | 날짜 | 매출, 주문수 | YYYY/MM/DD |
| traffic_weekly.csv | week_start | visitors, signups | YYYY-MM-DD |
| kpi_monthly.csv | 기준월 | DAU, 신규가입 | YYYY-MM |
| **segments_no_date.csv** | **없음** | revenue, users | — (집계 데이터) |

- **로컬 검증**: `npm run verify-csv` — 4개 픽스처 모두 컬럼명 무관 구조 검증 (날짜 1개 + 수치 N개).
- **파서 검증**: `npm run verify-csv-parser` — 프로젝트 `parseCsvMetadata`로 4개 파일 파싱 확인.
- **API 플로우**: `FIXTURE=revenue_daily.csv` 등으로 선택 픽스처 업로드·Probe·Ingest·리포트 검증.

---

## 2. 검증 체크리스트 (Data Scientist / QA 관점)

### 2.1 로컬 검증 (인증 불필요)

| # | 검증 항목 | 방법 | 기대 결과 |
|---|-----------|------|-----------|
| 1 | CSV 파일 존재·구조 | `scripts/verify-csv-pipeline.ts` 1단계 | 헤더 Date,Sessions,Leads, 10행, 수치 컬럼 검증 통과 |
| 2 | 파서 인식 | Next 앱 내 `parseCsvMetadata` (또는 업로드 UI) | 동일 CSV 업로드 시 헤더·샘플 행 정상 추출 |

### 2.2 API 플로우 (인증 필요: 로그인 후 쿠키 사용)

| # | 단계 | API | 검증 내용 |
|---|------|-----|-----------|
| 1 | 데이터셋 생성 | POST `/api/projects/:pid/csv/datasets` | name, purpose(marketing) 생성 |
| 2 | 업로드 | POST `/api/projects/:pid/csv/datasets/:did/upload` | multipart, CSV 파일 → storage + csv_files 레코드 |
| 3 | Probe | POST `/api/projects/:pid/csv/datasets/:did/probe` | dateColumn=Date, metricColumns=[Sessions, Leads] 등 반환 |
| 4 | Confirm | POST `/api/projects/:pid/csv/datasets/:did/confirm` | mapping confirmed, dataset status=confirmed |
| 5 | Ingest | POST `/api/projects/:pid/csv/datasets/:did/ingest?range=30d` | mart_csv_daily_metrics 적재 |
| 6 | 리포트 | POST `/api/workspaces/:wid/agent` mode=report | analysisMarkdown 반환, martSummary.dataSources.csv.available=true, **채널(유기검색 등) 미언급** |
| 7 | 채팅 | POST `/api/workspaces/:wid/agent` mode=chat, userMessage="Sessions 트렌드 알려줘" | CSV 기반 답변, 채널 환각 없음 |

### 2.3 데이터 마트 검증

| # | 검증 항목 | 방법 | 기대 결과 |
|---|-----------|------|-----------|
| 1 | mart_csv_daily_metrics | Supabase에서 project_id·dataset_id로 조회 | date, metric_name(Sessions/Leads), metric_value 등 존재 |
| 2 | Summary builder | need_csv=True 시 csvMetrics 채움 | martSummary.csvMetrics, dataSources.csv.available |

### 2.4 리포트·채팅 품질 (환각 방지)

| # | 검증 항목 | 기대 결과 |
|---|-----------|-----------|
| 1 | CSV 전용 프로젝트 리포트 | "유기적 검색", "직접 유입", "채널별" 등 **없음** |
| 2 | 리포트 내용 | Date·Sessions·Leads·트렌드·파생 지표(전환율 등) 기반 서술 |
| 3 | 채팅 제안 | 데이터 소스 인식 제안 (예: "Sessions 트렌드 알려줘", "Leads 전환율 분석해줘") |
| 4 | 채팅 응답 | martSummary에 있는 데이터만 인용, 채널 환각 없음 |

---

## 3. 실행 방법

### 3.1 로컬 CSV 검증만

```bash
npx tsx scripts/verify-csv-pipeline.ts
```

(tsx 없으면: `npm i -D tsx` 후 실행)

### 3.2 API 플로우까지 (개발 서버 + 로그인 필요)

1. `npm run dev` 로 기동
2. 브라우저에서 로그인 후 개발자 도구 → Application → Cookies에서 `sb-<project>-auth-token` 값 복사
3. 프로젝트/워크스페이스 ID(slug 또는 UUID) 확인

```bash
export BASE_URL=http://localhost:3000
export PROJECT_ID=<프로젝트 slug 또는 UUID>
export WORKSPACE_ID=<워크스페이스 slug 또는 UUID>
export AUTH_COOKIE="sb-xxx-auth-token=복사한값"
npx tsx scripts/verify-csv-pipeline.ts
```

### 3.3 수동 검증 (UI)

1. 프로젝트 → 설정 → CSV/Excel 데이터셋 → 새 데이터셋(name: myleads, purpose: 마케팅)
2. `scripts/fixtures/myleads_simple.csv` 업로드
3. Probe → 날짜 컬럼 Date, 메트릭 Sessions·Leads 확인 → Confirm
4. Ingest 실행 (30일 범위)
5. 해당 워크스페이스 → AI 분석 → 리포트 탭: CSV 기반 리포트, 채널 언급 없음 확인
6. 채팅 탭: 제안이 "Sessions 트렌드 알려줘" 등 CSV 기반인지, 응답에 채널 환각 없는지 확인

---

## 4. 스킬 연계

| 스킬 | 검증 시 활용 포인트 |
|------|----------------------|
| **data-scientist** | 데이터 품질(컬럼 타입·구조), 파생 지표(전환율), 환각 방지 검증 |
| **data-engineer** | 스테이징·마트 적재(mart_csv_daily_metrics), 스키마·매핑 |
| **qa-engineer** | E2E 체크리스트, API 단계별 기대 결과, 수동/자동 검증 절차 |

---

## 5. 요약

- **fixture**: `scripts/fixtures/myleads_simple.csv` (Date, Sessions, Leads, 10행)
- **스크립트**: `scripts/verify-csv-pipeline.ts` — 로컬 검증 필수, API 플로우는 BASE_URL·PROJECT_ID·WORKSPACE_ID·AUTH_COOKIE 설정 시 실행
- **검증 포인트**: API 인식·추출 → 마트 적재 → 리포트(CSV 전용, 채널 미언급) → 채팅(데이터 소스 인식 제안·응답)
