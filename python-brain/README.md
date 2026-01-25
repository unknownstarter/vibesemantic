# Python Brain API
**Vibe Semantic의 AI 엔진 및 데이터 수집 서버**

## 개요

Python FastAPI 기반의 백엔드 서버로, 다음 기능을 제공합니다:
- LangGraph 엔진: 리포트 생성 및 채팅 분석
- GA4 데이터 수집기: Google Analytics 4 데이터 수집
- CSV 데이터 수집기: CSV 파일 수집 및 변환
- CSV 프로파일러: CSV 스키마 분석 및 매핑

## 배포

- **Render** (무료 플랜 지원) 또는 **GCP Cloud Run** / **AWS App Runner**에 배포
- 오토스케일링 지원 (유료 플랜)
- 최대 60분 타임아웃

## API 엔드포인트

### POST /api/v1/analyze
리포트 생성 또는 채팅 분석

### POST /api/v1/collect/ga4
GA4 데이터 수집

### POST /api/v1/collect/csv
CSV 데이터 수집

### POST /api/v1/profiler/csv
CSV 스키마 프로파일링
