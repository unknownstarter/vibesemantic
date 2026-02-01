---
name: data-engineer
description: Covers data engineering responsibilities: ETL/ELT pipelines, data warehouse and mart design, schema and partitioning, data quality and validation, batch and streaming, source integration, and data governance. Use when designing or building ingestion, transformation, storage, or data pipelines.
---

# Data Engineer (Vibe Semantic)

## What Data Engineers Actually Do

- **파이프라인 설계·구축**: 소스(API, DB, 파일, 이벤트)에서 목적지(마트, 웨어하우스, 레이크)까지 ETL/ELT 설계. 추출·변환·로드 단계를 명확히 하고, 실패·재시도·재실행 정책을 정의한다.
- **스키마·저장소 설계**: 목적지 스키마(테이블, 컬럼, 타입, 제약) 설계. 그레인(이벤트/일/집계)과 파티셔닝·인덱싱으로 조회 성능과 비용을 조절한다. 정규화 vs 비정규화는 사용 패턴(OLTP vs 분석)에 맞춘다.
- **데이터 품질·검증**: 수집·변환 단계에서 품질 규칙(널, 중복, 범위, 포맷)을 적용한다. 검증 실패 시 로그·알림·재처리 절차를 둔다. 중요 지표는 모니터링·대시보드로 추적한다.
- **배치·스트리밍**: 배치는 스케줄·의존성·리소스 한도를 정의하고, 대용량은 청크·병렬화로 처리한다. 실시간이 필요하면 스트리밍/이벤트 파이프라인을 설계한다.
- **소스 연동**: 각 소스(외부 API, DB, 파일 업로드, 이벤트 버스)에 맞는 커넥터·인증·레이트 리밋·에러 핸들링을 설계한다. 스키마 진화(컬럼 추가·타입 변경) 시 하위 호환과 백필을 고려한다.
- **거버넌스·메타데이터**: 데이터 라인리지(어디서 왔는지, 어떤 변환을 거쳤는지), 메타데이터(스키마, 설명, 소유자), 접근 제어와 보존 정책을 문서화하고 도구로 관리한다.
- **확장성·비용·SLA**: 데이터량·처리 빈도 증가를 고려해 파이프라인과 저장소를 설계한다. 비용(스토리지·연산·API 호출)과 SLA(지연·가용성)를 트레이드오프한다.

## 문제·이상 발견 방식

- **모니터링·알림**: 파이프라인 실행 성공/실패·지연·레코드 수를 메트릭으로 수집하고, 임계값 초과 시 알림한다. 대시보드로 추세를 본다.
- **품질 메트릭**: 결측률·중복·범위 위반·스키마 불일치를 검증 단계에서 측정하고, 실패 시 로그·재처리 경로를 둔다.
- **실패·재실행 추적**: 실패 원인(소스 장애·타임아웃·검증 실패)을 로그·상태로 남기고, 재실행·백필 절차를 문서화한다. 분석가·개발자 요청 시 라인리지·기간으로 영향 범위를 짚는다.

## When to Use This Skill

- Designing or changing ingestion (CSV/Excel, GA4, future sources).
- Defining or evolving mart/warehouse schema, staging tables, or transformations.
- Adding data quality checks, validation, or monitoring.
- Planning batch schedule, retry, backfill, or streaming.
- Documenting lineage, metadata, or governance.

## Principles

- **Single source of truth**: 원시 데이터는 한 번 수집·저장하고, 마트/뷰는 그 위에서 변환·집계한다. 중복 수집과 불일치를 피한다.
- **Idempotency and replay**: 파이프라인은 재실행해도 결과가 일관되게 나오도록 설계한다. 타임스탬프·범위·키 기반으로 증분/전체 재처리가 가능하게 한다.
- **Fail visibly**: 변환·검증 실패는 로그·상태·알림으로 드러나게 하고, 수동/자동 복구 절차를 둔다. 사용자에게는 적절한 메시지(예: "데이터 처리 중 오류")만 노출한다.
- **Schema evolution**: 스키마 변경은 additive(컬럼 추가)를 우선하고, breaking change는 버전·마이그레이션·백필로 처리한다.

## Extensibility

- **New source**: 커넥터(추출)·스테이징 스키마·마트 매핑·검증 규칙을 추가한다. 기존 마트 그레인을 재사용할 수 있으면 재사용하고, 필요할 때만 확장한다.
- **New transformation**: 변환 로직을 파이프라인 단계로 명확히 넣고, 테스트·재실행 가능하게 둔다.
- **Scale**: 대용량 시 청크·배치·파티션·비동기 큐를 도입하고, 비용·지연을 모니터링한다.
- **새 소스·새 지표 요청 시**: 분석가·제품 요구와 맞춰 그레인·차원을 정한 뒤, 스테이징 스키마·마트 매핑·검증 규칙을 추가하고, 라인리지를 문서에 반영한다.

## Reference (Current)

- Ingestion: `src/app/api/projects/.../csv/` (upload, probe, confirm, ingest), GA4 refresh, Brain API collect endpoints. Mart: `mart_events`, staging tables in `supabase/migrations/`. Transform: `python-brain/app/services/csv_ingest.py`, collectors. Schema: `src/types/database.ts`, migrations.
