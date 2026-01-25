# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Environment Variables

Required in `.env.local`:
- `GOOGLE_SHEETS_WEB_APP_URL` - Google Apps Script deployment URL
- Supabase credentials
- GA4/BigQuery credentials (for app features)

## Git Conventions

Commit message prefixes:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code formatting
- `refactor:` - Code restructuring
- `chore:` - Build/config changes
