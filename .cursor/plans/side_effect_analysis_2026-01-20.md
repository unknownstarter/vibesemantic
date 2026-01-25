# Side Effect Analysis: Event Data Architecture Implementation
**Date: 2026-01-20**
**Updated: 2026-01-24** (권장사항 반영)

## Executive Summary

플랜 구현 시 영향받는 파일 **23개**, 신규 생성 파일 **7개**, DB 마이그레이션 **4개** 예상.
~~가장 큰 리스크는 `probeSchema()` 함수 시그니처 변경으로 인한 호출부 전체 수정.~~
**수정:** Options 객체 패턴 적용으로 Breaking Change 제거. 모든 변경이 하위 호환 가능.

---

## 1. Impact Matrix

### 1.1 High Impact (Breaking Changes)

| 파일 | 변경 유형 | 영향도 | 의존성 |
|------|----------|--------|--------|
| `src/lib/csv/probe.ts` | 함수 시그니처 변경 | **HIGH** | 호출부 1곳 |
| `src/lib/ga4/api.ts` | 함수 시그니처 변경 + 신규 API 추가 | **HIGH** | 호출부 2곳 |
| ~~`src/lib/langgraph/prompts.ts`~~ | ~~함수 시그니처 변경~~ | ~~**HIGH**~~ | ~~호출부 1곳~~ |
| `src/lib/langgraph/prompts.ts` | Options 객체 패턴으로 변경 (하위 호환) | **MEDIUM** | 호출부 1곳 |
| `src/lib/langgraph/nodes.ts` | 쿼리 로직 대폭 변경 | **HIGH** | 내부 변경 |

### 1.2 Medium Impact (Additive Changes)

| 파일 | 변경 유형 | 영향도 |
|------|----------|--------|
| `src/types/database.ts` | 새 테이블 타입 추가 | MEDIUM |
| `src/app/api/projects/[projectId]/csv/datasets/[datasetId]/probe/route.ts` | ProjectProfile 전달 로직 추가 | MEDIUM |
| `src/app/api/workspaces/[workspaceId]/agent/route.ts` | MetricDefinitions 로드 추가 | MEDIUM |
| `src/lib/langgraph/graph.ts` | 새 파라미터 전달 | MEDIUM |
| `src/lib/langgraph/types.ts` | MartSummary에 metricDefinitions 추가 | MEDIUM |

### 1.3 Low Impact (New Files Only)

| 파일 | 설명 |
|------|------|
| `src/lib/templates/industry-kpis.ts` | 새 파일 - 산업별 KPI 템플릿 |
| `src/lib/semantic/metric-definitions.ts` | 새 파일 - 시맨틱 레이어 로직 |
| `src/lib/ga4/events.ts` | 새 파일 - 이벤트 수집 로직 분리 |
| `src/lib/cache/metric-cache.ts` | 새 파일 - 메트릭 정의 캐싱 레이어 |

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
- GA4 API quota 소비 증가 (아래 2.5 참조)

---

### 2.3 `buildSystemPrompt()` 함수 변경 (Options 객체 패턴)

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

**변경 후 시그니처 (Options 객체 패턴):**
```typescript
interface BuildPromptOptions {
  language: 'ko' | 'en'
  purpose: WorkspacePurpose
  profile: ProjectProfile
  metricDefinitions?: MetricDefinition[]  // NEW - optional
  mode?: 'report' | 'chat'  // default: 'report'
}

export function buildSystemPrompt(options: BuildPromptOptions): string
```

**호출부 (수정 필요):**
```typescript
// src/lib/langgraph/graph.ts:70-75
// 현재:
const systemPrompt = buildSystemPrompt(
  state.language,
  state.workspacePurpose,
  state.projectProfile,
  state.mode
)

// 변경 후:
const systemPrompt = buildSystemPrompt({
  language: state.language,
  purpose: state.workspacePurpose,
  profile: state.projectProfile,
  metricDefinitions: state.martSummary?.metricDefinitions,
  mode: state.mode
})
```

**사이드이펙트:**
- ~~**Breaking Change** - 필수 파라미터 추가~~
- **하위 호환 가능** - `metricDefinitions`가 optional이므로 기존 호출도 정상 작동
- 점진적 마이그레이션 가능 (기존 호출 → Options 패턴으로 순차 전환)

---

