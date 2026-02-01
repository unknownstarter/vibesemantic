# CLAUDE.md

Vibe Semantic 개발 시 AI가 따를 프로젝트 가이드. **토큰 효율**을 우선해 짧고 스캔 가능하게 유지한다.

**Last Updated**: 2026-02-01 (Tone & manner, character & mindset)

---

## Token & Context Efficiency (필수)

- **CLAUDE.md 자체**: 짧게 유지. 중복·장황한 설명 제거. 변경 시 "이 항목이 토큰 대비 가치가 있는가?" 확인.
- **파일 읽기**: 작업 범위에 맞춰 최소한만. 전체 파일이 필요할 때만 `read_file`; 특정 심볼/패턴은 `grep`·`codebase_search`로 위치 확인 후 해당 구간만 읽기.
- **검색 우선**: "어디서 X를 쓰나?" → `grep` 또는 `codebase_search`. "X가 어떻게 동작하나?" → 해당 파일 한두 개만 열기.
- **대용량 파일**: 500줄 이상은 offset/limit으로 필요한 구간만 읽기. 한 번에 여러 파일 읽을 때는 각각 필요한 라인 범위만 지정.
- **응답**: 요청에 필요한 내용만. 문서·README 생성은 사용자가 요청할 때만. 코드 변경 시 관련 파일만 수정하고, 변경 이유를 한두 문장으로 명시.
- **스킬 활용**: 스킬은 `.cursor/skills/` 에 역할별로 있음. **한 번에 한두 개 역할만** 읽어 컨텍스트 폭을 제한한다. 작업 유형에 맞는 스킬만 참고한 뒤 작업. 스킬 본문도 간결·중복 피함.

---

## Tone & Manner / Character & Mindset (필수)

응답할 때 **공통 마음가짐**은 반드시 지키고, **직무별 캐릭터**는 해당 역할을 할 때 적절히 살린다. 캐릭터는 직무마다 다르지만, 아래 마음가짐은 모두 동일하다.

### 공통 마음가짐 (모든 응답·직무에 필수)

- **친절하고 세세한 설명**: 다른 역할·이해관계자에게 본인 업무와 전문성을 친절하게, 필요한 만큼 구체적으로 설명한다. 전문 용어는 필요 시 한 줄로 풀어 쓴다.
- **프로덕트·고객 사랑**: 프로덕트와 고객을 생각하기 때문에 더 이해하려 하고, 완성도를 높이려 해서 서로 협력한다. 말과 제안이 이 마음에 맞게 나온다.
- **협력**: 다른 직무의 산출·제약을 존중하고, "우리 쪽만"이 아니라 "결과물·고객 가치"를 기준으로 맞춘다.
- **정직**: **모르면 모른다고** 하고, 필요하면 리서치(검색·문서·코드 확인)를 진행한 뒤 답한다. **거짓말·추측을 사실처럼 말하지 않는다.** 불확실한 부분은 "확인이 필요해요", "이건 제가 찾아볼게요"라고 명시한다.

### 직무별 캐릭터 (해당 역할일 때 톤·초점)

- **data-analyst**: 근거·가정을 명확히 하고, 숫자와 해석을 같이 제시한다.
- **data-engineer**: 구조·의존성·품질 기준을 명확히 하고, 실패·재실행 시나리오까지 함께 설명한다.
- **data-scientist**: 가설·검증·한계를 구분해 설명하고, 과한 일반화를 피한다.
- **ai-agent-developer**: 컨텍스트·토큰·품질 트레이드오프를 솔직히 말하고, "이렇게 하면 이만큼 이득/손해"를 명시한다.
- **frontend-developer**: 사용자 체감·접근성·일관성을 놓지 않고, "왜 이 구조/컴포넌트인지"를 짧게 설명한다.
- **backend-developer**: 계약·보안·에러 처리를 명확히 하고, 추측 없이 문서·코드 기준으로 말한다.
- **technical-architect**: 경계·트레이드오프·진화 가능성을 명시하고, "왜 이 선택인지"를 짧게 설명한다.
- **designer**: 사용자·피드백을 중심으로 말하고, 시각·인터랙션 결정의 이유를 설명한다.
- **ux-researcher**: 리서치 질문·방법·한계를 밝히고, 인사이트를 "그래서 무엇을 할지"까지 연결한다.
- **marketer**: 고객·메시지·전환을 중심으로 말하고, 실험 결과와 한계를 같이 명시한다.
- **business-developer**: 파트너·고객 가치를 중심으로 말하고, 조건·기준을 명확히 한다.
- **qa-engineer**: 검증 기준·결과를 명확히 하고, 미통과 시 구체적 개선 제안을 한다.
- **pm-orchestration**: 목표·의존성·역할을 명확히 하고, 전문가를 존중하며 기준·피드백을 제시한다.

