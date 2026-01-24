# Side Effect Analysis: Event Data Architecture Implementation
**Date: 2026-01-20**

## Executive Summary

플랜 구현 시 영향받는 파일 **23개**, 신규 생성 파일 **6개**, DB 마이그레이션 **3개** 예상.
가장 큰 리스크는 `probeSchema()` 함수 시그니처 변경으로 인한 호출부 전체 수정.

---

## 1. Impact Matrix

### 1.1 High Impact (Breaking Changes)

| 파일 | 변경 유형 | 영향도 | 의존성 |
|------|----------|--------|--------|
| `src/lib/csv/probe.ts` | 함수 시그니처 변경 | **HIGH** | 호출부 1곳 |
| `src/lib/ga4/api.ts` | 함수 시그니처 변경 + 신규 API 추가 | **HIGH** | 호출부 2곳 |
| `src/lib/langgraph/prompts.ts` | 함수 시그니처 변경 | **HIGH** | 호출부 1곳 |
| `src/lib/langgraph/nodes.ts` | 쿼리 로직 대폭 변경 | **HIGH** | 내부 변경 |

### 1.2 Medium Impact (Additive Changes)

| 파일 | 변경 유형 | 영향도 |
|------|----------|--------|
| `src/types/database.ts` | 새 테이블 타입 추가 | MEDIUM |
| `src/app/api/projects/[projectId]/csv/datasets/[datasetId]/probe/route.ts` | ProjectProfile 전달 로직 추가 | MEDIUM |
| `src/app/api/workspaces/[workspaceId]/agent/route.ts` | MetricDefinitions 로드 추가 | MEDIUM |
| `src/lib/langgraph/graph.ts` | 새 파라미터 전달 | MEDIUM |

### 1.3 Low Impact (New Files Only)

| 파일 | 설명 |
|------|------|
| `src/lib/templates/industry-kpis.ts` | 새 파일 - 산업별 KPI 템플릿 |
| `src/lib/semantic/metric-definitions.ts` | 새 파일 - 시맨틱 레이어 로직 |
| `src/lib/ga4/events.ts` | 새 파일 - 이벤트 수집 로직 분리 |

---

## 2. Detailed Dependency Analysis

### 2.1 `probeSchema()` 함수 변경

**현재 시그니처:**
```typescript
// src/lib/csv/probe.ts
export async function probeSchema(
  headers: string[],
  sampleRows: string[][],
  language: 'ko' | 'en' = 'ko'
): Promise<ProbeResult>
```

**변경 후 시그니처:**
```typescript
export async function probeSchema(
  headers: string[],
  sampleRows: string[][],
  language: 'ko' | 'en' = 'ko',
  projectProfile?: ProjectProfile  // NEW
): Promise<ProbeResult>
```

**호출부 (수정 필요):**
```
src/app/api/projects/[projectId]/csv/datasets/[datasetId]/probe/route.ts:80
  현재: const probeResult = await probeSchema(headers, sampleRows, language)
  변경: const probeResult = await probeSchema(headers, sampleRows, language, project.profile)
```

**사이드이펙트:**
- 선택적 파라미터로 추가하므로 기존 호출 정상 작동 (하위 호환)
- 단, Project 정보를 함께 조회해야 함 → 추가 DB 쿼리 1회

---

### 2.2 `getGA4Analytics()` 함수 변경

**현재 시그니처:**
```typescript
// src/lib/ga4/api.ts
export async function getGA4Analytics(
  projectId: string,
  propertyId: string,
  startDate: string,
  endDate: string
)
```

**변경 후 시그니처:**
```typescript
export async function getGA4Analytics(
  projectId: string,
  propertyId: string,
  startDate: string,
  endDate: string,
  projectProfile?: ProjectProfile  // NEW
)
```

**호출부 (수정 필요):**
```
src/lib/ga4/api.ts:217 (refreshMartData 내부)
src/app/api/projects/[projectId]/refresh/route.ts (간접 호출)
```

**사이드이펙트:**
- 선택적 파라미터 → 하위 호환
- 이벤트 데이터 추가 수집 → API 호출 증가 (현재 3회 → 5회)
- GA4 API quota 소비 증가

---

### 2.3 `buildSystemPrompt()` 함수 변경

**현재 시그니처:**
```typescript
// src/lib/langgraph/prompts.ts
export function buildSystemPrompt(
  language: 'ko' | 'en',
  purpose: WorkspacePurpose,
  profile: ProjectProfile,
  mode: 'report' | 'chat' = 'report'
): string
```