### 2.4 `MartSummary` 타입 확장 (AnalysisState 대신)

**현재:**
```typescript
// src/lib/langgraph/types.ts
export interface MartSummary {
  period: { start: string; end: string; days: number }
  kpis: { ... }
  topChannels: Array<{ ... }>
  // ...
}
```

**변경 후:**
```typescript
export interface MartSummary {
  period: { start: string; end: string; days: number }
  kpis: { ... }
  topChannels: Array<{ ... }>
  // ...기존 필드

  // NEW: Semantic Layer
  metricDefinitions?: MetricDefinition[]
}
```

**장점:**
- `AnalysisState`에 직접 추가하는 것보다 일관성 있음 (`csvMetrics`도 `MartSummary`에 있음)
- `MartSummary`가 "LLM에 전달할 컨텍스트" 역할을 명확히 함
- State 크기 증가를 `MartSummary` 내부로 격리

---

### 2.5 GA4 API Quota 관리 전략 (신규)

**문제:**
- 현재: 3 API calls per refresh
- 변경 후: 5 API calls per refresh (+67%)
- GA4 Data API 기본 quota: 200 requests/user/day

**완화 전략:**

```typescript
// src/lib/ga4/rate-limiter.ts (신규)
import { RateLimiter } from 'limiter'

const ga4Limiter = new RateLimiter({
  tokensPerInterval: 10,    // 10 requests
  interval: 'second',       // per second
})

export async function withGA4RateLimit<T>(
  fn: () => Promise<T>
): Promise<T> {
  await ga4Limiter.removeTokens(1)
  return fn()
}

// 재시도 로직
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      if (isQuotaError(error)) {
        await sleep(baseDelay * Math.pow(2, i))
      }
    }
  }
  throw new Error('Max retries exceeded')
}
```

**이벤트 수집 분리:**
```typescript
// 기본 KPI 수집 (필수, 동기)
await getGA4Analytics(projectId, propertyId, startDate, endDate)

// 이벤트 수집 (선택, 비동기 background job)
await queueEventCollection(projectId, propertyId, startDate, endDate)
```

---

### 2.6 `loadContextAndMartSummary()` 노드 변경

**현재 로직:**
```typescript
// src/lib/langgraph/nodes.ts:57-380
// GA4 mart 테이블들 직접 조회 → 하드코딩된 메트릭 집계
```

**변경 후 로직:**
```typescript
// 1. metric_definitions 캐시 조회 (없으면 DB 조회 후 캐싱)
const metricDefs = await getCachedMetricDefinitions(projectId)

// 2. 정의된 메트릭 기반으로 mart 테이블 쿼리 동적 생성
// 3. MartSummary에 metricDefinitions 포함하여 반환
return {
  ...existingMartSummary,
  metricDefinitions: metricDefs
}
```

**사이드이펙트:**
- 쿼리 복잡도 증가 (단순 조회 → 동적 쿼리)
- `metric_definitions` 테이블 없으면 fallback 로직 필요
- 기존 하드코딩된 집계 로직 유지 (하위 호환)
- **캐싱으로 성능 영향 최소화** (Phase 1에서 구현)

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

-- 캐시 무효화를 위한 updated_at 트리거
ALTER TABLE metric_definitions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
CREATE OR REPLACE FUNCTION update_metric_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER metric_definitions_updated_at
  BEFORE UPDATE ON metric_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_metric_definitions_updated_at();
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
-- jsonb_path_ops: @> 연산자에 최적화, 인덱스 크기 작음
CREATE INDEX idx_mart_events_dimensions ON mart_events USING GIN(dimensions jsonb_path_ops);
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

```sql
-- Migration 4: projects 테이블에 feature flags 추가
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}';

COMMENT ON COLUMN projects.feature_flags IS
  'Project-level feature flags. Example: {"semanticLayer": true, "eventCollection": false}';
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

-- Rollback Migration 4
ALTER TABLE projects DROP COLUMN IF EXISTS feature_flags;
```

---

## 4. New File Specifications

### 4.1 `src/lib/semantic/metric-definitions.ts` 상세 스펙