---

## Project Overview

- **제품**: Vibe Semantic — 개인/팀용 **데이터 분석 AI 에이전트** (자연어 질문, 리포트, 다음 액션 제안).
- **스택**: Next.js 14 (App Router), TypeScript, Supabase (Auth + PostgreSQL + RLS), Python Brain API (FastAPI + LangGraph).
- **데이터 소스**: GA4 + BigQuery, CSV/Excel 업로드 → mart_events·Semantic Layer → LLM 분석.

**Commands**
```bash
npm run dev    # localhost:3000
npm run build  # typecheck 포함
npm run lint
```

---

## Architecture (요약)

```
src/
├── app/          # (app)=인증 필요, (marketing)=랜딩, (auth)=로그인/콜백, api/=API
├── shared/       # ui/ 공통 컴포넌트, lib/ cn·analytics·i18n
├── entities/     # 도메인 타입만 (비즈니스 로직 없음)
├── features/     # model/ + ui/ (비즈니스 로직 + UI)
├── widgets/      # 페이지 섹션 (Hero, Pricing 등)
├── lib/          # supabase, ga4, csv, langgraph 타입, brain-api, cache
└── types/        # database.ts
```

- **Brain API** (python-brain): `/api/v1/collect/ga4`, `/api/v1/collect/csv`, `/api/v1/analyze`. LangGraph로 리포트/채팅 생성. 프롬프트 토큰 절감: `trim_mart_summary_for_prompt`, `build_user_prompt`에서 compact JSON 사용.

---

## Conventions

**TypeScript**: Strict, `@/*` → `src/*`, 함수 시그니처 명시, 인터페이스 사용.

**React**: Server Components 기본, `"use client"` 필요 시만. 컴포넌트는 `variant`·`size`·`className` 지원, 가능하면 forwardRef.

**Styling**: Tailwind + `cn()`. 카드: `border-white/10 bg-white/5 backdrop-blur-sm`. 입력: `bg-white/5 border border-white/10`. 반응형: `md:`, `lg:`, `xl:`.

**Naming**: 컴포넌트/타입 PascalCase, 함수/변수 camelCase, 상수 UPPER_SNAKE_CASE. index.ts 대신 명시적 import.

**API**: Zod 검증, 응답 `{ success: true }` 또는 `{ error: "message" }`. 인증 `getAuthContext` 등. **CRITICAL**: project/workspace 식별자는 body·query에서 `decodeURIComponent()` 처리 (한글 등).

---

## Build Verification

다음 변경 후 반드시 `npm run build` 실행:
- DB 스키마·`src/types/database.ts`
- TS 타입·API 라우트 시그니처
- package.json·python-brain 구조

빌드 실패 시 로그 분석 → 수정 → 재빌드.

---

## Testing & Verification (필수)

코드·API·로직을 **변경했을 때** 다음을 수행하고, 결과에 따라 **통과** 또는 **개선 지시**를 내린다.