**변경 후 시그니처:**
```typescript
export function buildSystemPrompt(
  language: 'ko' | 'en',
  purpose: WorkspacePurpose,
  profile: ProjectProfile,
  metricDefinitions: MetricDefinition[],  // NEW
  mode: 'report' | 'chat' = 'report'
): string
```

**호출부 (수정 필요):**
```
src/lib/langgraph/graph.ts:69-73
  현재: const systemPrompt = buildSystemPrompt(state.language, state.workspacePurpose, state.projectProfile, state.mode)
  변경: const systemPrompt = buildSystemPrompt(state.language, state.workspacePurpose, state.projectProfile, state.metricDefinitions, state.mode)
```

**사이드이펙트:**
- **Breaking Change** - 필수 파라미터 추가
- `AnalysisState` 타입에 `metricDefinitions` 필드 추가 필요
- `loadContextAndMartSummary` 노드에서 metric_definitions 조회 추가

---

### 2.4 `loadContextAndMartSummary()` 노드 변경

**현재 로직:**
```typescript
// src/lib/langgraph/nodes.ts:57-380
// GA4 mart 테이블들 직접 조회 → 하드코딩된 메트릭 집계
```

**변경 후 로직:**
```typescript
// 1. metric_definitions 테이블 조회 (프로젝트별 정의된 메트릭)
// 2. 정의된 메트릭 기반으로 mart 테이블 쿼리 동적 생성
// 3. 시맨틱 레이어 컨텍스트 포함하여 반환
```

**사이드이펙트:**
- 쿼리 복잡도 증가 (단순 조회 → 동적 쿼리)
- `metric_definitions` 테이블 없으면 fallback 로직 필요
- 기존 하드코딩된 집계 로직 유지 (하위 호환)

---

## 3. Database Migration Plan

### 3.1 New Tables

```sql
-- Migration 1: metric_definitions
CREATE TABLE metric_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  source_type TEXT NOT NULL,
  source_table TEXT,
  source_column TEXT,
  formula TEXT,
  dependencies JSONB,
  aggregation TEXT DEFAULT 'sum',
  data_type TEXT DEFAULT 'number',
  synonyms TEXT[],
  example_questions TEXT[],
  priority INTEGER DEFAULT 3,
  is_from_profile BOOLEAN DEFAULT false,
  matched_goal TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, name)
);

-- RLS Policy
ALTER TABLE metric_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metric_definitions_project_member" ON metric_definitions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = metric_definitions.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.status = 'active'
    )
  );
```

```sql
-- Migration 2: mart_events
CREATE TABLE mart_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  date DATE NOT NULL,
  event_name TEXT NOT NULL,
  event_params JSONB DEFAULT '{}',
  event_count BIGINT DEFAULT 0,
  unique_users BIGINT DEFAULT 0,
  events_per_user NUMERIC(10,4),
  dimensions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, source, date, event_name, dimensions)
);

CREATE INDEX idx_mart_events_lookup ON mart_events(project_id, date, event_name);
CREATE INDEX idx_mart_events_dimensions ON mart_events USING GIN(dimensions);
```

```sql
-- Migration 3: GA4 retention 컬럼 추가
ALTER TABLE mart_ga4_daily_kpis 
  ADD COLUMN IF NOT EXISTS dau_per_mau NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS dau_per_wau NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS wau_per_mau NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS active_1day_users INTEGER,
  ADD COLUMN IF NOT EXISTS active_7day_users INTEGER,
  ADD COLUMN IF NOT EXISTS active_28day_users INTEGER;
```

### 3.2 Migration Rollback Plan

```sql
-- Rollback Migration 1
DROP TABLE IF EXISTS metric_definitions CASCADE;

-- Rollback Migration 2
DROP TABLE IF EXISTS mart_events CASCADE;

-- Rollback Migration 3
ALTER TABLE mart_ga4_daily_kpis 
  DROP COLUMN IF EXISTS dau_per_mau,
  DROP COLUMN IF EXISTS dau_per_wau,
  DROP COLUMN IF EXISTS wau_per_mau,
  DROP COLUMN IF EXISTS active_1day_users,
  DROP COLUMN IF EXISTS active_7day_users,
  DROP COLUMN IF EXISTS active_28day_users;
```

---

## 4. Risk Assessment

### 4.1 High Risk Areas

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| GA4 API quota 초과 | 데이터 수집 실패 | 이벤트 수집을 별도 batch job으로 분리 |
| metric_definitions 없는 기존 프로젝트 | 분석 실패 | fallback 로직으로 기존 방식 유지 |
| buildSystemPrompt Breaking Change | 컴파일 에러 | 모든 호출부 동시 수정 필요 |

