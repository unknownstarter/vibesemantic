# 데이터 분석 경험 종합 개선 — 테스크 마스터

**작성일**: 2026-02-01  
**원본 계획**: 터미널/첨부 계획서

---

## 현황 진단

| # | 문제 | 우선순위 |
|---|------|----------|
| 1 | 테이블이 깨져서 보임 — formatMarkdown에 테이블 파싱 없음, \| 지표 \| 값 \| 그대로 출력, dangerouslySetInnerHTML → XSS | P0 |
| 2 | CSV 전용 프로젝트에서 채팅 제안·차트가 GA4 중심 (하드코딩 질문, ReportCharts는 GA4만) | P1 |
| 3 | 프롬프트 300줄+·모순 지시, 리포트 구조가 데이터 소스 무관하게 고정 | P1 |

---

## 테스크 체크리스트

### P0. 테이블 렌더링 + XSS 제거

| ID | 태스크 | 상태 | 비고 |
|----|--------|------|------|
| P0-1 | react-markdown 기반 MarkdownRenderer 교체 | ✅ 완료 | formatMarkdown.ts 삭제, MarkdownRenderer.tsx 신규, MessageBubble·agent·AgentSlideOver 교체 |
| P0-2 | XSS 제거 (rehype-sanitize, dangerouslySetInnerHTML 제거) | ✅ 완료 | P0-1에 포함 |

**P0-1 상세**
- `react-markdown` + `remark-gfm` + `rehype-sanitize` 사용 (이미 설치됨)
- GFM 테이블·코드블록·인용·리스트 지원, Tailwind prose, 다크 테마
- MessageBubble, 리포트 영역 모두 MarkdownRenderer로 교체

---

### P1. 데이터 소스 적응 + 백엔드 개선

| ID | 태스크 | 상태 | 비고 |
|----|--------|------|------|
| P1-1 | 데이터 소스 인식 채팅 제안 | ✅ 완료 | agent/page.tsx, AgentSlideOver.tsx — reportMartSummary.dataSources 기반 동적 제안 |
| P1-2 | 파생 지표 자동 계산 (summary_builder.py) | ✅ 완료 | MartSummary derivedMetrics (Sessions 대비 비율), Python·TS 타입 추가 |
| P1-3 | 기간 비교(Period-over-Period) 데이터 | ✅ 완료 | summary_builder.py — 이전 기간 KPIs 조회, kpis.sessionsTrend/usersTrend |
| P1-4 | 채팅 프롬프트 경량화 (prompts.py) | ✅ 완료 | 300줄+ → 핵심 규칙만, 메타/질문유형 블록 제거, 모순 제거 |
| P1-5 | 데이터 소스 적응형 리포트 구조 (prompts.py) | ✅ 완료 | CSV 전용/GA4 전용/통합별 리포트 구조 동적 생성 |

---

### P2. UI 강화 (시간 허용 시)

| ID | 태스크 | 상태 | 비고 |
|----|--------|------|------|
| P2-1 | 테이블 스타일링 강화 | ✅ 완료 | MarkdownRenderer 테이블: 줄무늬(even 행 bg), overflow-x-auto |
| P2-2 | CSV 전용 프로젝트 차트 지원 (ReportCharts.tsx) | ✅ 완료 | csvMetrics.trend 기반 시계열 LineChart (CSV 전용 시 표시) |

---

### 검증

| ID | 태스크 | 상태 |
|----|--------|------|
| V1 | Python 문법 검증 (py_compile) | ✅ 완료 |
| V2 | npm run build 성공 | ✅ 완료 |
| V3 | MarkdownRenderer 테이블·코드블록·리스트 샘플 확인 | ⬜ 수동 확인 권장 |
| V4 | CSV 전용 시나리오에서 채널 언급 없는 리포트 확인 | ⬜ 수동 확인 권장 |

---

## 구현 순서

1. **P0-1 + P0-2** — react-markdown 교체 (테이블 + XSS)
2. **P1-1** — 데이터 소스 인식 채팅 제안
3. **P1-2 + P1-3** — 파생 지표 + 기간 비교
4. **P1-4 + P1-5** — 프롬프트 경량화 + 적응형 리포트
5. **P2-1 + P2-2** — 테이블 스타일 + CSV 차트
6. **V1~V4** — 검증

---

## 수정 대상 파일 요약

| 구분 | 파일 |
|------|------|
| 삭제 | `src/features/agent-chat/lib/formatMarkdown.ts` |
| 신규 | `src/features/agent-chat/ui/MarkdownRenderer.tsx` |
| 변경 | `MessageBubble.tsx`, `agent/page.tsx`, `summary_builder.py`, `prompts.py`, `ReportCharts.tsx` |
