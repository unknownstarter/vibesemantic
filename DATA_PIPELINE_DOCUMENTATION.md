# 데이터 파이프라인 문서: GA4 & CSV 연동

**마지막 업데이트**: 2026-01-31

## 목차
1. [개요](#개요)
2. [전체 아키텍처](#전체-아키텍처)
3. [GA4 데이터 연동](#ga4-데이터-연동)
4. [CSV 데이터 연동](#csv-데이터-연동)
5. [Staging 레이어](#staging-레이어)
6. [데이터 마트 구조](#데이터-마트-구조)
7. [Summary (Semantic Snapshot)](#summary-semantic-snapshot)
8. [Semantic Layer](#semantic-layer)
9. [다소스 확장: Mart/Summary 공통 패턴 (Epic 6.2)](#다소스-확장-martsummary-공통-패턴--epic-62)
10. [에이전트 연동](#에이전트-연동)
11. [데이터베이스 스키마](#데이터베이스-스키마)

---

## 개요

Vibe Semantic의 데이터 파이프라인은 다음 흐름으로 작동합니다:

```
데이터 소스 (GA4/CSV)
        ↓
  스키마 분석/감지 (Profiler → Schema Proposal → Human Confirm → schema_version)
        ↓
  Staging 적재 (소스별 원시/정규화 전, schema_version 기준)
        ↓
  Mart 적재 (Staging → 결정론적 변환만, LLM 미관여)
        ↓
  Summary (Semantic Snapshot) / MartSummary
        ↓
   LLM 프롬프트
        ↓
  리포트/채팅 응답
```

### 지원 데이터 소스

| 소스 | 설명 | 연동 방식 |
|------|------|-----------|
| **GA4** | Google Analytics 4 | OAuth 2.0 + Data API |
| **CSV** | 커스텀 데이터 파일 | 파일 업로드 + LLM 스키마 분석 |

---

## 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA INGESTION LAYER                               │
├────────────────────────────────────┬────────────────────────────────────────┤
│            GA4 Pipeline            │            CSV Pipeline                │
│  ┌─────────────────────────────┐   │   ┌─────────────────────────────┐     │
│  │  1. OAuth 연결              │   │   │  1. 파일 업로드             │     │
│  │  2. Property 선택           │   │   │  2. Profiler + Schema Proposal│     │
│  │  3. Event Schema 감지       │   │   │  3. 매핑 확인 (schema_version)│     │
│  │  4. Data API 수집           │   │   │  4. 데이터 수집             │     │
│  └─────────────────────────────┘   │   └─────────────────────────────┘     │
└────────────────────────────────────┴────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STAGING LAYER (schema_version 기준, 보존 30일)     │
├────────────────────────────────────┬────────────────────────────────────────┤
│  staging_ga4_raw                   │  staging_csv_raw                        │
│  (report_type, payload JSONB)       │  (dataset_id, mapping_id, payload)      │
└────────────────────────────────────┴────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA MART LAYER (결정론적 변환만)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │ mart_ga4_metrics │  │ mart_ga4_daily_  │  │ mart_csv_daily_  │          │
│  │                  │  │ kpis             │  │ metrics          │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │ mart_ga4_channel │  │ mart_ga4_top_    │  │ mart_events      │          │
│  │ _daily           │  │ pages_daily      │  │                  │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SEMANTIC LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     metric_definitions                                │   │
│  │  - 프로젝트별 메트릭 정의                                             │   │
│  │  - 산업별 KPI 템플릿                                                  │   │
│  │  - 동의어/예시 질문 매핑                                              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AGENT LAYER                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐   ┌────────────────┐   ┌────────────────┐              │
│  │ load_context   │──▶│ MartSummary    │──▶│ LLM Prompt     │              │
│  │ _mart_summary  │   │ 생성           │   │ 생성           │              │
│  └────────────────┘   └────────────────┘   └────────────────┘              │
│                                                    │                        │
│                                                    ▼                        │
│                              ┌────────────────────────────────┐            │
│                              │  GPT-4o 분석 + 리포트/채팅 응답  │            │
│                              └────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## GA4 데이터 연동

### 연결 흐름

```
1. OAuth 2.0 인증
   └─▶ /api/ga4/oauth/start → Google OAuth 화면
   └─▶ /api/ga4/oauth/callback → access_token, refresh_token 저장

2. Property 선택
   └─▶ /api/ga4/properties → 사용자 접근 가능한 Property 목록
   └─▶ /api/ga4/properties/select → 선택한 Property 저장

3. Event Schema 감지 (자동)
   └─▶ detectEventSchemas() → 이벤트 목록 및 파라미터 추론
   └─▶ saveEventSchemas() → ga4_event_schemas 테이블 저장

4. 데이터 수집 (on-demand)
   └─▶ getGA4Analytics() → Data API 호출
   └─▶ 데이터 마트 테이블에 저장
```

### Event Schema 감지 로직

```typescript
// src/lib/ga4/schema-detection.ts

interface EventSchema {
  event_name: string           // 'page_view', 'purchase' 등
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
  priority: number             // 1=highest, 5=lowest
  event_count_30d: number      // 30일 이벤트 수
  last_seen_date: string
}
```

### 목적별 이벤트 우선순위

| 목적 | 높은 우선순위 | 중간 우선순위 |
|------|--------------|---------------|
| **product** | page_view, user_engagement, session_start | click, scroll, view_item |
| **marketing** | page_view, first_visit, click, purchase | sign_up, generate_lead |
| **biz** | purchase, sign_up, generate_lead | page_view, view_item |
| **sales** | generate_lead, purchase, begin_checkout | page_view, add_to_cart |

### GA4 Data API 수집 메트릭

```typescript
// 1. Daily KPIs
const kpisMetrics = [
  'sessions',
  'activeUsers',
  'newUsers',
  'engagedSessions',
  'engagementRate',
  'bounceRate',
  'averageSessionDuration',
]

// 2. Channel Daily
const channelDimensions = ['date', 'sessionDefaultChannelGroup']
const channelMetrics = ['sessions', 'activeUsers', 'newUsers', 'engagedSessions']

// 3. Top Pages Daily
const pageDimensions = ['date', 'pagePath', 'pageTitle']
const pageMetrics = ['sessions', 'activeUsers', 'screenPageViews', 'engagementRate']
```

---

## CSV 데이터 연동

### 연결 흐름

```
1. 파일 업로드
   └─▶ Supabase Storage (csv-uploads 버킷)

2. 스키마 분석 (Profiler + Schema Proposal)
   └─▶ runCsvProfiler(): 코드만 (parser + data-pattern-analyzer, 필요 시 Pandas). LLM 없음.
   └─▶ dateColumn, metricColumns, dimensionColumns, aggregationRules는 Profiler 결과만 사용.
   └─▶ runSchemaProposal(): LLM은 의미·이름·설명만 제안 (displayName, llmQuestions). 수치/집계/정규화 지시 없음.
   └─▶ probeSchema() = Profiler 결과 + (선택) Schema Proposal 결과. 저장 시 source_mappings에 status=draft.

3. 매핑 확인 (사용자)
   └─▶ UI에서 날짜 컬럼, 메트릭, 디멘전 확인/수정
   └─▶ Confirm 시 `schema_version` 부여 (immutable)

4. 데이터 수집
   └─▶ 소형 파일: TypeScript 처리
   └─▶ 대형 파일 (≥10MB): Python Pandas API
   └─▶ mart_csv_daily_metrics 테이블에 저장
```

### LLM 스키마 분석 프롬프트

```typescript
// src/lib/csv/probe.ts

const prompt = `
=== CSV COLUMN ANALYSIS ===
Total columns: ${headers.length}

DETECTED COLUMN TYPES:
${columnDescriptions}

SAMPLE DATA:
${tableHeader}
${tableRows}

=== YOUR TASK ===
1. **DATE column** (optional, can be null)
2. **METRIC columns** (numeric measures)
   - INCLUSIVE RULE: Include ALL numeric columns
   - Event-related metrics MUST be included
3. **DIMENSION columns** (categorical breakdown)
4. **AGGREGATION rules** (sum/avg/count)

**CRITICAL**: 데이터 패턴 분석 결과를 우선적으로 신뢰하세요!
`
```

### 컬럼 타입 감지

| 타입 | 설명 | 예시 |
|------|------|------|
| `date` | 날짜/시간 컬럼 | 2026-01-27, 20260127 |
| `number` | 숫자 메트릭 | 1234, 45.67 |
| `currency` | 통화 값 | $1,234, ₩10,000 |
| `percentage` | 퍼센트 | 45%, 0.45 |
| `string` | 텍스트/카테고리 | "Organic Search" |
| `id` | 고유 식별자 (제외) | UUID, 일련번호 |

### 데이터 패턴 분석

```typescript
// 패턴 분석 결과
interface DataPatternAnalysis {
  isEventName: boolean      // 이벤트 이름 패턴
  isEventCount: boolean     // 이벤트 수 패턴
  isUserCount: boolean      // 사용자 수 패턴
  isRevenue: boolean        // 수익 패턴
  isEventsPerUser: boolean  // 사용자당 이벤트 수
  needsConfirmation: boolean
  suggestedType: string
  suggestedAggregation: string
  confidence: number
}
```

### CSV 데이터 변환

```typescript
// src/lib/csv/ingest.ts

interface MartRecord {
  project_id: string
  dataset_id: string
  date: string              // YYYY-MM-DD (없으면 오늘 날짜)
  metric_name: string
  metric_value: number | null
  dimension_key: string | null    // 레거시: 단일 디멘전
  dimension_value: string | null
  dimensions: Record<string, string> | null  // 신규: 다중 디멘전 JSONB
  raw_data: Record<string, unknown> | null   // 원본 행 데이터
}
```

---

## Staging 레이어

Source → Mart 사이에 Staging 단계를 두어, **schema_version 기준 재현 가능 적재**와 **실패 시 재시도/복구 단위**를 확보합니다. Collector는 Staging에 먼저 쓰고, Mart 적재는 Staging → 결정론적 변환만 수행합니다 (Task 2.2).

### Staging 테이블

| 테이블 | 용도 | 주요 컬럼 |
|--------|------|-----------|
| **staging_csv_raw** | CSV 원시 행 (매핑·스키마 버전 기준) | project_id, dataset_id, mapping_id, schema_version, payload (JSONB), created_at |
| **staging_ga4_raw** | GA4 API 응답/행 (리포트 타입·스키마 버전 기준) | project_id, schema_version, report_type, payload (JSONB), created_at |

#### staging_csv_raw

- 한 행 = CSV 원시 행 1개. `payload`는 컬럼명 → 값 맵.
- `mapping_id`(source_mappings), `schema_version`으로 어떤 스키마로 적재됐는지 식별.
- Mart 적재는 이 테이블을 읽어 **코드만으로** `mart_csv_daily_metrics` 등으로 변환.

#### staging_ga4_raw

- `report_type`: `daily_kpis`, `channel_daily`, `top_pages_daily`, `metrics` 등.
- `payload`: GA4 API 원시 응답 또는 행 배열. Mart 변환 시 동일 입력 → 동일 출력 보장.

### 적재·재시도 정책

- **적재**: Collector(GA4/CSV)가 API/파일에서 읽은 뒤 **먼저 Staging에 삽입**. 성공 후 Staging → Mart 변환(동기, 결정론적) 실행. LLM은 Mart 생성/정규화/집계에 관여하지 않음.
- **재시도**: Staging에 이미 있는 배치는 Mart 변환만 재실행 가능. 소스 재호출 없이 재현 가능.

### 구현 위치 (Task 2.2)

- **CSV**: `src/lib/csv/ingest.ts`(TypeScript 경로), `python-brain/app/services/csv_ingest.py`(Pandas 경로) — 파싱 후 `staging_csv_raw` 삽입 → `transformToMartRecords`/`transform_dataframe_to_records` → `mart_csv_daily_metrics` upsert.
- **GA4**: `src/lib/ga4/api.ts`의 `refreshMartData` — API 응답으로 행 구성 후 `staging_ga4_raw` 삽입(report_type: daily_kpis, channel_daily, top_pages_daily, events) → Mart 테이블 upsert.

### Staging 보존 기간·아카이브 정책 (Task 2.5)

- **보존 기간: 30일.** `created_at`(또는 적재 시점) 기준 30일 초과 행은 **삭제**.
- Mart는 장기 보관; Staging은 단기 보존으로 저장소/비용을 제한합니다.

#### 실행 방법

| 항목 | 내용 |
|------|------|
| **스크립트** | `scripts/cleanup_staging.py` |
| **보존 기간** | 기본 30일 (`--days 30`). N일 초과 행 삭제. |
| **실행 주기** | 권장: 일 1회 (cron 등). |
| **사용법** | `python scripts/cleanup_staging.py [--days 30] [--dry-run]` |
| **환경변수** | `SUPABASE_URL`(또는 `NEXT_PUBLIC_SUPABASE_URL`), `SUPABASE_SERVICE_KEY`(또는 `SUPABASE_SERVICE_ROLE_KEY`) |
| **dry-run** | `--dry-run` 시 삭제하지 않고 대상 행 수만 출력(최대 1만 행씩 조회). |

**cron 예시 (매일 새벽 2시):**
```bash
0 2 * * * cd /path/to/vibesemantic && python scripts/cleanup_staging.py --days 30
```

**Supabase pg_cron 사용 시:** SQL Editor에서 `DELETE FROM staging_csv_raw WHERE created_at < now() - interval '30 days';` 및 `staging_ga4_raw` 동일 실행 스케줄 등록 가능.

---

## 데이터 마트 구조

### GA4 데이터 마트

#### mart_ga4_metrics (유연한 메트릭 테이블)
```sql
CREATE TABLE mart_ga4_metrics (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  date DATE NOT NULL,
  metric_name TEXT NOT NULL,        -- 'sessions', 'active_users', etc.
  metric_value NUMERIC,
  dimensions JSONB DEFAULT '{}',    -- 다차원 분석
  created_at TIMESTAMPTZ,
  UNIQUE(project_id, date, metric_name, dimensions)
);
```

#### mart_ga4_daily_kpis (일별 KPI 집계)
```sql
CREATE TABLE mart_ga4_daily_kpis (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  date DATE NOT NULL,
  sessions INTEGER,
  active_users INTEGER,
  new_users INTEGER,
  engagement_rate NUMERIC,
  bounce_rate NUMERIC,
  avg_session_duration NUMERIC,
  UNIQUE(project_id, date)
);
```

#### mart_ga4_channel_daily (채널별 일별)
```sql
CREATE TABLE mart_ga4_channel_daily (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  date DATE NOT NULL,
  channel_group TEXT NOT NULL,
  sessions INTEGER,
  active_users INTEGER,
  new_users INTEGER,
  engaged_sessions INTEGER,
  UNIQUE(project_id, date, channel_group)
);
```

#### mart_ga4_top_pages_daily (페이지별 일별)
```sql
CREATE TABLE mart_ga4_top_pages_daily (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  date DATE NOT NULL,
  page_path TEXT NOT NULL,
  page_title TEXT,
  screen_page_views INTEGER,
  engagement_rate NUMERIC,
  UNIQUE(project_id, date, page_path)
);
```

### CSV 데이터 마트

#### mart_csv_daily_metrics
```sql
CREATE TABLE mart_csv_daily_metrics (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  dataset_id UUID NOT NULL,
  date DATE NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  dimension_key TEXT,           -- 레거시 단일 디멘전
  dimension_value TEXT,
  dimensions JSONB,             -- 다중 디멘전
  raw_data JSONB,               -- 원본 행
  UNIQUE(project_id, dataset_id, date, metric_name, dimension_key, dimension_value)
);
```

### 이벤트 데이터 마트

#### mart_events
```sql
CREATE TABLE mart_events (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  source TEXT NOT NULL,         -- 'ga4', 'csv', 'bigquery'
  date DATE NOT NULL,
  event_name TEXT NOT NULL,
  event_params JSONB DEFAULT '{}',
  event_count BIGINT DEFAULT 0,
  unique_users BIGINT DEFAULT 0,
  events_per_user NUMERIC(10,4),
  dimensions JSONB DEFAULT '{}',
  UNIQUE(project_id, source, date, event_name, dimensions)
);
```

---

## Summary (Semantic Snapshot)

Mart 기반의 **기간·워크스페이스·목적별** “의미 있는 스냅샷”이다. BI 대시보드가 아니라, **특정 시점/범위의 집계 결과**를 담는 구조로, 에이전트(Planner/Tool/Explainer)가 “어떤 데이터를 쓸지” 결정하고 LLM 프롬프트에 넣을 때 사용한다.

### Summary 스키마 (MartSummary)

| 필드 | 타입 | 설명 | Mart 출처 |
|------|------|------|------------|
| **period** | `{ start, end, days }` | 기간(날짜 범위) | 요청 파라미터(range: 7d/30d) |
| **kpis** | `object` | 기간 내 KPI 집계 | mart_ga4_daily_kpis / mart_ga4_metrics (sum/avg) |
| **topChannels** | `array` | 채널별 세션·사용자·비중 | mart_ga4_channel_daily (channel_group별 sum, 상위 N) |
| **topPages** | `array` | 페이지별 뷰·참여율 | mart_ga4_top_pages_daily (page_path별 sum/avg, 상위 N) |
| **dailyTrend** | `array` | 일별 세션·사용자 | mart_ga4_daily_kpis (date, sessions, active_users) |
| **csvMetrics** | `object` | 메트릭별 total, byDimension, trend | mart_csv_daily_metrics (metric_name·dimension·date별 집계) |
| **integratedTrend** | `array` | GA4+CSV 일별 통합 | mart_ga4_daily_kpis + mart_csv_daily_metrics (날짜 기준 병합) |
| **dataSources** | `object` | ga4/csv/integrated 가용 여부·메타 | 위 Mart 조회 결과 유무 |
| **metricDefinitions** | `array` | Semantic Layer 메트릭 정의 | metric_definitions (project_id, is_active) |
| **statisticalAnalysis** | `object` | (선택) 지표 상관·이벤트-KPI 관계 | Mart 데이터 기반 통계 분석(코드만, LLM 없음) |

- **식별 키**: `project_id` + `workspace_id`(선택) + `period.start` + `period.end` + `purpose`(workspace 목적) 등으로 캐시 키 또는 저장 스냅샷 ID 구성.

### Mart → Summary 구성 단계

1. **입력**: `project_id`, `workspace_id`, `range`(7d/30d), `purpose`(선택), (Chat 시) `question_intent`(필요 메트릭/차원).
2. **Mart 쿼리** (기간 필터 공통: `date >= start AND date <= end`):
   - **KPI**: `mart_ga4_daily_kpis` → 일별 행 합산/평균 → `kpis`, `dailyTrend`.
   - **채널**: `mart_ga4_channel_daily` → channel_group별 sum → 정렬 후 상위 N → `topChannels`.
   - **페이지**: `mart_ga4_top_pages_daily` → page_path별 sum/avg → 정렬 후 상위 N → `topPages`.
   - **CSV**: `mart_csv_daily_metrics` → metric_name·dimension_key·date별 집계 → `csvMetrics`(total, byDimension, trend).
   - **이벤트**: `mart_events` (source=ga4) → (선택) `statisticalAnalysis` 또는 이벤트 요약.
3. **집계 규칙**: sum(sessions, active_users, metric_value), avg(engagement_rate, bounce_rate 등). 동일 Mart 입력 → 동일 Summary 출력(결정론).
4. **메타**: `metric_definitions` 조회 후 `metricDefinitions` 채움. `dataSources`는 위 Mart 조회 결과 존재 여부로 설정.
5. **(선택) 통계 분석**: Report 모드·충분한 행 수일 때만, Mart 데이터로 `statistical_analysis` 수행(LLM 없음) → `statisticalAnalysis`.

### 캐시 vs 자산 저장

| 시나리오 | 용도 | TTL/보존 | 저장소 |
|----------|------|----------|--------|
| **캐시만** | 에이전트 호출 시 Summary 재사용(속도) | TTL N분(예: 5~15분) | 메모리/Redis 등. 동일 project+workspace+range → 동일 키. |
| **자산으로 저장** | “이 시점 스냅샷” 보관·재조회·감사 | 무기한 또는 정책 기간 | DB 테이블(예: `summary_snapshots`) 또는 스토리지. 저장 시 사용자 액션 또는 자동 정책. |

- **현재 구현 (Task 2.4 완료)**: Summary는 `build_summary_from_mart()`(python-brain/app/langgraph/summary_builder.py)로 Mart 쿼리 후 결정론적 집계해 생성. `load_context_and_mart_summary`가 이 함수를 호출해 state에 `martSummary`를 채움. 캐시 키 정책: `(project_id, workspace_id, range)` → 동일 입력 시 동일 Summary(캐시 미구현 시에는 매 요청 시 생성).
- **향후**: 인메모리/Redis 캐시 도입 시 동일 키로 Summary 재사용. 저장 스냅샷은 별도 테이블/API로 확장 가능.

### 타입 위치

- **Python**: `python-brain/app/langgraph/types.py` — `MartSummary` (TypedDict).
- **TypeScript**: 에이전트 응답에서 `martSummary` 필드로 전달; 필요 시 `src/types/` 또는 `src/lib/api/`에 동일 구조 인터페이스 정의.

---

## Semantic Layer

### 메트릭 정의 테이블

```sql
CREATE TABLE metric_definitions (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  name TEXT NOT NULL,              -- 'sessions', 'dau' 등
  display_name TEXT NOT NULL,      -- '세션', '일간 활성 사용자'
  description TEXT,
  category TEXT,                   -- acquisition, engagement, retention, conversion, revenue
  source_type TEXT NOT NULL,       -- ga4, csv, calculated, bigquery
  source_table TEXT,
  source_column TEXT,
  formula TEXT,                    -- 계산 메트릭용
  dependencies JSONB,              -- 의존 메트릭 목록
  aggregation TEXT DEFAULT 'sum',  -- sum, avg, count, max, min
  data_type TEXT DEFAULT 'number',
  synonyms TEXT[],                 -- ['세션수', '방문수', 'sessions']
  example_questions TEXT[],        -- ['세션은 얼마나 되나요?']
  priority INTEGER DEFAULT 3,      -- 1(높음) ~ 5(낮음)
  is_from_profile BOOLEAN,         -- 프로필 기반 자동 생성 여부
  matched_goal TEXT,               -- 매칭된 프로젝트 목표
  is_active BOOLEAN DEFAULT true,
  UNIQUE(project_id, name)
);
```

### Semantic Graph (노드/엣지) — Epic 3.1

메트릭·차원·소스를 **노드**, 의존/관계를 **엣지**로 표현해 확장 가능한 Semantic Layer 기반을 둠.

#### 노드 테이블: semantic_nodes

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| project_id | UUID | FK → projects |
| type | enum | **metric** \| **dimension** \| **source** |
| payload | JSONB | name, display_name, source_type, metric_definition_id 등 |
| created_at, updated_at | TIMESTAMPTZ | |

- **metric**: 메트릭 정의 1개. payload에 name, display_name, source_type, source_table, aggregation, metric_definition_id(선택) 등.
- **dimension**: 차원(예: 채널, 페이지). payload에 name, display_name, source 등.
- **source**: 데이터 소스(ga4, csv, calculated). payload에 source_type, description 등.

#### 엣지 테이블: semantic_edges

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| from_id | UUID | FK → semantic_nodes |
| to_id | UUID | FK → semantic_nodes |
| relation_type | enum | **depends_on** \| **relates_to** \| **from_source** |
| payload | JSONB | (선택) 메타 |
| created_at | TIMESTAMPTZ | |

- **depends_on**: 메트릭 A가 메트릭 B에 의존 (calculated 메트릭 → 원천 메트릭).
- **relates_to**: 메트릭 ↔ 차원 (해당 메트릭이 어떤 차원으로 쪼개지는지).
- **from_source**: 메트릭 → 소스 (이 메트릭이 ga4/csv/calculated 중 어디서 오는지).

#### metric_definitions와의 대응

- **1:1**: `metric_definitions` 한 행 → `semantic_nodes` 한 행 (type=metric). payload에 `metric_definition_id` 또는 별도 컬럼으로 연결.
- **dependencies**: `metric_definitions.dependencies`(JSONB) → `semantic_edges` (relation_type=depends_on).
- **source_type**: 메트릭 노드와 source 노드(ga4, csv, calculated) 사이에 from_source 엣지.

#### 동기화 (Task 3.2)

- **저장 시**: `saveMetricDefinitions`, `addCustomMetric` 호출 후 `syncMetricDefinitionsToGraph(projectId)`가 자동 호출됨 (`src/lib/semantic/metric-definitions.ts` → `src/lib/semantic/sync-graph.ts`).
- **백필**: 기존 프로젝트의 metric_definitions를 그래프로 이전하려면 `npx tsx scripts/sync-semantic-graph.ts` 실행. 환경변수 `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 필요. `--dry-run`으로 대상 프로젝트 수만 확인 가능.
- **DB**: `semantic_nodes`에 `metric_definition_id` 컬럼 추가(1:1 연결 및 upsert 키). 마이그레이션 `20260131000005_semantic_nodes_metric_definition_id.sql`.

#### Tool 노드에서 Semantic Graph 조회 (Task 3.3)

- **위치**: `load_context_and_mart_summary` → `build_summary_from_mart()` 내부.
- **동작**: `fetch_semantic_graph(supabase, project_id)`로 해당 프로젝트의 `semantic_nodes`, `semantic_edges`를 조회해 `MartSummary.semanticGraph`에 담아 반환.
- **형식**: `semanticGraph: { nodes: [{ id, type, payload, metric_definition_id }], edges: [{ from_id, to_id, relation_type, payload }] }`.
- **소비**: Explainer(또는 Planner)가 `state.martSummary.semanticGraph`를 참조해 메트릭·차원·소스 관계를 활용한 답변 또는 후속 질문 제안에 사용 가능.

#### 신규 소스 추가 시 그래프 확장 패턴 (Task 3.4)

그래프는 **metric_definitions**를 단일 진실 소스로 하여 확장한다. 신규 소스(GA4 프로퍼티 추가, CSV 데이터셋 확인, 커스텀 메트릭 추가 등) 반영 절차는 아래와 같다.

1. **metric_definitions 갱신**
   - GA4: 프로젝트에 GA4 연결 시 템플릿/스키마 기반으로 `metric_definitions` insert.
   - CSV: 데이터셋 confirm 시 컬럼·집계 기반 `metric_definitions` insert (또는 기존 정의와 매핑).
   - 커스텀: `addCustomMetric` 또는 설정 UI에서 `metric_definitions` insert/update.
   - 각 레코드에 `source_type`(ga4 | csv | calculated), `source_table`, `dependencies`(선택) 등 설정.

2. **그래프 동기화 호출**
   - 저장/수정 직후 **같은 프로젝트**에 대해 `syncMetricDefinitionsToGraph(projectId)` 호출.
   - 호출 위치: `src/lib/semantic/metric-definitions.ts` — `saveMetricDefinitions`, `addCustomMetric` 성공 후 각각 호출됨.
   - 백필: 기존 프로젝트는 `npx tsx scripts/sync-semantic-graph.ts` (옵션: `--dry-run`)로 일괄 동기화.

3. **sync-graph 동작 요약**
   - **Source 노드**: `source_type` ∈ { ga4, csv, calculated }별로 `semantic_nodes`(type=source) 1개씩 없으면 생성.
   - **Metric 노드**: `metric_definitions` 1행당 `semantic_nodes`(type=metric, metric_definition_id 연결) upsert.
   - **엣지**: 메트릭 → 소스 `from_source`, 메트릭 → 의존 메트릭 `depends_on` (dependencies 배열 기반).

4. **새 소스 타입(예: BigQuery) 추가 시**
   - `src/lib/semantic/sync-graph.ts`의 `sourceTypes` 배열에 새 타입 추가 (예: `'bigquery'`).
   - 해당 소스에서 쓰는 메트릭의 `metric_definitions.source_type`을 `bigquery`로 저장.
   - 동기화 시 해당 source 노드가 자동 생성되고, 메트릭 노드와 `from_source` 엣지로 연결됨.
   - Mart/Staging에 새 소스용 테이블이 있다면, Summary·Tool 노드 쿼리에서 해당 테이블을 포함하도록 확장.

5. **체크리스트 (신규 소스 연동)**
   - [ ] `metric_definitions`에 새 메트릭 insert/update (source_type, source_table 등).
   - [ ] 동일 요청/트랜잭션 또는 직후에 `syncMetricDefinitionsToGraph(projectId)` 호출.
   - [ ] (선택) 새 source_type 사용 시 sync-graph의 sourceTypes에 추가.
   - [ ] (선택) Mart/Summary 쿼리·question_intent에 새 소스 반영 시 [다소스 확장 패턴](#다소스-확장-martsummary-공통-패턴--epic-62) 참고.

---

## 다소스 확장: Mart/Summary 공통 패턴 (Epic 6.2)

신규 데이터 소스(예: Ads, CRM)를 추가할 때 Mart·Summary·Planner를 일관되게 확장하기 위한 공통 패턴과 플러그인형 구조를 정의한다. 코드를 전면 리팩터링하지 않고도 새 소스를 “한 군데 등록”하면 Summary·Plan에 반영되도록 하는 것이 목표이다.

### 1. 공통 흐름 (현재)

| 단계 | 담당 | GA4 | CSV |
|------|------|-----|-----|
| **Staging** | Collector | `staging_ga4_raw` | `staging_csv_raw` |
| **Mart** | 결정론적 변환 | `mart_ga4_*`, `mart_events` | `mart_csv_daily_metrics` |
| **Plan** | Planner / data_source_selector | `need_ga4`, `need_channels`, `need_pages`, `need_events` | `need_csv` |
| **Summary** | build_summary_from_mart | `kpis`, `topChannels`, `topPages`, `dailyTrend` | `csvMetrics` |
| **MartSummary.dataSources** | summary_builder | `ga4: { available, dateRange, recordCount }` | `csv: { available, metrics, recordCount }` |

- **Plan**: `Plan`(TypedDict)에 `need_<source>` 플래그와 `date_range`가 있으며, Report 모드에서는 전부 True, Chat 모드에서는 `analyze_question_intent`/`chart_context`로 결정.
- **Summary**: `question_intent`(Plan)에 따라 Mart 테이블을 병렬 조회한 뒤, 소스별로 집계해 `MartSummary` 한 덩어리로 합친다. `dataSources`는 소스별 메타(available, recordCount 등)만 담는다.

### 2. 소스 플러그인 계약 (설계)

신규 소스 `X`를 넣을 때 다음 네 가지를 일치시키면, 기존 Planner → Tool → Explainer 흐름을 그대로 쓸 수 있다.

| 항목 | 설명 | GA4 예 | CSV 예 |
|------|------|--------|--------|
| **source_id** | 소스 식별자 (소문자) | `ga4` | `csv` |
| **Plan 플래그** | `need_<source_id>` 또는 공통 맵 | `need_ga4` | `need_csv` |
| **Mart 테이블** | `mart_<source_id>_*` 또는 기존 규칙 | `mart_ga4_*`, `mart_events` | `mart_csv_daily_metrics` |
| **Summary 슬라이스** | MartSummary 내 소스별 필드 | `kpis`, `topChannels`, `topPages`, `dailyTrend` | `csvMetrics` |
| **dataSources 엔트리** | `MartSummary.dataSources[source_id]` | `ga4: { available, dateRange, recordCount }` | `csv: { available, metrics, recordCount }` |

- **Staging**: 소스별로 `staging_<source_id>_raw`(또는 동일 정책) 테이블을 두고, Collector만 새로 구현하면 된다. Mart는 Staging → 결정론적 변환으로 채우면 됨.
- **Planner**: Chat 모드에서 “이 질문에 소스 X가 필요한가?”를 판단하려면 `data_source_selector.analyze_question_intent`에 키워드/플래그를 추가하고, `build_plan`이 반환하는 Plan에 `need_<source_id>`를 넣는다. Report 모드에서는 모든 `need_*`를 True로 두면 됨.
- **Summary**: `build_summary_from_mart`에서 `question_intent.need_<source_id>`가 True일 때만 해당 Mart 테이블을 조회하고, 소스별 집계 결과를 `MartSummary`의 기존 필드와 같은 형태로 넣는다. 새 소스용 필드(예: `adsMetrics`)를 `MartSummary`(TypedDict)에 추가하고, `dataSources[source_id]`에 메타를 넣는다.
- **Explainer/필터**: `filter_relevant_data_for_question`, `get_data_sources_description` 등에서 새 소스가 있으면 해당 슬라이스만 남기거나 설명에 포함하도록 분기 추가.

### 3. 플러그인형 확장 (선택 구현)

코드를 “소스별 if/함수 나열” 대신 “소스 리스트 기반 루프”로 바꾸면, 신규 소스는 **리스트에 한 항목 추가**만으로 연동할 수 있다.

- **레지스트리**: 예) `SOURCE_PLUGINS = [ ga4_plugin, csv_plugin ]`. 각 플러그인은 `source_id`, `need_key`(Plan 필드명), `fetch_fn(supabase, project_id, start_str, end_str, question_intent)`, `aggregate_fn(raw_rows) -> summary_slice`, `data_source_meta(summary_slice) -> dataSources[source_id]` 를 제공.
- **build_summary_from_mart**: `question_intent`를 보고 각 플러그인의 `need_*`가 True인 것만 `fetch_fn` 호출 → `aggregate_fn`으로 슬라이스 생성 → `MartSummary`에 소스별 필드와 `dataSources` 엔트리 병합. (기존 GA4/CSV 전용 로직은 플러그인으로 이전하면 됨.)
- **build_plan / analyze_question_intent**: 새 소스용 키워드와 `need_<source_id>` 기본값을 플러그인에서 정의하거나, 설정 테이블에서 읽어와서 Plan에 채운다.

현재는 GA4·CSV 두 소스만 있으므로, **문서상 계약만 정리**하고, 실제 레지스트리/플러그인 코드는 “세 번째 소스 추가 시” 리팩터링해도 무방하다. 세 번째 소스에서 `SOURCE_PLUGINS`와 `build_summary_from_mart` 루프를 도입하면, 이후 소스는 플러그인 추가만으로 확장 가능하다.

### 4. 신규 소스 추가 체크리스트 (Mart/Summary)

- [ ] **Staging**: `staging_<source_id>_raw` 테이블 및 Collector 구현.
- [ ] **Mart**: `mart_<source_id>_*` 테이블 정의, Staging → Mart 결정론적 변환 로직.
- [ ] **metric_definitions**: source_type 및 source_table 반영, 필요 시 `syncMetricDefinitionsToGraph` 호출.
- [ ] **Plan**: `data_source_selector`에 `need_<source_id>` 및 키워드(또는 플러그인) 추가.
- [ ] **Summary**: `build_summary_from_mart`에서 해당 소스 fetch·집계·`MartSummary` 필드·`dataSources[source_id]` 반영.
- [ ] **Explainer/필터**: `filter_relevant_data_for_question`, `get_data_sources_description` 등에서 새 소스 분기.
- [ ] (선택) 플러그인 레지스트리에 등록해 `build_summary_from_mart`/Plan이 루프로 처리하도록 변경.

### 산업별 KPI 템플릿

```typescript
// src/lib/templates/industry-kpis.ts

interface IndustryKPI {
  name: string
  displayName: string
  description: string
  category: MetricCategory
  sourceType: MetricSourceType
  formula?: string
  aggregation: MetricAggregation
  dataType: MetricDataType
  synonyms: string[]
  exampleQuestions: string[]
  priority: number
  industries: string[]
  dependencies?: string[]
}

// 산업별 KPI 매핑
const INDUSTRY_KPIS: Record<string, IndustryKPI[]> = {
  'SaaS': [dau, mau, churnRate, mrr, arpu, ...],
  'E-Commerce': [gmv, conversionRate, aov, cartAbandonmentRate, ...],
  'Media': [pageViews, timeOnSite, bounceRate, adRevenue, ...],
  // ...
}
```

### 메트릭 정의 생성 흐름

```
프로젝트 프로필 입력
       ↓
산업별 KPI 템플릿 로드
       ↓
목표-KPI 매칭
       ↓
metric_definitions 저장
       ↓
에이전트 프롬프트에 포함
```

---

## 에이전트 연동

### MartSummary 생성

```python
# python-brain/app/langgraph/nodes.py

def load_context_and_mart_summary(state: AnalysisState) -> Dict[str, Any]:
    """
    1. 질문 의도 분석 (GA4/CSV/채널/페이지/이벤트 필요 여부)
    2. 필요한 데이터 마트만 병렬 쿼리
    3. MartSummary 생성
    """
    
    # 질문 의도 분석
    question_intent = analyze_question_intent(
        user_message=state.get("userMessage"),
        mode=state.get("mode", "report"),
        purpose=state.get("workspacePurpose", "product")
    )
    
    # 데이터 마트 쿼리 (병렬 실행)
    with ThreadPoolExecutor() as executor:
        ga4_metrics = executor.submit(fetch_ga4_metrics).result()
        csv_metrics = executor.submit(fetch_csv_metrics).result()
        channels = executor.submit(fetch_channels).result()
        pages = executor.submit(fetch_pages).result()
        events = executor.submit(fetch_events).result()
    
    # MartSummary 생성
    mart_summary = build_mart_summary(
        ga4_metrics, csv_metrics, channels, pages, events
    )
    
    return {"martSummary": mart_summary}
```

### MartSummary 구조

```typescript
interface MartSummary {
  period: {
    start: string       // "2026-01-20"
    end: string         // "2026-01-27"
    days: number        // 7
  }
  kpis: {
    totalSessions: number
    totalUsers: number
    newUsers: number
    avgEngagementRate: number
    avgBounceRate: number
    avgSessionDuration: number
  }
  topChannels: Array<{
    name: string
    sessions: number
    users: number
    percentage: number
  }>
  topPages: Array<{
    path: string
    title: string
    views: number
    engagementRate: number
  }>
  dailyTrend: Array<{
    date: string
    sessions: number
    users: number
  }>
  csvMetrics?: Record<string, number>
  integratedTrend?: Array<{
    date: string
    ga4Sessions: number
    csvMetrics: Record<string, number>
  }>
  dataSources: {
    ga4: { available: boolean, recordCount?: number }
    csv: { available: boolean, metrics?: string[], recordCount?: number }
    integrated: boolean
  }
  metricDefinitions?: MetricDefinition[]
  statisticalAnalysis?: {
    summary: string
    metric_correlations: Array<{...}>
    event_kpi_relationships: Array<{...}>
    causality_hints: Array<{...}>
  }
  semanticGraph?: {
    nodes: Array<{ id: string; type: string; payload: Record<string, unknown>; metric_definition_id?: string }>
    edges: Array<{ from_id: string; to_id: string; relation_type: string; payload: Record<string, unknown> }>
  }
}
```

### 질문 의도 분석

```python
# python-brain/app/langgraph/data_source_selector.py

def analyze_question_intent(
    user_message: Optional[str],
    mode: str,
    purpose: str
) -> Dict[str, bool]:
    """
    사용자 질문에서 필요한 데이터 소스 파악
    """
    intent = {
        "need_ga4": True,        # 기본적으로 GA4 필요
        "need_csv": False,       # CSV는 명시적 키워드 필요
        "need_channels": False,  # 채널 분석 필요 여부
        "need_pages": False,     # 페이지 분석 필요 여부
        "need_events": False,    # 이벤트 분석 필요 여부
    }
    
    if not user_message:
        # 리포트 모드: 모든 데이터 로드
        if mode == "report":
            intent["need_channels"] = True
            intent["need_pages"] = True
        return intent
    
    user_lower = user_message.lower()
    
    # CSV 키워드 감지
    csv_keywords = ["csv", "매출", "revenue", "수익", "외부", "커스텀"]
    intent["need_csv"] = any(kw in user_lower for kw in csv_keywords)
    
    # 채널 키워드 감지
    channel_keywords = ["채널", "channel", "유입", "acquisition", "트래픽"]
    intent["need_channels"] = any(kw in user_lower for kw in channel_keywords)
    
    # 페이지 키워드 감지
    page_keywords = ["페이지", "page", "화면", "경로", "path"]
    intent["need_pages"] = any(kw in user_lower for kw in page_keywords)
    
    # 이벤트 키워드 감지
    event_keywords = ["이벤트", "event", "클릭", "전환", "conversion"]
    intent["need_events"] = any(kw in user_lower for kw in event_keywords)
    
    return intent
```

### 통계적 분석

```python
# python-brain/app/langgraph/statistical_analysis.py

def perform_statistical_analysis(
    kpis_data: List[Dict],
    events_data: List[Dict],
    daily_trends: List[Dict],
    channels_data: Optional[List[Dict]]
) -> Dict[str, Any]:
    """
    1. 지표 간 상관관계 분석
    2. 이벤트-KPI 관계 분석
    3. 잠재적 인과관계 힌트 생성
    """
    
    return {
        "summary": "세션과 전환율 사이에 강한 양의 상관관계 발견",
        "metric_correlations": [
            {
                "metric1": "sessions",
                "metric2": "conversions",
                "correlation": {
                    "coefficient": 0.85,
                    "strength": "강함",
                    "significant": True
                }
            }
        ],
        "event_kpi_relationships": [...],
        "causality_hints": [
            {"metric1": "button_click", "metric2": "purchase"}
        ]
    }
```

### 프롬프트에 데이터 포함

```python
# python-brain/app/langgraph/prompts.py

def build_user_prompt(
    mode: str,
    mart_summary: MartSummary,
    user_message: Optional[str]
) -> str:
    """
    MartSummary를 LLM이 이해할 수 있는 프롬프트로 변환
    """
    
    prompt = f"""
## 분석 데이터 ({start_date} ~ {end_date}, {days}일)
데이터 소스: {data_sources_str}

### KPI 요약
| 지표 | 값 |
|------|-----|
| 총 세션 | {total_sessions:,} |
| 활성 사용자 | {total_users:,} |
| 신규 사용자 | {new_users:,} |

### 채널별 성과
{format_channels(top_channels)}

### 일별 트렌드
{format_daily_trend(daily_trend)}

{statistical_section if statistical_analysis else ""}

## 사용자 질문
**"{user_message}"**
"""
    
    return prompt
```

---

## 데이터베이스 스키마

### schema_version (immutable)

- **source_mappings**, **ga4_event_schemas** 테이블에 `schema_version INTEGER NOT NULL DEFAULT 1` 컬럼이 있다.
- **정책**: Human Confirm 이후 `schema_version`은 변경하지 않는다. 스키마를 바꾸려면 새 버전으로 새 레코드(또는 새 매핑)를 사용한다. Staging/Mart 적재는 이 버전만 참조한다.
- **CSV**: Confirm API에서 `source_mappings`에 `schema_version`(기존 값 유지 또는 1) 설정. Ingest 시 `source_mappings.schema_version`을 읽어 Brain API/Staging에 전달.
- **GA4**: Property 선택 후 `saveEventSchemas`로 `ga4_event_schemas`에 삽입 시 테이블 DEFAULT로 `schema_version = 1` 적용. 연결 확정 시점에 버전이 부여된다.

### 테이블 관계도

```
projects
    │
    ├──▶ ga4_connections (1:1)
    │       └──▶ ga4_event_schemas (1:N)
    │
    ├──▶ csv_datasets (1:N)
    │       └──▶ csv_files (1:N)
    │       └──▶ source_mappings (1:1)
    │
    ├──▶ workspaces (1:N)
    │       └──▶ reports (1:N)
    │       └──▶ chat_messages (1:N)
    │
    ├──▶ metric_definitions (1:N)
    │
    └──▶ 데이터 마트 테이블들
            ├──▶ mart_ga4_metrics
            ├──▶ mart_ga4_daily_kpis
            ├──▶ mart_ga4_channel_daily
            ├──▶ mart_ga4_top_pages_daily
            ├──▶ mart_csv_daily_metrics
            └──▶ mart_events
```

### 주요 인덱스

```sql
-- GA4 메트릭 조회 최적화
CREATE INDEX idx_mart_ga4_metrics_lookup 
  ON mart_ga4_metrics(project_id, date, metric_name);

-- CSV 메트릭 조회 최적화
CREATE INDEX idx_mart_csv_daily_metrics_lookup
  ON mart_csv_daily_metrics(project_id, dataset_id, date);

-- 이벤트 조회 최적화
CREATE INDEX idx_mart_events_lookup
  ON mart_events(project_id, date, event_name);

-- JSONB 검색 최적화 (GIN)
CREATE INDEX idx_mart_events_dimensions
  ON mart_events USING GIN(dimensions jsonb_path_ops);
```

### RLS (Row Level Security)

모든 데이터 마트 테이블에 RLS 적용:

```sql
-- 프로젝트 멤버만 접근 가능
CREATE POLICY "mart_access_policy" ON mart_ga4_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = mart_ga4_metrics.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.status = 'active'
    )
  );
```

### 캐시 vs 자산

- **캐시**(일시): metric_definitions, feature_flags 등 인메모리 TTL 캐시. 쓰기 시 무효화. 상세 정책은 [CACHE_AND_ASSETS.md](./CACHE_AND_ASSETS.md) 참고.
- **자산**(영구): `reports`, `chat_messages`, `analysis_threads`는 DB에 영구 저장; API는 “최신 리포트” 등을 DB 조회로 제공.

---

## 참고

- [Google Analytics Data API](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [LangChain CSV Agent](https://python.langchain.com/docs/integrations/toolkits/csv)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
