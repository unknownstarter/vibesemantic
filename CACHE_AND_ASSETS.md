# 캐시 vs 자산 저장소 정책 (Epic 6.1)

**목적**: 일시적 캐시(ephemeral cache)와 영구 자산(durable assets)을 구분하고, 무효화·보존·확장 정책을 일관되게 적용한다.

---

## 1. 정의

| 구분 | 캐시 (Cache) | 자산 (Assets) |
|------|--------------|----------------|
| **저장소** | 인메모리(Map) 또는 Redis 등 | PostgreSQL( Supabase ) |
| **목적** | DB/계산 부하 감소, 응답 속도 개선 | 사용자·시스템이 생성한 결과의 영구 보관 |
| **수명** | TTL 기반 만료 또는 무효화 시 삭제 | 명시적 보존 정책까지 유지 |
| **무효화** | 스키마/설정 변경 시 즉시 invalidate | 자산은 “덮어쓰기” 또는 retention 정책으로만 관리 |
| **멀티 인스턴스** | 단일 인스턴스 메모리는 공유 안 됨 → Redis 검토( Task 6.3 ) | DB는 이미 공유됨 |

---

## 2. 현재 사용처

### 2.1 캐시 (Ephemeral)

| 대상 | 위치 | TTL | 무효화 시점 |
|------|------|-----|-------------|
| **metric_definitions** | `src/lib/cache/metric-cache.ts` | 5분 | 정의 CRUD 시 `invalidateMetricCache(projectId)` |
| **feature_flags** | `src/lib/feature-flags.ts` | 1분 | 플래그 변경 시 `invalidateFlagsCache(projectId)` |

**규칙**

- 캐시 키는 프로젝트(또는 워크스페이스) 단위로 일관되게 사용한다.
- **쓰기 발생 시 반드시 해당 스코프 캐시를 invalidate**한다. (metric-definitions.ts, feature-flags 갱신 API 등)
- TTL은 “최대 신선도”만 보장한다. 무효화가 우선이다.

### 2.2 자산 (Durable)

| 대상 | 테이블 | 설명 | 조회 API |
|------|--------|------|-----------|
| **리포트** | `reports` | Report 모드 생성 결과. `metadata`에 `range`, `workspace_id`, `generated_at` 명시 | `GET /api/workspaces/[id]/report`, `?list=1` 목록 |
| **채팅 메시지** | `chat_messages` | 스레드별 user/assistant 메시지 | 스레드 로드 시 |
| **스레드 메타** | `analysis_threads` | 워크스페이스·스레드별 last_range, last_snapshot_at | `GET /api/workspaces/[id]/threads` |

**규칙**

- 자산은 “캐시”가 아니라 **저장소**이다. UI에서 “캐시된 리포트 로드”는 “**최신 리포트 자산**을 DB에서 조회”하는 동작이다.
- 새 리포트 생성 시 `reports`에 insert; 기존 리포트는 retention 정책이 도입되기 전까지 유지(목록/과거 조회 가능).
- 채팅/스레드는 사용자 단위 데이터이므로 삭제·만료 정책은 향후 개인정보·스토리지 정책에 맞춰 도입한다.

---

## 3. 정책 요약

1. **캐시**
   - 읽기: 캐시 히트 시 반환, 미스 시 DB 조회 후 캐시에 저장.
   - 쓰기: metric_definitions / feature_flags 변경 시 해당 프로젝트 캐시 무효화.
   - 다중 인스턴스 운영 시 인메모리 캐시는 인스턴스 간 공유되지 않음 → Task 6.3에서 Redis(또는 동등) 검토.

2. **자산**
   - 쓰기: Report 모드 결과 → `reports` insert; 채팅 → `chat_messages` insert, `analysis_threads` upsert.
   - 읽기: 항상 DB에서 조회. “최신 리포트”는 `workspace_id` + `range` 기준 최신 1건 조회로 구현.
   - retention: 현재는 무제한 보존. 추후 `reports`/`chat_messages` 보존 기간 정책 추가 시 이 문서에 명시.

