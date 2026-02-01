# CSV Fixtures — 형식 다양성 검증용

**목적**: "Date, Sessions, Leads" 한 가지 형식만 인식하도록 얇팍하게 고친 게 아닌지 검증.  
데이터 분석가·데이터 사이언티스트 관점에서 **다양한 컬럼명·날짜 형식·메트릭명**을 가진 CSV로 파서·Probe·Ingest·리포트가 동작하는지 테스트.

---

## 설계 원칙 (Data Analyst / Data Scientist)

- **KPI vs 차원**: 날짜(시간 차원) 1개 + 수치 메트릭 N개. 컬럼명은 비즈니스마다 다르므로 **값 패턴으로 타입 추론**이 되어야 함.
- **날짜 형식 다양성**: ISO(2026-01-01), 슬래시(2026/01/01), 월만(2026-01) 등 파서/Probe가 모두 날짜로 인식해야 함.
- **메트릭명 다양성**: 한글(매출, 주문수, DAU, 신규가입), 영문(visitors, signups) 등 **헤더 이름에 의존하지 않고** 값이 수치면 메트릭으로 분류되어야 함.
- **재현성**: 동일 파일 → 동일 Probe 결과(날짜 컬럼 + 메트릭 컬럼 식별). 하드코딩된 컬럼명이면 다른 픽스처에서 실패한다.

---

## Fixture 목록

| 파일 | 날짜 컬럼 | 메트릭 컬럼 | 날짜 형식 | 용도 |
|------|-----------|-------------|-----------|------|
| myleads_simple.csv | Date | Sessions, Leads | YYYY-MM-DD | 기준(문제 제기된 형식) |
| revenue_daily.csv | 날짜 | 매출, 주문수 | YYYY/MM/DD | 한글 헤더 + 슬래시 날짜 |
| traffic_weekly.csv | week_start | visitors, signups | YYYY-MM-DD | 영문 다른 이름 + 주 단위 |
| kpi_monthly.csv | 기준월 | DAU, 신규가입 | YYYY-MM | 월 단위 + 한글 메트릭 |
| **segments_no_date.csv** | **없음** | revenue, users | — | **날짜 없음** (세그먼트별 집계) |

---

## 검증 시 기대

- **파서**: 5개 파일 모두 헤더·데이터 행 정상 파싱 (컬럼명·날짜 유무 무관).
- **Probe**: 날짜 있음 → dateColumn 1개 + metricColumns N개. **날짜 없음** → dateColumn null + metricColumns N개.
- **Ingest**: date_column이 null이면 placeholder(오늘)로 date 적재. mart_csv_daily_metrics에 적재.
- **리포트/채팅**: CSV 전용이면 채널 미언급, 해당 메트릭명으로 서술.