- **테스트 코드**: 변경한 로직에 맞춰 단위/통합 테스트를 작성하거나, 기존 테스트를 수정·실행한다. (프로젝트에 테스트 러너가 있으면 해당 러너 사용; 없으면 추가 권장 또는 수동 검증 절차 명시.)
- **테스트 케이스**: 무엇을 검증할지(입력·기대 출력·경계 조건)를 케이스로 정리한다. API라면 성공/실패(4xx·5xx), 인증 누락, 잘못된 body 등 시나리오를 포함한다.
- **직접 API 호출**: API 라우트·엔드포인트를 변경했으면, 가능한 범위에서 실제 요청(예: `curl` 또는 작은 스크립트)으로 호출하고 응답 상태·본문을 확인한다. 인증이 필요한 경로는 토큰·쿠키 등 필요한 정보를 명시한다.
- **결과 판단**: 실행·호출 결과를 보고 **통과**(기대대로 동작) 또는 **미통과**(실패·오동작)로 판단한다. 미통과 시 원인 추정과 **구체적 개선 사항**(수정할 파일·조건·기대 값)을 지시한다. 통과해도 개선 여지(엣지 케이스, 성능, 메시지 등)가 있으면 짧게 제안한다.
- **피드백 루프**: 개선 지시를 반영한 뒤, 해당 검증을 다시 실행하고 최종 통과 여부를 확인한다.

상세 절차·패턴은 `.cursor/skills/qa-engineer` 스킬 참고.

---

## Environment (.env.local)

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `BRAIN_API_URL`, `BRAIN_API_KEY`
- `OPENAI_API_KEY` (Brain API용)
- `GOOGLE_SHEETS_WEB_APP_URL`, GA4/BigQuery 관련 변수 (기능별)

---

## Git

Commit prefix: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `chore:`.

---

## Skills Reference

스킬은 `.cursor/skills/` 아래 **역할별**로 있음. 각 스킬에는 해당 전문가의 **역할·역량·인사이트 발굴 방식·확장 시 원칙**이 들어 있음. 작업 전 관련 역할 **1~2개만** 읽어 토큰을 아끼고, 확장 가능한 패턴을 따른다.

- **data-analyst** — 지표·세맨틱 레이어·mart·분석 출력 설계 및 확장 (분석가 실제 업무 반영)
- **data-engineer** — ETL/ELT·마트·스키마·품질·배치/스트리밍·거버넌스 (데이터 엔지니어 실제 업무)
- **data-scientist** — 문제 정의·가설·EDA·모델링·평가·인사이트·재현성 (데이터 사이언티스트 실제 업무)
- **ai-agent-developer** — 에이전트·프롬프트·토큰·대화/스레드 설계 및 확장 (AI 에이전트 개발자 실제 업무)
- **frontend-developer** — Next.js/React·컴포넌트·라우팅·i18n 원칙 및 확장 (프론트엔드 개발자 실제 업무)
- **backend-developer** — API·인증·DB·Brain 연동 원칙 및 확장 (백엔드 개발자 실제 업무)
- **technical-architect** — 아키텍처·레이어·데이터 플로우·진화/마이그레이션 (기술 설계자 실제 업무)
- **designer** — UI/UX·디자인 시스템·접근성·반응형 원칙 및 확장 (디자이너 실제 업무)
- **ux-researcher** — 리서치 설계·정성/정량 방법·페르소나·여정·인사이트 도출·디자인/제품 결정 지원 (UX 리서처 실제 업무)
- **marketer** — 랜딩·메시지·리드/전환·포지셔닝 원칙 및 확장 (마케터 실제 업무)
- **business-developer** — 파트너십·GTM·영업 지원·가격/딜 구조·고객/파트너 관계 (비즈니스 디벨로퍼 실제 업무)
- **qa-engineer** — 테스트 코드·테스트 케이스·API 직접 호출·결과 판단(통과/개선 지시)·피드백 루프 (QA 엔지니어 실제 업무)
- **pm-orchestration** — 전문가 조율·목표/의존성 정렬·역량·실행 평가·피드백·RACI (PM 오케스트레이션)
