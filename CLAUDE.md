# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Last Updated**: 2026-01-26 (Added URL encoding handling requirement, Build verification process)

## Project Overview

Vibe Semantic is a Next.js 14 full-stack application for personal data analysis AI agent. The codebase includes a marketing landing page and an authenticated application workspace.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build (includes TypeScript type checking)
npm run start    # Start production server
npm run lint     # ESLint via Next.js
```

## Architecture

**Clean Architecture Layers:**

```
src/
├── app/           # Next.js App Router
│   ├── (app)/     # Protected authenticated routes (dashboard, projects)
│   ├── (marketing)/ # Public routes (landing page, demo)
│   ├── (auth)/    # Auth routes
│   └── api/       # API endpoints
├── shared/        # Global reusable code
│   ├── ui/        # Base components (Button, Card, Dialog, Charts)
│   └── lib/       # Utilities (cn, analytics, i18n, hooks)
├── entities/      # Domain types only (no business logic)
├── features/      # Business logic + UI (model/ and ui/ subdirs)
├── widgets/       # Page section components (Hero, Pricing, FAQ, etc.)
├── lib/           # External integrations
│   ├── supabase/  # Auth & database
│   ├── ga4/       # Google Analytics integration
│   ├── langgraph/ # AI agent orchestration
│   └── csv/       # CSV parsing & ingestion
└── types/         # Database types
```

**Key External Services:**
- Supabase (PostgreSQL, Auth, RLS)
- Google Analytics 4 + BigQuery
- LangGraph + LangChain (AI)
- Google Sheets API

## Conventions

**TypeScript:**
- Strict mode enabled
- Path alias: `@/*` maps to `./src/*`
- All functions require explicit type annotations
- Use interfaces for object types

**React:**
- Server Components by default; use `"use client"` only when needed
- UI components use forwardRef for ref support
- Components support `variant`, `size`, and `className` props

**Styling:**
- Tailwind-first with `cn()` utility for conditional classes
- CSS custom properties for theming (--color-background, etc.)
- Card pattern: `border-white/10 bg-white/5 backdrop-blur-sm`
- Input pattern: `bg-white/5 border border-white/10`
- Responsive prefixes: `md:`, `lg:`, `xl:`

**Naming:**
- Components/Types: PascalCase (`Button.tsx`, `LeadFormData`)
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE
- No index.ts files; use explicit imports

**API Routes:**
- Zod for request validation
- Response format: `{ success: true }` or `{ error: "message" }`
- Auth via `getAuthContext` middleware
- Audit logging via `createAuditLog`
- **CRITICAL (2026-01-26)**: Always decode URL-encoded project/workspace slugs from request body or query params using `decodeURIComponent()` to handle Korean characters. Example:
  ```typescript
  let projectId = body.projectId
  try {
    projectId = decodeURIComponent(projectId)
  } catch {
    // Use original if already decoded or UUID
  }
  ```

## Environment Variables

Required in `.env.local`:
- `GOOGLE_SHEETS_WEB_APP_URL` - Google Apps Script deployment URL
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)
- `BRAIN_API_URL` - Python Brain API URL (e.g., https://your-api.onrender.com)
- `BRAIN_API_KEY` - Brain API authentication key
- `OPENAI_API_KEY` - OpenAI API key (used by Brain API)
- GA4/BigQuery credentials (for app features)

## Build Verification (CRITICAL - 2026-01-26 추가)

**모든 코드 변경 후 반드시 빌드 검증을 수행해야 합니다.**

### 필수 빌드 검증 프로세스

다음과 같은 변경이 있을 때는 **반드시** 빌드를 실행하여 검증:

1. **데이터베이스 스키마 변경**
   - 마이그레이션 추가/수정
   - `src/types/database.ts` 수정
   - 테이블 타입 정의 변경

2. **TypeScript 타입 변경**
   - 인터페이스/타입 정의 추가/수정
   - 함수 시그니처 변경
   - 제네릭 타입 변경

3. **API 라우트 변경**
   - 새로운 API 엔드포인트 추가
   - 요청/응답 타입 변경
   - 미들웨어 로직 변경

4. **의존성 추가/변경**
   - `package.json` 수정
   - 새로운 라이브러리 추가

5. **Python 코드 변경** (python-brain)
   - 새로운 모듈 추가
   - Import 구조 변경
   - `requirements.txt` 수정

### 빌드 검증 명령어

```bash
# Next.js 빌드 검증 (TypeScript 타입 체크 포함)
npm run build

# TypeScript 타입 체크만 수행 (빠른 검증)
npx tsc --noEmit

# Linter 검증
npm run lint
```

### 빌드 검증 체크리스트

코드 변경 후 다음을 확인:

- [ ] `npm run build` 성공 (`✓ Compiled successfully`)
- [ ] TypeScript 타입 오류 없음
- [ ] Linter 경고/오류 없음 (경고는 허용, 오류는 수정 필수)
- [ ] 데이터베이스 타입 정의와 실제 스키마 일치
- [ ] 모든 import 경로 정확
- [ ] Optional chaining/Nullish coalescing 적절히 사용

### 자동 빌드 검증 (AI Assistant)

**AI Assistant는 다음 상황에서 자동으로 빌드를 실행해야 함:**

1. 데이터베이스 관련 코드 변경 시
2. TypeScript 타입 정의 변경 시
3. 새로운 파일 추가 시
4. 의존성 변경 시
5. 사용자가 명시적으로 요청한 경우

**빌드 실패 시:**
- 즉시 오류 메시지 분석
- 타입 오류, 문법 오류, 의존성 오류 등 원인 파악
- 수정 후 재빌드
- 빌드 성공 확인까지 반복

## Git Conventions

Commit message prefixes:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code formatting
- `refactor:` - Code restructuring
- `chore:` - Build/config changes
