---
name: technical-architect
description: Architecture principles, layer boundaries, data flow, and evolution for a full-stack data-analysis product. Use when making structural decisions, adding new subsystems, or planning migrations and scaling.
---

# Technical Architect (Vibe Semantic)

## What Technical Architects Actually Do

- **시스템 설계**: 서비스·레이어·경계를 나누고, 데이터 흐름·의존성·계약을 정의한다. 단일 장애점·병목을 피한다.
- **트레이드오프 결정**: 기술 선택(언어·DB·큐·캐시) 시 요구사항·비용·운영 난이도·팀 역량을 고려한다.
- **마이그레이션·진화**: 스키마·API·서비스 변경 시 단계적 전환·하위 호환·롤백 계획을 세운다.
- **비기능 요구사항**: 가용성·지연·처리량·보안·비용 목표를 정하고, 설계가 이를 만족하는지 검토한다.
- **문서화·표준**: 아키텍처 결정·ADR·운영 Runbook을 남겨 팀이 같은 기준으로 일하게 한다.

## 의사결정·개선 발굴 방식

- **병목·장애 포스트모템**: 지연·장애 원인을 레이어·서비스 단위로 짚고, 경계·계약·모니터링 개선을 도출한다.
- **비기능 목표 재검토**: 가용성·지연·비용 목표가 달성되는지 주기적으로 보고, 미달 시 설계·용량·운영을 조정한다.
- **새 요구·기술 검토**: 새 기능·규모 요구가 들어오면 기존 경계로 수용 가능한지 판단하고, 불가 시 확장·분리·마이그레이션 옵션을 비교한다.

## When to Use This Skill

- Deciding where a new feature or capability should live (frontend, API, Brain, DB).
- Defining or changing boundaries between services, layers, or modules.
- Planning data flow (auth, ingest, report, chat) or cross-cutting concerns (cache, errors).
- Evaluating tech choices, migrations, or scaling strategies.

## Principles

- **Clear boundaries**: Frontend (Next.js) = UI, routing, and API client. Backend API = auth, scoping, and orchestration; heavy or model-specific work in Brain API. DB = source of truth; RLS enforces access. Keep integration points narrow (e.g. a few endpoints, defined contracts) so each side can evolve.
- **Data flow direction**: User → App → API (auth, project scope) → Brain or DB. No client-to-DB direct; no Brain calling frontend. Events and analytics flow one way (e.g. app → analytics provider) with clear ownership.
- **Failure and consistency**: Fail fast at boundaries (e.g. invalid auth, missing project). Prefer consistent user experience (generic error + retry) over exposing internal state. Cache only where it improves correctness or performance; invalidate on writes.
- **Extensibility by layer**: New analysis types → config and prompts (Brain) + optional UI. New data sources → new collector + mart schema extension. New product features → new routes and features; reuse auth and scoping.

## Extensibility

- **New vertical feature**: Identify which layer owns what (e.g. API for CRUD and auth, Brain for analysis, frontend for UX). Add minimal new surface (routes, prompts, components) and reuse existing auth, project, and workspace resolution.
- **Splitting or merging services**: Keep contracts (API shapes, events) stable so that moving logic between Next.js API and Brain, or adding a worker, does not force big frontend changes. Document ownership of each contract.
- **Schema evolution**: Prefer additive migrations (new columns, new tables) and backfills where needed. Avoid breaking existing queries; deprecate gradually. Keep TypeScript types and migrations in sync.
- **Scale**: Identify bottlenecks (e.g. heavy report, bulk ingest) and address with async jobs, caching, or read replicas without changing the core architecture. Prefer stateless API and Brain so horizontal scaling stays simple.
- **새 서비스/레이어 도입 시**: 경계(책임·데이터 소유)·계약(API·이벤트)·소유권(팀·Runbook)을 명시하고, 기존 클라이언트가 바뀌지 않도록 계약을 안정적으로 유지한다.

## Reference (Current)

- Next.js: `src/app/`, `src/features/`, `src/shared/`, `src/lib/`, `src/types/`. Brain: `python-brain/app/` (main, langgraph, services). DB: `supabase/migrations/`, `src/types/database.ts`. High-level flows: ARCHITECTURE.md. Use grep/codebase_search for "where is X"; use this skill for "where should X go" and "how should we extend."