3. **용어**
   - 코드/API에서 “cached report”는 “**저장된 최신 리포트 자산**”을 의미하며, 인메모리 캐시가 아니다. 혼동 방지를 위해 주석/문서에서 “latest report asset”로 풀어서 써도 된다.

---

## 4. 멀티 인스턴스 캐시 검토 (Epic 6.3)

Next.js가 Vercel 등에서 **다중 인스턴스/서버리스**로 동작하면, 인메모리 `Map`은 인스턴스마다 따로 있어서 캐시가 공유되지 않는다. 같은 프로젝트 요청이 다른 인스턴스로 가면 캐시 미스가 반복되고, 한 인스턴스에서 `invalidateMetricCache(projectId)`를 호출해도 다른 인스턴스의 캐시는 갱신되지 않는다.

### 4.1 옵션 비교

| 옵션 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **현재 (인메모리)** | `Map` 기반, 인스턴스당 1개 | 구현 단순, 비용·지연 없음 | 멀티 인스턴스 시 비공유·무효화 불일치 |
| **Upstash Redis** | Serverless Redis (HTTP 기반) | Vercel 연동 용이, TTL·무효화 공유 | 비용, 네트워크 지연 |
| **Vercel Marketplace Redis** | Redis Cloud 등 연동 | 관리형 Redis, 프로토콜 호환 | 설정·비용 |
| **자체 Redis** | EC2/Cloud Run 등에 Redis 설치 | 완전 제어 | 운영·고가용성 부담 |

- **Upstash**: Vercel KV가 2024년 말 Upstash Redis로 이전됨. Serverless에 맞춘 요금·연동 문서가 있음.
- **무효화**: Redis 사용 시에도 “키 삭제”로 무효화 가능. 여러 인스턴스가 같은 Redis를 보므로 한 번 delete하면 전부 반영된다. Pub/Sub으로 다른 인스턴스에 무효화 알림을 보내는 방식은 선택 사항.

### 4.2 도입 시점

- **단일 인스턴스** 또는 인스턴스 수가 적고, 캐시 불일치가 크게 문제되지 않으면 **현재 인메모리 유지**로 충분하다.
- **다중 인스턴스/서버리스**로 스케일하고, metric_definitions/feature_flags 조회가 잦으며 **캐시 공유·무효화 일관성**이 중요해지면 Redis(또는 동등) 도입을 검토한다.

### 4.3 통합 방식 (추후 구현 시)

캐시 백엔드를 **인터페이스 하나로 추상화**하면, 호출부(metric-cache, feature-flags) 수정 없이 인메모리 ↔ Redis를 바꿀 수 있다.

**계약 예시 (TypeScript)**

```ts
// src/lib/cache/backend.ts (추후 생성)
export interface CacheBackend {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlMs: number): Promise<void>
  delete(key: string): Promise<void>
}
```

- **인메모리 구현**: 현재 `Map` + `expiresAt` 로직을 `CacheBackend`를 구현한 `InMemoryCacheBackend`로 분리.
- **Redis 구현**: `@upstash/redis` 등으로 `get`/`set`/`delete` 호출, TTL은 `set` 시 `px`(ms) 전달. 키 접두사(`metrics:`, `flags:`)는 그대로 사용.
- **metric-cache.ts / feature-flags.ts**: 생성자 또는 전역 설정으로 `CacheBackend`를 받아서 사용. 환경 변수(`CACHE_BACKEND=memory|redis`)로 선택하면 된다.

이렇게 하면 “우선 인메모리로 배포하고, 스케일 시 Redis만 연결”하는 전환이 수월하다.

### 4.4 Upstash Redis 콘솔에서 DB 생성 (첫 설정)

콘솔에 **"No database has been created yet"** 가 보이면:

1. **"+ Create Database"** (녹색 버튼) 클릭
2. **Name**: 예) `vibesemantic-cache`
3. **Region**: 사용자와 가까운 리전 선택 (예: `Asia Pacific (Seoul)` 또는 `US East`)
4. **Create** 후 생성된 DB 클릭
5. **REST API** 탭에서 **UPSTASH_REDIS_REST_URL**, **UPSTASH_REDIS_REST_TOKEN** 복사