```typescript
import type { MetricDefinition, ProjectProfile } from '@/types/database'
import { getIndustryKPIs } from '@/lib/templates/industry-kpis'
import { getCachedMetricDefinitions, invalidateMetricCache } from '@/lib/cache/metric-cache'

/**
 * 프로젝트 프로필 기반으로 metric_definitions 자동 생성
 */
export async function generateMetricDefinitions(
  projectId: string,
  profile: ProjectProfile
): Promise<MetricDefinition[]> {
  // 1. 산업별 기본 KPI 가져오기
  const industryKPIs = getIndustryKPIs(profile.industry)

  // 2. 프로필 goals와 매칭
  const matchedKPIs = matchGoalsToKPIs(profile.goals, industryKPIs)

  // 3. DB에 저장
  const definitions = await saveMetricDefinitions(projectId, matchedKPIs)

  // 4. 캐시 무효화
  await invalidateMetricCache(projectId)

  return definitions
}

/**
 * 기존 프로젝트에 대한 metric_definitions 생성 (마이그레이션용)
 */
export async function migrateExistingProject(
  projectId: string
): Promise<{ created: number; skipped: number }> {
  // 이미 metric_definitions가 있으면 스킵
  const existing = await getCachedMetricDefinitions(projectId)
  if (existing.length > 0) {
    return { created: 0, skipped: existing.length }
  }

  // 프로젝트 프로필 조회
  const project = await getProject(projectId)
  if (!project?.profile) {
    return { created: 0, skipped: 0 }
  }

  // 생성
  const definitions = await generateMetricDefinitions(projectId, project.profile)
  return { created: definitions.length, skipped: 0 }
}

/**
 * LLM 프롬프트용 메트릭 정의 포맷팅
 */
export function formatMetricsForPrompt(
  definitions: MetricDefinition[],
  maxCount = 10
): string {
  const prioritized = definitions
    .filter(d => d.is_active)
    .sort((a, b) => (a.priority ?? 3) - (b.priority ?? 3))
    .slice(0, maxCount)

  return prioritized.map(d =>
    `- ${d.display_name}: ${d.description || d.name} (${d.category})`
  ).join('\n')
}

// Private helpers
function matchGoalsToKPIs(goals: string[] | undefined, kpis: IndustryKPI[]): MetricDefinition[] { ... }
function saveMetricDefinitions(projectId: string, kpis: MetricDefinition[]): Promise<MetricDefinition[]> { ... }
```

### 4.2 `src/lib/cache/metric-cache.ts` 상세 스펙

```typescript
import { createClient } from '@/lib/supabase/server'
import type { MetricDefinition } from '@/types/database'

// In-memory cache (프로세스 내 캐싱, 프로덕션에서는 Redis 권장)
const cache = new Map<string, { data: MetricDefinition[]; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5분

/**
 * 캐시된 metric_definitions 조회
 */
export async function getCachedMetricDefinitions(
  projectId: string
): Promise<MetricDefinition[]> {
  const cacheKey = `metrics:${projectId}`
  const cached = cache.get(cacheKey)

  // 캐시 히트
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  // 캐시 미스 - DB 조회
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('metric_definitions')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .order('priority', { ascending: true })

  if (error) {
    console.error('Failed to fetch metric definitions:', error)
    return []
  }

  // 캐시 저장
  cache.set(cacheKey, {
    data: data ?? [],
    expiresAt: Date.now() + CACHE_TTL_MS
  })

  return data ?? []
}

/**
 * 캐시 무효화 (metric_definitions 변경 시 호출)
 */
export async function invalidateMetricCache(projectId: string): Promise<void> {
  const cacheKey = `metrics:${projectId}`
  cache.delete(cacheKey)
}

/**
 * 전체 캐시 클리어 (개발/디버깅용)
 */
export function clearAllMetricCache(): void {
  cache.clear()
}
```

---

## 5. Risk Assessment

### 5.1 High Risk Areas

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| GA4 API quota 초과 | 데이터 수집 실패 | Rate limiter + 이벤트 수집 비동기 분리 (2.5 참조) |
| metric_definitions 없는 기존 프로젝트 | 분석 실패 | fallback 로직으로 기존 방식 유지 + 마이그레이션 스크립트 |
| ~~buildSystemPrompt Breaking Change~~ | ~~컴파일 에러~~ | ~~모든 호출부 동시 수정 필요~~ |
| **제거됨** - Options 객체 패턴으로 하위 호환 | - | - |

