---
name: backend-developer
description: Principles for API design, auth, database, and external service integration in a full-stack data product. Use when adding or changing API routes, auth flows, DB schema, or integration with Brain API and third-party services.
---

# Backend Developer (Vibe Semantic)

## What Backend Developers Actually Do

- **API 설계·구현**: 엔드포인트·요청/응답 스키마·에러 코드를 정의하고, 인증·권한·검증을 적용한다. 버전·하위 호환을 고려한다.
- **인증·인가**: 로그인·세션·토큰·OAuth 등을 구현하고, 리소스별 접근 제어(RLS·역할)를 적용한다.
- **DB·스키마 설계**: 테이블·인덱스·제약·마이그레이션을 설계하고, 쿼리 성능·정합성을 관리한다.
- **외부 서비스 연동**: 제3자 API·메시지 큐·스토리지와 연동하고, 타임아웃·재시도·에러 핸들링을 둔다.
- **가관측성·보안**: 로깅·메트릭·트레이싱으로 장애·성능을 추적한다. 입력 검증·주입 방지·비밀 관리로 보안을 유지한다.
- **확장·비동기**: 부하 증가 시 캐시·큐·비동기 작업으로 응답 시간과 리소스를 조절한다.

## 문제·개선 발굴 방식

- **로그·메트릭·트레이싱**: 에러율·지연·처리량을 수집하고, 장애·병목 시 로그·스택으로 원인을 좁힌다. 비밀·PII는 로그에 넣지 않는다.
- **API 사용 패턴**: 호출 빈도·실패 엔드포인트·느린 쿼리를 보고, 검증·캐시·인덱스·비동기화 후보를 식별한다.
- **보안·정합성**: 입력 검증·RLS·감사 로그를 정기 점검하고, 새 리소스 추가 시 권한·스코프를 함께 검토한다.

## When to Use This Skill

- Adding or changing API routes, request/response shapes, or error handling.
- Changing authentication, authorization, or session handling.
- Designing or migrating database schema and RLS.
- Integrating with Brain API, Supabase, or other backends.

## Principles

- **API contract**: Validate input (e.g. Zod), return consistent shapes (`{ success, data }` or `{ error }`). Version or extend carefully; avoid breaking existing clients. Document critical endpoints (e.g. agent, ingest) so frontend and Brain API stay aligned.
- **Auth and identity**: All protected routes must resolve the current user from a trusted source (e.g. session/token). Never expose service keys or internal IDs to the client. Use RLS so row-level access is enforced in the DB regardless of application bugs.
- **Project/workspace scope**: Resolve project and workspace from slug or ID; check membership and status before performing actions. Decode URL-encoded identifiers (e.g. Korean slugs) safely; use a single helper so behavior is consistent.
- **User-facing errors**: Do not leak internal errors, stack traces, or provider messages. Log fully server-side; return one generic message and optional retry hint. Map known cases (e.g. rate limit, auth) to clear user messages where appropriate.
- **Idempotency and audits**: For mutating or critical operations, consider idempotency keys or audit logs so behavior is traceable and repeatable.

## Extensibility

- **New resources** (e.g. new entity, new collection): Define route structure (REST or action-based), schema (DB + types), and RLS. Reuse existing auth and project-scoping helpers so new routes stay secure and consistent.
- **New integrations**: Isolate in lib or a dedicated module; call from API routes or workers. Use env for URLs and secrets; fail clearly when misconfigured. Prefer one contract (e.g. Brain API) that can be implemented or mocked.
- **New auth methods**: Integrate with existing session store (e.g. Supabase). Keep callback and token exchange in one place; do not duplicate cookie/session logic across routes.
- **Scale and async**: If some operations become heavy (e.g. long ingest), consider async jobs or queues; keep API response fast and return status or webhook. Document expectations (e.g. sync vs async) for each endpoint.
- **새 리소스/엔드포인트 추가 시**: 계약(요청/응답)·스키마(DB·타입)·RLS·문서를 동시에 정의하고, 인증·스코프·에러 형식을 기존 API와 맞춘다.

## Reference (Current)

- API routes: `src/app/api/`. Auth: `src/lib/supabase/` (client, server, middleware, auth-helpers). DB types: `src/types/database.ts`. Migrations: `supabase/migrations/`. Brain API client and agent route: `src/lib/api/brain-api.ts`, `src/app/api/workspaces/[workspaceId]/agent/route.ts`.
