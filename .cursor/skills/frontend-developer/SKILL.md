---
name: frontend-developer
description: Principles for Next.js/React structure, shared components, routing, and i18n in a data-analysis product. Use when adding pages, forms, agent UI, or changing front-end architecture and patterns.
---

# Frontend Developer (Vibe Semantic)

## What Frontend Developers Actually Do

- **UI 구현**: 디자인·스펙에 맞춰 페이지·폼·리스트·차트를 구현한다. 컴포넌트 구조·재사용·상태 배치를 정한다.
- **상태·데이터 페칭**: 서버 상태(React Query 등)·클라이언트 상태·URL 동기화를 설계한다. 로딩·에러·빈 상태를 처리한다.
- **성능**: 번들 크기·코드 스플리팅·레이지 로드, 렌더 최소화로 체감 성능을 개선한다.
- **접근성·크로스 브라우저**: 키보드·스크린리더 지원, 시맨틱 마크업, 호환성·폴리필을 확인한다.
- **빌드·배포**: 빌드 스크립트·환경 변수·에러 경계를 관리하고, 배포 후 동작을 검증한다.

## 개선·이슈 발굴 방식

- **사용자 피드백**: 지원·리뷰·설문에서 UI·플로우 불만을 수집하고, 재현·우선순위를 정해 개선에 반영한다.
- **에러·성능 로그**: 클라이언트 에러·느린 구간·이탈 구간을 로그·메트릭으로 보고, 원인(네트워크·번들·렌더)을 좁혀 수정한다.
- **접근성·호환성**: 스크린리더·키보드·다양한 해상도·브라우저에서 검사하고, 이슈를 체크리스트로 관리한다.

## When to Use This Skill

- Adding or changing pages, routes, or layouts.
- Building or refactoring forms, lists, or agent (report/chat) UI.
- Establishing or updating component and state patterns.
- Improving accessibility, i18n, or responsive behavior.

## Principles

- **Route vs logic**: App Router holds routes and layout; business logic and server state live in features (model/hooks) or lib. Keep pages thin: fetch or submit via hooks, render feature/widget components. New features should add under features/ or widgets/, not bloat app/.
- **Shared UI**: One source of truth for primitives (Button, Card, Input, Dialog). Prefer composition and props (variant, size, className) over one-off styles. When adding a new pattern (e.g. chart, table), consider if it belongs in shared/ui or a feature-specific component.
- **State**: Server state (e.g. project, workspace, report) via React Query or equivalent; URL for shareable state where possible. Local UI state in components or small context; avoid global client state unless necessary.
- **Accessibility and i18n**: Labels, roles, and keyboard flow for forms and interactive blocks. Copy in one place (e.g. translations or constants); keep tone consistent (e.g. respectful, short Korean). When adding strings, consider existing patterns (placeholders, errors, buttons).

## Extensibility

- **New flows** (e.g. onboarding, new data source): Add as a route or step component; reuse shared layout and auth. Reuse existing form and validation patterns so behavior and styling stay consistent.
- **New agent capabilities** (e.g. charts, tables in chat): Render via shared components or a dedicated renderer keyed by response type. Keep markdown as the base format; extend only where structure (e.g. chart spec) is agreed with the backend.
- **New locales or themes**: Structure so copy and theme are pluggable (e.g. translation keys, CSS variables). Avoid hardcoding strings or colors in components; reference design tokens or i18n.
- **Performance**: Lazy-load heavy or route-specific code. Keep initial bundle and agent-related bundles in check; measure when adding large deps or new agent UI.
- **새 화면/플로우 추가 시**: 라우트·레이아웃·인증 요구를 정한 뒤, 기존 shared/ui·features 컴포넌트 재사용 여부를 먼저 결정한다. 새 패턴이 반복되면 공통 컴포넌트로 올린다.

## Reference (Current)

- App structure: `src/app/` (app, marketing, auth, api). Shared UI: `src/shared/ui/`. Features: `src/features/` (model + ui). Agent chat/report UI and markdown formatting: `src/features/agent-chat/`. Styling: Tailwind, `cn()`, CSS variables; see designer skill for design system.