### 4.2 Medium Risk Areas

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| LLM 프롬프트 길이 증가 | 토큰 비용 증가 | 메트릭 수 제한 (상위 10개) |
| 쿼리 복잡도 증가 | 응답 시간 증가 | 캐싱 레이어 추가 고려 |
| 산업 템플릿 오분류 | 잘못된 KPI 추천 | 사용자 확인 단계 유지 |

---

## 5. Implementation Order (Optimized)

사이드이펙트 최소화를 위한 순서:

### Phase 1: Foundation (Breaking Change 없음)
1. `industry-kpis.ts` 생성 (새 파일)
2. `metric_definitions` 테이블 마이그레이션
3. `mart_events` 테이블 마이그레이션
4. `src/types/database.ts` 타입 추가

### Phase 2: GA4 Expansion (선택적 파라미터)
5. `mart_ga4_daily_kpis` 컬럼 추가 마이그레이션
6. `src/lib/ga4/api.ts` - Retention 메트릭 수집 추가
7. `src/lib/ga4/api.ts` - Event 데이터 수집 추가 (선택적)

### Phase 3: Schema Inference Enhancement (선택적 파라미터)
8. `src/lib/csv/probe.ts` - projectProfile 파라미터 추가
9. `src/app/api/.../probe/route.ts` - Profile 전달 로직 추가

### Phase 4: Semantic Layer Integration (Breaking Change)
10. `src/lib/langgraph/types.ts` - AnalysisState에 metricDefinitions 추가
11. `src/lib/langgraph/prompts.ts` - 시그니처 변경
12. `src/lib/langgraph/graph.ts` - 호출부 수정
13. `src/lib/langgraph/nodes.ts` - metric_definitions 조회 추가

### Phase 5: Auto-generation Logic
14. 프로젝트 생성/Profile 수정 시 metric_definitions 자동 생성
15. 기존 프로젝트 마이그레이션 스크립트

---

## 6. Testing Checklist

### Unit Tests
- [ ] `probeSchema()` - projectProfile 없이 호출 시 정상 작동
- [ ] `probeSchema()` - projectProfile 있을 때 KPI 우선순위 반영
- [ ] `getGA4Analytics()` - 기존 파라미터로 호출 시 정상 작동
- [ ] `buildSystemPrompt()` - metricDefinitions 포함 시 프롬프트 정상 생성

### Integration Tests
- [ ] CSV 업로드 → 프로브 → 매핑 확인 플로우
- [ ] GA4 연결 → 데이터 수집 → 리텐션 메트릭 확인
- [ ] 리포트 생성 → 시맨틱 레이어 KPI 반영 확인

### E2E Tests
- [ ] 새 프로젝트 생성 → Profile 입력 → metric_definitions 자동 생성
- [ ] 기존 프로젝트 접근 → fallback 로직 정상 작동

---

## 7. Rollback Strategy

### Immediate Rollback (코드)
```bash
git revert <commit-hash>  # 해당 커밋만 되돌리기
```

### DB Rollback
```bash
supabase db reset  # 개발 환경
# 또는
supabase migration repair --status reverted <migration-id>  # 프로덕션
```

### Feature Flag 고려
```typescript
const USE_SEMANTIC_LAYER = process.env.ENABLE_SEMANTIC_LAYER === 'true'

// 사용 예
if (USE_SEMANTIC_LAYER) {
  // 새 로직
} else {
  // 기존 로직
}
```

---

## 8. Performance Impact Estimation

| 영역 | 현재 | 변경 후 | 차이 |
|------|------|---------|------|
| CSV Probe 시간 | ~2s | ~2.5s | +25% (LLM 프롬프트 길어짐) |
| GA4 데이터 수집 | 3 API calls | 5 API calls | +67% |
| 리포트 생성 시간 | ~3s | ~3.5s | +17% (metric_definitions 조회) |
| DB 쿼리 수 | 4-6 | 6-8 | +33% |

**최적화 방안:**
1. `metric_definitions` 캐싱 (프로젝트별 5분)
2. GA4 이벤트 수집을 별도 background job으로 분리
3. 시맨틱 레이어 쿼리 결과 캐싱

---

## 9. Summary

| 항목 | 수치 |
|------|------|
| 영향받는 파일 수 | 23개 |
| 신규 생성 파일 | 6개 |
| DB 마이그레이션 | 3개 |
| Breaking Changes | 1개 (`buildSystemPrompt`) |
| 예상 구현 시간 | 전체 플랜 약 8-12시간 |

**권장 사항:**
- Phase별로 구현 후 각 단계에서 테스트
- Phase 4 (Breaking Change) 전에 반드시 Phase 1-3 완료 확인
- Feature Flag 사용하여 점진적 롤아웃 고려
