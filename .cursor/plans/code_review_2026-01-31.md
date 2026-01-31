# 코드베이스 코드리뷰 (2026-01-31)

**범위**: 의존성, 클린 아키텍처, 모듈화, 최적화·효율, 빌드·API 검증

---

## 1. 빌드·테스트

| 항목 | 결과 |
|------|------|
| `npm run build` | ✅ 성공 (TypeScript·ESLint 통과) |
| ESLint 경고 | 4건 (LeadCaptureForm aria-required, i18n/BottomSheet useEffect deps) — 기능 영향 없음, 추후 정리 권장 |

---

## 2. 의존성

| 항목 | 상태 |
|------|------|
| **package.json** | Next 14, React 18, Supabase, TanStack Query, @upstash/redis, framer-motion, recharts, zod 등 — 버전 일관 |
| **순환 의존성** | 없음 (lib → features 없음, app → lib/features/widgets만 사용) |
| **미사용 import** | `api/projects/route.ts`의 `isSemanticLayerEnabled` 제거 완료 |

---

## 3. 클린 아키텍처·모듈화

### 3.1 레이어 준수

| 레이어 | 역할 | 의존 방향 | 검증 |
|--------|------|------------|------|
| **app/** | 라우트·페이지·API 핸들러 | → features, shared, lib, entities, types | ✅ app이 하위만 import |
| **features/** | 도메인별 model + ui | → shared, lib, entities, types | ✅ lib/entities 역참조 없음 |
| **lib/** | Supabase, GA4, 캐시, CSV, semantic 등 | → types, entities(타입 등) | ✅ features/widgets 미참조 |
| **shared/** | UI 컴포넌트·유틸·스타일 | → lib(최소), types | ✅ |
| **widgets/** | 랜딩 섹션 | → shared | ✅ app (marketing)만 widgets 사용 |
| **entities/** | 도메인 타입·상수 | 없음(순수 데이터) | ✅ |
| **types/** | DB·공통 타입 | 없음 | ✅ |

### 3.2 공통화·재사용

- **인증·권한**: `getAuthContext`, `resolveProject`, `resolveWorkspace` (auth-helpers) — API 라우트에서 공통 사용.
- **캐시**: `getDefaultBackend()`, metric-cache, feature-flags — 백엔드 추상화로 memory/Redis 전환 가능.
- **URL 디코딩**: workspaceId/projectId 한글 슬러그 대비 — agent·report 등에서 `decodeURIComponent` 적용.

---

## 4. 최적화·효율

| 항목 | 내용 |
|------|------|
| **캐시** | metric_definitions(5분 TTL), feature_flags(1분 TTL); 쓰기 시 무효화. Redis 선택 시 멀티 인스턴스 공유. |
| **API 호출** | 프로젝트 상세·워크스페이스 목록 `Promise.all`로 병렬 조회 (useProjectData, useProjectQuery 등). |
| **React Query** | 프로젝트/워크스페이스 쿼리 캐시·재검증 사용. |
| **useEffect 의존성** | useProjectData의 fetchData를 useCallback으로 감싸고 deps에 포함해 lint 해소 및 안정 동작. |

---

## 5. API·결과값 검증

### 5.1 적용한 수정

- **Agent POST** (`/api/workspaces/[workspaceId]/agent`): `request.json()` 실패 시 400 + "Invalid JSON body" 반환.
- **Report GET** (`/api/workspaces/[workspaceId]/report`): `workspaceId`에 `decodeURIComponent` 적용해 한글 슬러그 대응.
- **Projects route**: 미사용 `isSemanticLayerEnabled` import 제거.

### 5.2 주요 API 요청·응답 형태 (검증 체크리스트)

| API | 메서드 | 요청 | 성공 응답 | 비고 |
|-----|--------|------|-----------|------|
| **GET /api/projects** | GET | - | `{ projects: ProjectWithRole[] }` | 401 미인증 |
| **POST /api/projects** | POST | `{ name, profile? }` | 201 `{ project }` | 403 권한 없음, 400 name 없음 |
| **GET /api/projects/[projectId]** | GET | - | `{ project, role, ga4, csv? }` | slug/id + decode |
| **GET /api/workspaces/[workspaceId]/report** | GET | ?range=7d, ?list=1 | `{ report?, cached, latestDataUpdate }` 또는 `{ reports[] }` | workspaceId decode |
| **POST /api/workspaces/[workspaceId]/agent** | POST | `{ mode, range?, userMessage?, threadId?, chartContext? }` | `{ analysisMarkdown, analystQuestions, martSummary?, threadId, dataAccessed? }` | chat 시 userMessage 필수, 400 Invalid JSON |
| **GET /api/workspaces/[workspaceId]** | GET | - | `{ workspace }` | 404/401 |

### 5.3 수동·E2E 검증 권장

1. **로컬**: `npm run dev` 후  
   - 로그인 → 대시보드 → 프로젝트 목록/생성 → 프로젝트 상세 → 워크스페이스·에이전트(리포트/채팅) 호출.
2. **API 직접 호출**:  
   - Agent POST에 잘못된 JSON(body 없음/문자열) 보내서 400 + "Invalid JSON body" 확인.  
   - Report GET에 한글 workspace slug로 호출 시 200/404 등 기대 응답 확인.
3. **프로덕션**: Vercel 등 배포 후 동일 시나리오 + Redis 환경 변수 적용 시 캐시 동작 확인.

---

## 6. 남은 권장 사항

| 우선순위 | 항목 |
|----------|------|
| 낮음 | LeadCaptureForm `aria-required` → `aria-invalid` 또는 role 제거로 접근성 경고 해소 |
| 낮음 | i18n context, BottomSheet의 useEffect dependency 배열 정리(또는 eslint-disable 주석 명시) |
| 참고 | 다른 POST API에서도 `request.json()` try/catch로 400 반환 시 일관성 확보 |

---

## 7. 참조

- 아키텍처: `CLAUDE.md`, `ARCHITECTURE.md`
- 캐시·자산: `CACHE_AND_ASSETS.md`
- API·에이전트: `AI_AGENT_DOCUMENTATION.md`
- 데이터 파이프라인: `DATA_PIPELINE_DOCUMENTATION.md`
