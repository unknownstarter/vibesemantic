---
name: data-analyst
description: Defines principles for metrics, semantic layer, mart design, and analysis output in data-analysis products. Use when designing or extending KPIs, dimensions, metric definitions, report/chat output expectations, or data model for analytics.
---

# Data Analyst (Vibe Semantic)

## What Data Analysts Actually Do

- **비즈니스 요구사항 → 지표·차원 정의**: 이해관계자 질문을 받아 측정 가능한 KPI·차원으로 바꾼다. 지표 이름·정의·계산식·단위를 문서화해 팀이 같은 의미로 쓰게 한다.
- **대시보드·리포트·KPI 모니터링**: 정기 리포트와 대시보드를 설계·유지한다. 누가 무엇을 언제 보는지, 알림·임계값을 정한다.
- **데이터 품질·이상 탐지**: 수집·집계 결과의 완전성·일관성을 점검한다. 이상치·결측·급변을 탐지하고 원인 추적·알림 절차를 둔다.
- **세맨틱 레이어·메트릭 카탈로그**: 지표와 차원을 한 곳에서 정의해 리포트·채팅·AI가 동일한 정의를 쓰게 한다. 비즈니스 용어와 기술 필드를 매핑한다.
- **스토리텔링·권고안**: 숫자만 나열하지 않고, 트렌드·원인·시사점을 해석하고 다음 액션(우선순위, 실험 제안)을 제안한다.

## 인사이트 발굴 방식

- **정기 리뷰**: 대시보드·리포트를 주기적으로 보며 트렌드·이상·변곡점을 포착한다. 알림·임계값으로 예외를 먼저 본다.
- **질문 수집**: 이해관계자에게 "지금 궁금한 것·결정에 필요한 것"을 묻고, 이를 지표·차원·세그먼트로 바꾼다.
- **ad-hoc 분석**: 일회성 질문에 대해 데이터 유무를 확인한 뒤, 기존 지표 조합 또는 임시 집계로 답하고, 반복되면 지표·리포트에 반영한다.
- **품질·이상**: 수집·집계 결과의 결측·급변·이상치를 보고 원인(파이프라인·소스·정의)을 추적한다.

## When to Use This Skill

- Defining or changing metrics, dimensions, or semantic layer.
- Designing mart schema or event model for analytics.
- Specifying what reports or AI answers should contain (structure, KPIs, recommendations).
- Adding new data sources or analysis purposes (product, marketing, sales, etc.).

## Principles

- **Semantic layer**: Single source of truth for metric names, descriptions, and formulas. Enables consistent language across report, chat, and future features. New metrics should be defined here first; derivation logic lives in one place.
- **Mart / events**: Store at grain that supports both aggregation and drill-down. Typical: event/date + metric name + dimensions + value. Avoid storing only pre-aggregated numbers if you need flexibility (e.g. breakdowns by channel, cohort).
- **KPI vs dimension**: KPIs are measurable outcomes (DAU, CVR, revenue). Dimensions are breakdowns (channel, device, cohort). New analysis types (e.g. retention, funnel) should map to this distinction so prompts and UI can stay consistent.
- **Analysis output**: Reports and chat should cite metrics by name, show numbers with context (trend, comparison), and suggest next actions. When extending output format, keep: headline → evidence (metrics) → interpretation → optional actions.

## Extensibility

- **New metrics**: Add to metric definitions with name, description, formula, and optional dimensions. Ensure collection/ingest pipeline can populate mart at the right grain. Consider token impact if metric list is sent to LLM—prefer summarized or scoped lists.
- **New data sources**: Model as a new collection path (e.g. new collector) → staging → mart. Reuse existing mart schema where possible; extend only when grain or dimensions differ. Document mapping from source to mart for future analysts.
- **New analysis purposes** (e.g. product, marketing, sales): Represent as workspace or dataset purpose. Drive template prompts and default metrics from this purpose; do not hardcode per-purpose logic everywhere—prefer configuration (e.g. purpose → metric subset, template).
- **새 질문/요구 도입 시**: 1) 질문을 측정 가능한 지표·차원으로 정의 2) 해당 데이터가 마트/세맨틱에 있는지 확인 3) 없으면 데이터 엔지니어와 수집·스키마 논의 4) 있으면 리포트/에이전트 프롬프트·메트릭 목록에 반영.

## Reference (Current)

- Metric definitions and mart schema: `src/types/database.ts`, `supabase/migrations/`. Semantic layer usage: Brain API prompts and summary builders.
- Mart summary sent to LLM is trimmed (e.g. limited series length, top-N lists) to control token usage; see AI-agent-developer skill for prompt design.
