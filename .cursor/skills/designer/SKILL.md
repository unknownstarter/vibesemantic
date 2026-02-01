---
name: designer
description: UI/UX principles, design system, components, accessibility, and responsive patterns for a data-analysis product. Use when defining or changing visual language, layouts, or interaction patterns.
---

# Designer (Vibe Semantic)

## What Designers Actually Do

- **사용자 연구·요구 정의**: 타겟 사용자·시나리오·페인 포인트를 파악하고, 요구사항·우선순위를 정한다.
- **정보 구조·플로우**: 화면 구조·네비게이션·플로우(온보딩, 설정, 에이전트 사용 등)를 설계한다.
- **비주얼·인터랙션**: 색·타이포·간격·컴포넌트를 정의하고, 클릭·포커스·로딩·에러 등 피드백을 설계한다.
- **디자인 시스템**: 토큰·컴포넌트·패턴을 문서화해 개발과 일관성을 유지한다.
- **접근성·반응형**: 키보드·스크린리더·대비·터치 영역을 고려하고, breakpoint별 레이아웃을 정한다.
- **사용성 검증**: 프로토타입·테스트로 이해도·완료율·불만을 확인하고 개선한다.

## 인사이트·개선 발굴 방식

- **사용자 연구·테스트**: 타겟 사용자를 대상으로 인터뷰·관찰·사용성 테스트를 하고, 페인 포인트·기대·우선순위를 도출한다.
- **정성 피드백**: 지원·리뷰·내부 사용 후기를 모아 반복되는 불만·요청을 패턴으로 정리한다.
- **사용성·접근성 메트릭**: 완료율·이탈 구간·접근성 검사 결과를 추적하고, 개선 후 비교한다.

## When to Use This Skill

- Defining or evolving the design system (tokens, components, patterns).
- Designing or refining layouts, navigation, or key flows (login, onboarding, agent).
- Ensuring accessibility, responsiveness, and consistent interaction.
- Aligning UI with brand and product tone (e.g. professional, clear, Korean).

## Principles

- **Design tokens**: Colors, spacing, typography, and radii as tokens (e.g. CSS variables or theme object). Components reference tokens, not raw values. New visual treatments should extend the token set so the system stays consistent and theming remains possible.
- **Component hierarchy**: Primitives (Button, Input, Card) are stable and reusable. Composed patterns (form blocks, list rows, agent bubbles) use primitives and stay consistent in spacing, alignment, and focus. Avoid one-off layouts that bypass the system.
- **Feedback and state**: Loading, success, error, and empty states are explicit. Use consistent patterns (e.g. spinner, message, retry). For agent/report, loading and errors should feel continuous (e.g. inline messages, retry button) rather than dead ends.
- **Accessibility**: Focus order, labels, and roles support keyboard and screen readers. Contrast and touch targets meet baseline requirements. When adding new components, check focus and semantics.
- **Responsive**: Layout and typography scale by breakpoint (e.g. mobile-first or key breakpoints). Tables and charts consider overflow and readability on small screens.

## Extensibility

- **New sections or flows**: Reuse existing layout (e.g. card, section, container) and spacing scale. If a new pattern repeats (e.g. wizard steps), consider adding it to the system rather than duplicating.
- **New chart or data viz**: Define a small set of chart types and props; keep styling (colors, labels) from design tokens. Ensure legends and axes are readable and, where relevant, accessible.
- **Dark/light or theme**: Design with tokens from the start so switching theme is a token swap. Avoid hardcoded colors in components.
- **Localization**: Layout should accommodate longer or shorter copy (e.g. Korean vs English). Avoid fixed widths that break with translation; use min/max or truncation with care.
- **새 플로우/섹션 추가 시**: 기존 디자인 토큰·컴포넌트·접근성 체크리스트를 먼저 확인하고, 새 패턴이 필요하면 토큰·컴포넌트를 확장한 뒤 문서화한다.

## Reference (Current)

- Tokens and Tailwind: `tailwind.config.ts`, global CSS (e.g. `--color-*`). Components: `src/shared/ui/`. Agent UI: `src/features/agent-chat/` (messages, loading, formatting). Card/input patterns: see CLAUDE.md Conventions (e.g. border-white/10, bg-white/5). Design docs or Figma links if present in repo.
