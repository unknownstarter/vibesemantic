# Agent UX · 에러 통일 · 토큰 절감 리팩토링 (2026-02-01)

## 개요

리포트/채팅 에이전트의 사용자 경험 개선, 운영자/기술 에러 노출 제거, 채팅 답변 포맷 정리, 토큰 사용량 절감을 위한 변경 사항 정리.

---

## 1. 유저 에러 메시지 통일 (운영자 에러 숨김)

**목표:** 실패/타임아웃 시 유저에게는 "문제가 발생했습니다. 잠시 후 다시 시도해주세요." + 다시 시도 버튼만 노출. 기술/운영자 메시지(429, quota, 스택 등)는 서버 로그에만 남김.

**변경 사항:**
- **API** `src/app/api/workspaces/[workspaceId]/agent/route.ts`
  - 상수 `USER_FACING_ERROR = '문제가 발생했습니다. 잠시 후 다시 시도해주세요.'`
  - Brain API/예외 catch 시 `console.error`로 실제 에러 로그, 응답은 항상 `{ error: USER_FACING_ERROR }`
- **프론트** `src/app/(app)/projects/[pid]/workspaces/[wid]/agent/page.tsx`
  - 상수 `USER_FACING_ERROR` 동일 문구
  - 리포트 실패 시 `reportError` 상태에 위 메시지 저장, UI에 "다시 시도" 버튼 노출
  - 채팅 실패 시 assistant 메시지 내용을 `USER_FACING_ERROR`로 고정 (raw `data.error` 미노출)

**참고:** Brain API(`brain-api.ts`)는 기존처럼 상세 에러를 throw. agent 라우트에서 catch 후 위 통일 메시지만 클라이언트에 반환.

---

## 2. 로딩 UI – 인터랙티브 문장 (리포트/채팅)

**목표:** ChatGPT/Claude처럼 "무언가 처리 중"임을 여러 문장이 돌아가며 보여주는 인터랙티브 로딩.

**변경 사항:**
- **컴포넌트** `src/features/agent-chat/ui/AgentThinkingMessages.tsx`
  - `variant: 'report' | 'chat'` 에 따라 문장 목록 분리
  - 리포트: "데이터를 분석하고 있어요...", "인사이트를 찾고 있어요...", "리포트를 정리하고 있어요...", "차트를 준비하고 있어요...", "거의 다 됐어요..."
  - 채팅: "생각하고 있어요...", "답변을 준비하고 있어요...", "데이터를 확인하고 있어요...", "인사이트를 정리하고 있어요...", "곧 답변할게요..."
  - `ROTATE_INTERVAL_MS`(예: 2800ms)마다 문장 인덱스 순환, `AnimatePresence`로 페이드 전환
  - 점 3개 바운스 애니메이션 유지
- **사용처**
  - 리포트 탭 로딩: Spinner + `<AgentThinkingMessages variant="report" subText="최대 30초 정도 소요될 수 있습니다" />`
  - 채팅 로딩: 기존 TypingIndicator 대신 말풍선 형태로 `<AgentThinkingMessages variant="chat" />` 표시

---

## 3. 채팅 답변 포맷 (헤딩/리스트/코드블록)

**목표:** 주루룩 글만 나오는 형태를 줄이고, Claude/ChatGPT처럼 헤딩·리스트·코드블록·단락 구분이 명확한 마크다운 렌더링.

**변경 사항:**
- **포맷터** `src/features/agent-chat/lib/formatMarkdown.ts`
  - 처리 순서: HTML 엔티티 → 코드블록 보호(플레이스홀더) → 헤딩(# ## ### ####) → 마크다운 리스트(- * 1. 2.) → 볼드/이탤릭/링크 → 단락(빈 줄 \n\n 기준으로 `<p>` 래핑, 단일 \n → `<br/>`) → 코드블록 복원 → 기존 HTML 태그 정리
  - 코드블록: ```lang\n...\n``` → `<pre><code>...</code></pre>`, 인라인 `...` → `<code>...</code>`
  - 리스트: 연속된 `-`/`*` 줄 → `<ul><li>...</li></ul>`, 연속된 `1.` 줄 → `<ol><li>...</li></ol>`
  - 단락: `\n\n`로 분리된 블록 중 태그가 아닌 블록만 `<p class="...">` 로 감싸고 내부 `\n` → `<br/>`
- **UI** `src/features/agent-chat/ui/MessageBubble.tsx`
  - assistant 메시지용 prose 클래스 정리: `prose-headings`, `prose-p`, `prose-ul`/`prose-ol`/`prose-li`, `prose-pre`/`prose-code`, `prose-a`, `prose-hr` 등으로 헤딩/단락/리스트/코드/링크/구분선 스타일 통일

---

## 4. 토큰 사용량 절감

**목표:** 요청당 토큰 수 감소(41 requests / 81K tokens → 동일 요청 수 대비 토큰 감소).

**변경 사항:**
- **Python** `python-brain/app/langgraph/prompts.py`
  - `trim_mart_summary_for_prompt(mart_summary)` 도입
    - `dailyTrend` 최대 14개, `topChannels` 5개, `topPages` 5개, `integratedTrend` 14개로 제한
  - `build_user_prompt` 내부에서 `mart_summary`를 trim한 뒤 `json.dumps(trimmed, ensure_ascii=False)` 사용 (indent 제거로 JSON 길이 축소)
- **정책:** Summary 빌드 자체는 기존대로 유지하고, LLM에 넘기는 시점에서만 배열 크기와 JSON 포맷을 제한.

---

## 5. 문서/아키텍처 참고

- 에러 정책: agent 라우트 및 해당 플랜 문서 참고.
- 로딩 UI: `AgentThinkingMessages` 컴포넌트 및 agent 페이지 사용처 참고.
- 마크다운: `formatMarkdown` 처리 순서 및 `MessageBubble` prose 클래스 참고.
- 토큰: `prompts.trim_mart_summary_for_prompt` 및 `build_user_prompt` 참고.