### 5.2 Medium Risk Areas

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| LLM 프롬프트 길이 증가 | 토큰 비용 증가 | 메트릭 수 제한 (상위 10개) |
| 쿼리 복잡도 증가 | 응답 시간 증가 | **Phase 1에서 캐싱 레이어 구현** |
| 산업 템플릿 오분류 | 잘못된 KPI 추천 | 사용자 확인 단계 유지 |

---

## 6. Implementation Order (Optimized)

사이드이펙트 최소화를 위한 순서:

### Phase 1: Foundation + Caching (Breaking Change 없음)
1. `industry-kpis.ts` 생성 (새 파일)
2. `metric_definitions` 테이블 마이그레이션 (updated_at 트리거 포함)
3. `mart_events` 테이블 마이그레이션 (jsonb_path_ops 인덱스)
4. `projects.feature_flags` 컬럼 추가 마이그레이션
5. `src/types/database.ts` 타입 추가
6. **`src/lib/cache/metric-cache.ts` 생성 (캐싱 인프라)**
7. **`src/lib/semantic/metric-definitions.ts` 생성**

### Phase 2: GA4 Expansion (선택적 파라미터)
8. `mart_ga4_daily_kpis` 컬럼 추가 마이그레이션
9. `src/lib/ga4/rate-limiter.ts` 생성 (Rate limiting + Retry)
10. `src/lib/ga4/api.ts` - Retention 메트릭 수집 추가
11. `src/lib/ga4/api.ts` - Event 데이터 수집 추가 (선택적, 비동기)

### Phase 3: Schema Inference Enhancement (선택적 파라미터)
12. `src/lib/csv/probe.ts` - projectProfile 파라미터 추가
13. `src/app/api/.../probe/route.ts` - Profile 전달 로직 추가

### Phase 4: Semantic Layer Integration (하위 호환)
14. `src/lib/langgraph/types.ts` - **MartSummary에 metricDefinitions 추가**
15. `src/lib/langgraph/prompts.ts` - **Options 객체 패턴으로 변경**
16. `src/lib/langgraph/graph.ts` - 호출부 수정
17. `src/lib/langgraph/nodes.ts` - metric_definitions 조회 추가 (캐시 사용)

### Phase 5: Auto-generation & Migration
18. 프로젝트 생성/Profile 수정 시 metric_definitions 자동 생성
19. 기존 프로젝트 마이그레이션 스크립트 실행

---

## 7. Existing Project Migration Script

### 7.1 마이그레이션 스크립트

```typescript
// scripts/migrate-metric-definitions.ts
import { createClient } from '@supabase/supabase-js'
import { migrateExistingProject } from '@/lib/semantic/metric-definitions'

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // admin 권한 필요
  )

  // 모든 프로젝트 조회 (profile이 있는 것만)
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, profile')
    .not('profile', 'is', null)

  if (error) {
    console.error('Failed to fetch projects:', error)
    process.exit(1)
  }

  console.log(`Found ${projects.length} projects to migrate`)

  let totalCreated = 0
  let totalSkipped = 0

  for (const project of projects) {
    console.log(`Migrating project: ${project.name} (${project.id})`)

    try {
      const result = await migrateExistingProject(project.id)
      totalCreated += result.created
      totalSkipped += result.skipped
      console.log(`  Created: ${result.created}, Skipped: ${result.skipped}`)
    } catch (err) {
      console.error(`  Failed:`, err)
    }
  }

  console.log(`\nMigration complete:`)
  console.log(`  Total created: ${totalCreated}`)
  console.log(`  Total skipped: ${totalSkipped}`)
}

main()
```

### 7.2 실행 방법

```bash
# 개발 환경
npx tsx scripts/migrate-metric-definitions.ts

# 프로덕션 (dry-run 먼저)
DRY_RUN=true npx tsx scripts/migrate-metric-definitions.ts
npx tsx scripts/migrate-metric-definitions.ts
```

---

## 8. Testing Checklist

### Unit Tests
- [ ] `probeSchema()` - projectProfile 없이 호출 시 정상 작동
- [ ] `probeSchema()` - projectProfile 있을 때 KPI 우선순위 반영
- [ ] `getGA4Analytics()` - 기존 파라미터로 호출 시 정상 작동
- [ ] `buildSystemPrompt()` - 기존 방식 호출 시 정상 작동 (하위 호환)
- [ ] `buildSystemPrompt()` - metricDefinitions 포함 시 프롬프트 정상 생성
- [ ] `getCachedMetricDefinitions()` - 캐시 히트/미스 동작 확인
- [ ] `invalidateMetricCache()` - 캐시 무효화 확인

