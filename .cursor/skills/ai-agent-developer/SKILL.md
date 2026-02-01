---
name: ai-agent-developer
description: Guides design and extension of AI agents for data analysis: prompts, context, token efficiency, conversation and threads, and graph/node design. Use when building or changing report generation, chat flows, LLM prompts, or agent orchestration.
---

# AI Agent Developer (Vibe Semantic)

## What AI / Agent Developers Actually Do

- **LLM 연동·프롬프트 엔지니어링**: 모델 API 호출, 시스템/유저 프롬프트 설계, 출력 형식(마크다운·JSON 등) 제어. Few-shot·체인·도구 호출 등 패턴을 선택한다.
- **컨텍스트·RAG 설계**: 모델에 넣을 데이터(메트릭, 히스토리, 문서)를 선정·요약·포맷한다. 토큰 한도·비용·품질 트레이드오프를 고려한다.
- **대화·스레드·상태 관리**: 멀티턴 대화, 스레드별 히스토리, 도구 호출 결과 반영을 설계한다. 세션·권한·타임아웃을 처리한다.
- **출력 품질·평가**: 답변의 정확성·완전성·일관성·유해성을 평가한다. 자동/수동 평가 지표와 개선 루프를 둔다.
- **프로덕션화**: 레이턴시·재시도·폴백·에러 메시지 설계. 비용·쿼터·로깅·모니터링을 고려한다.

## 인사이트·개선 발굴 방식

- **출력 품질 평가**: 답변의 정확성·완전성·일관성·행동 가능성을 자동 지표 또는 샘플 리뷰로 측정한다. 실패 패턴(잘못된 수치, 누락된 권고)을 수집해 프롬프트·컨텍스트 개선에 반영한다.
- **사용자 피드백·로그**: 클릭·재시도·짧은 세션·에러 로그를 보며 사용처·불만을 추정한다. 가능하면 명시적 피드백(좋아요/개선 요청)을 수집한다.
- **프롬프트·컨텍스트 실험**: 시스템/유저 프롬프트·컨텍스트 범위를 바꾼 뒤 동일 입력으로 출력을 비교한다. 토큰 비용과 품질 트레이드오프를 기록한다.

## 토큰 효율화 (필수)

- **컨텍스트 trim**: LLM에 넣는 데이터는 최소 필요분만. 시계열은 길이 상한(예: 14점), 리스트는 top-N(예: 5~10)으로 자른다. 요약·집계된 형태를 선호한다.
- **Compact 직렬화**: JSON 등 프로그램으로 전달할 때 pretty-print(indent) 제거, 키·값 불필요 공백 제거. `ensure_ascii=False` 등 필요한 옵션만 사용한다.
- **예산 per 요청 타입**: 리포트/채팅별로 컨텍스트·출력 토큰 예산을 두고, 새 필드·히스토리 추가 시 예산을 넘지 않도록 trim·요약을 적용한다. 문서화해 두면 확장 시 일관되게 유지된다.

## When to Use This Skill

- Designing or changing system/user prompts for report or chat.
- Adding context (metrics, mart summary, history) to the LLM.
- Reducing token usage or improving response quality.
- Extending conversation (threads, tools, multi-turn).
- Adding or changing agent nodes or graph flow.

## Principles

- **Context over length**: Send the minimum context the model needs to answer well. Prefer structured summaries (e.g. mart summary with key metrics and trends) over raw event dumps. Trim arrays (time series length, top-N lists) and use compact JSON when context is passed programmatically.
- **Stable system prompt**: System prompt defines role, output format, and rules. Change it when adding new capabilities or formats; keep user-specific data (mart, profile) in the user message or injected context so system prompt stays cacheable where supported.
- **Structured output**: Prefer markdown for reports and chat (headings, lists, code blocks) so the frontend can render consistently. Define expected sections (e.g. 요약, 지표, 제안) in the prompt so the model and UI stay aligned as you extend.
- **Errors and retries**: Do not expose backend/LLM errors to the user. Return a single user-facing message and retry action; log details server-side. Design retry and timeout behavior so the agent fails gracefully.

## Extensibility

- **New analysis modes**: Add a mode (e.g. "compare", "forecast") with its own prompt template and optional graph branch. Reuse shared context loading (mart, profile, definitions) and only vary the final prompt and response shape.
- **New tools or steps**: Model as graph nodes or subgraphs. Keep nodes focused (e.g. load context, build prompt, call LLM, persist). If adding tools (e.g. query, chart), define clear input/output and token budget for tool results.
- **Larger context**: If adding more data (e.g. long history, many metrics), implement summarization, truncation, or retrieval instead of sending everything. Document token budgets per context type so future changes stay within limits.
- **Multi-model or routing**: If you introduce multiple models or routing, keep the contract (request/response shape) stable so the frontend and API remain unchanged; put model-specific logic inside the agent layer.
- **새 분석 모드·새 컨텍스트 도입 시**: 토큰 예산을 먼저 정하고, trim·요약 규칙을 적용한 뒤 프롬프트·노드를 추가한다. 컨텍스트가 커지면 요약/선택적 포함/검색(RAG) 중 하나로 제한한다.

## Reference (Current)

- Orchestration: `python-brain/app/langgraph/` (graph, nodes, prompts). Token trimming: e.g. `trim_mart_summary_for_prompt`, compact JSON in `build_user_prompt`. Frontend agent API: `src/app/api/workspaces/[workspaceId]/agent/route.ts`, report/chat page and formatting in `src/features/agent-chat/`.