**환경 변수는 배포 환경에 반드시 설정해야 합니다.** `.env.local`은 로컬 개발용이며, Vercel 등에 배포된 앱에는 전달되지 않습니다.

| 환경 | 설정 위치 |
|------|------------|
| **로컬 개발** | 프로젝트 루트 `.env.local`에 추가 후 `npm run dev` 재시작 |
| **Vercel (프로덕션)** | [Vercel 대시보드](https://vercel.com) → 프로젝트 선택 → **Settings** → **Environment Variables** 에 아래 변수 추가 후 **Redeploy** |
| **기타 호스팅** | 해당 서비스의 환경 변수 설정 화면에 동일하게 추가 |

**추가할 변수 (이름·값 그대로):**

- `CACHE_BACKEND` = `redis`
- `UPSTASH_REDIS_REST_URL` = Upstash에서 복사한 REST URL
- `UPSTASH_REDIS_REST_TOKEN` = Upstash에서 복사한 REST Token

Vercel에서 변수 추가 후 **Deployments** 탭에서 최신 배포를 **Redeploy** 해야 새 환경 변수가 적용됩니다. (기존 빌드에는 반영되지 않음.)

Redis를 쓰지 않을 때는 위 변수를 넣지 않거나 `CACHE_BACKEND=memory`로 두면 인메모리 캐시만 사용됩니다.

### 4.5 Redis 적용 방법 (구현 완료)

**환경 변수**

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `CACHE_BACKEND` | `memory` \| `redis` | `memory` |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | (Redis 사용 시 필수) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Token | (Redis 사용 시 필수) |

**Redis 사용 절차**

1. [Upstash Console](https://console.upstash.com/)에서 Redis 데이터베이스 생성.
2. REST URL / REST Token 복사 후:
   - **로컬**: `.env.local`에 설정 후 `npm run dev` 재시작.
   - **프로덕션 (Vercel)**: Vercel 대시보드 → 프로젝트 → **Settings** → **Environment Variables** 에 위 세 변수 추가 후 **Redeploy**. (`.env.local`은 배포 시 포함되지 않으므로 실서비스에는 Vercel 환경 변수 설정이 필수.)
3. 앱 재시작(또는 Redeploy) 후 `getDefaultBackend()`가 Redis 백엔드를 사용하며, metric_definitions·feature_flags 캐시가 인스턴스 간 공유됨.

**코드 구조**

- `src/lib/cache/backend.ts`: `CacheBackend` 인터페이스, `getDefaultBackend()` (env 기반 선택).
- `src/lib/cache/in-memory-backend.ts`: Map + TTL 구현.
- `src/lib/cache/redis-backend.ts`: `@upstash/redis` 기반 구현 (get/set/delete/clearPrefix).
- `metric-cache.ts`, `feature-flags.ts`: `getDefaultBackend()` 사용. `invalidateMetricCache` / `invalidateFlagsCache`는 비동기(Promise)로 변경됨.

**주의**

- `invalidateMetricCache(projectId)` → `await invalidateMetricCache(projectId)` (metric-definitions.ts에서 이미 반영).
- Redis 미설정 시 `CACHE_BACKEND=redis`여도 URL/Token이 없으면 자동으로 memory로 fallback.

### 4.6 참고

- [Vercel Storage (KV → Upstash)](https://vercel.com/docs/storage)
- [Upstash Redis](https://upstash.com/docs/redis)
- 캐시 사용처: `getCachedMetricDefinitions` / `invalidateMetricCache` (metric-definitions.ts), `getProjectFeatureFlags` / `invalidateFlagsCache` (feature-flags.ts)

---

## 5. 참조

- 캐시 구현: `src/lib/cache/metric-cache.ts`, `src/lib/feature-flags.ts`
- 자산 쓰기: `python-brain/app/langgraph/nodes.py` (`persist_results` → `reports`, `chat_messages`, `analysis_threads`)
- 자산 조회: `src/app/api/workspaces/[workspaceId]/report/route.ts`, `.../threads/route.ts`
- 데이터 파이프라인·DB 스키마: `DATA_PIPELINE_DOCUMENTATION.md` § 데이터베이스 스키마