### Integration Tests
- [ ] CSV 업로드 → 프로브 → 매핑 확인 플로우
- [ ] GA4 연결 → 데이터 수집 → 리텐션 메트릭 확인
- [ ] 리포트 생성 → 시맨틱 레이어 KPI 반영 확인
- [ ] GA4 API rate limiting 동작 확인

### E2E Tests
- [ ] 새 프로젝트 생성 → Profile 입력 → metric_definitions 자동 생성
- [ ] 기존 프로젝트 접근 → fallback 로직 정상 작동
- [ ] 마이그레이션 스크립트 → 기존 프로젝트 metric_definitions 생성

---

## 9. Rollback Strategy

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

### Feature Flag (DB 기반)

```typescript
// src/lib/feature-flags.ts
import { createClient } from '@/lib/supabase/server'

interface FeatureFlags {
  semanticLayer?: boolean
  eventCollection?: boolean
}

export async function getProjectFeatureFlags(
  projectId: string
): Promise<FeatureFlags> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projects')
    .select('feature_flags')
    .eq('id', projectId)
    .single()

  return (data?.feature_flags as FeatureFlags) ?? {}
}

export async function isSemanticLayerEnabled(projectId: string): Promise<boolean> {
  const flags = await getProjectFeatureFlags(projectId)
  return flags.semanticLayer ?? false
}

// 사용 예
if (await isSemanticLayerEnabled(projectId)) {
  // 새 로직
} else {
  // 기존 로직
}
```

**장점:**
- 프로젝트별로 다르게 활성화 가능
- 런타임에 DB 업데이트로 즉시 반영
- A/B 테스트 가능

---

## 10. Performance Impact Estimation

| 영역 | 현재 | 변경 후 | 차이 | 최적화 후 |
|------|------|---------|------|----------|
| CSV Probe 시간 | ~2s | ~2.5s | +25% | ~2.5s (캐싱 해당 없음) |
| GA4 데이터 수집 | 3 API calls | 5 API calls | +67% | 3+2 async (비동기 분리) |
| 리포트 생성 시간 | ~3s | ~3.5s | +17% | **~3.1s** (캐싱) |
| DB 쿼리 수 | 4-6 | 6-8 | +33% | **5-6** (캐싱) |

**최적화 적용 결과:**
1. `metric_definitions` 캐싱 (프로젝트별 5분) → DB 쿼리 1회 절약
2. GA4 이벤트 수집을 별도 background job으로 분리 → 동기 호출 증가 없음
3. 시맨틱 레이어 쿼리 결과는 `MartSummary`에 포함되어 추가 쿼리 없음

---

## 11. Summary

| 항목 | 수치 |
|------|------|
| 영향받는 파일 수 | 23개 |
| 신규 생성 파일 | 7개 (+1: metric-cache.ts) |
| DB 마이그레이션 | 4개 (+1: feature_flags) |
| ~~Breaking Changes~~ | ~~1개 (`buildSystemPrompt`)~~ |
| Breaking Changes | **0개** (Options 패턴 적용) |
| 예상 구현 시간 | 전체 플랜 약 8-12시간 |

**주요 변경점 (2026-01-24):**
- `buildSystemPrompt` Options 객체 패턴 적용 → Breaking Change 제거
- `metricDefinitions`를 `MartSummary`에 포함 → 일관성 확보
- 캐싱 레이어를 Phase 1으로 이동 → 성능 저하 방지
- `mart_events` 인덱스에 `jsonb_path_ops` 적용 → 쿼리 최적화
- Feature Flag를 DB 기반으로 변경 → 프로젝트별 제어 가능
- GA4 Rate Limiter 추가 → API quota 관리
- 마이그레이션 스크립트 상세 스펙 추가

**권장 사항:**
- Phase별로 구현 후 각 단계에서 테스트
- ~~Phase 4 (Breaking Change) 전에 반드시 Phase 1-3 완료 확인~~
- 모든 Phase가 하위 호환되므로 점진적 배포 가능
- Feature Flag 사용하여 프로젝트별 점진적 롤아웃
