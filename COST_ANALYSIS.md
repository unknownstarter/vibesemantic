# 비용 분석 및 무료 사용자 제한 전략

## 비용 발생 지점 분석

### 1. **OpenAI API (가장 큰 비용)**
- **위치**: 
  - `python-brain/app/langgraph/graph.py` (리포트/채팅 분석)
  - `src/lib/csv/probe.ts` (CSV 스키마 분석)
- **모델**: `gpt-4o`
- **사용 시점**:
  - **CSV 스키마 분석** (`/api/projects/[projectId]/csv/datasets/[datasetId]/probe`)
  - **리포트 생성** (`mode: 'report'`)
  - **채팅 메시지 응답** (`mode: 'chat'`)
- **예상 비용**: 
  - CSV probe당 약 $0.003-0.01 (작은 프롬프트)
  - 리포트당 약 $0.01-0.05
  - 채팅 메시지당 약 $0.005-0.02
- **제한 필요**: ✅ **필수**

### 2. **GA4 API (무료, Quota 제한만)**
- **위치**: `src/lib/ga4/api.ts`, `src/lib/ga4/rate-limiter.ts`
- **제한**: 
  - 200 requests/user/day (무료 tier)
  - 10 requests/second
- **비용**: 무료 (quota만 제한)
- **제한 필요**: ⚠️ Quota 관리만 필요

### 3. **Supabase Storage (CSV 파일)**
- **위치**: `src/app/api/projects/[projectId]/csv/datasets/[datasetId]/upload/route.ts`
- **무료 tier 제한**:
  - Storage: 1GB
  - Database: 500MB
- **비용**: 무료 tier 내에서는 무료
- **제한 필요**: ⚠️ 파일 크기/개수 제한 고려

### 4. **Supabase Database (Mart 테이블)**
- **위치**: Mart 테이블들 (`mart_ga4_daily_kpis`, `mart_csv_daily_metrics`, etc.)
- **무료 tier 제한**: 500MB
- **비용**: 무료 tier 내에서는 무료
- **제한 필요**: ⚠️ 데이터 기간/양 제한 고려

### 5. **Python 백엔드 서버 (Render)**
- **위치**: `python-brain/`
- **무료 tier**: 
  - 750시간/월
  - 60분 타임아웃
- **비용**: 무료 tier 내에서는 무료
- **제한 필요**: ⚠️ 사용 시간 모니터링

## 무료 사용자 제한 전략

### 옵션 1: 기능 제한 (추천)
- ✅ 프로젝트 생성: 무제한
- ✅ CSV 업로드: 파일당 최대 10MB, 프로젝트당 최대 5개 파일
- ⚠️ **CSV 스키마 분석 (Probe)**: 프로젝트당 월 10회 제한
- ✅ GA4 연결: 무제한 (quota 내에서)
- ⚠️ **리포트 생성**: 프로젝트당 월 3회 제한
- ⚠️ **채팅 메시지**: 프로젝트당 월 20회 제한
- ✅ 데이터 마트 생성: 무제한 (Supabase 제한 내에서)

### 옵션 2: 데이터 기간 제한
- ✅ 최근 7일 데이터만 분석 가능
- ✅ 30일 데이터는 유료 플랜만

### 옵션 3: Workspace 제한
- ✅ 프로젝트당 Workspace 1개만 생성 가능
- ✅ 추가 Workspace는 유료 플랜만

## 추천 전략

**하이브리드 접근**:
1. **프로젝트 생성/데이터 업로드**: 무제한 (Supabase 제한 내에서)
2. **CSV 스키마 분석 (Probe)**: 프로젝트당 월 10회 제한
3. **리포트 생성**: 프로젝트당 월 3회 제한
4. **채팅 메시지**: 프로젝트당 월 10회 제한
5. **데이터 기간**: 최근 7일만 무료, 30일은 유료

이렇게 하면:
- 사용자가 전체 플로우를 경험할 수 있음
- OpenAI 비용을 제어할 수 있음
- 유료 전환 인센티브 제공

## 구현 필요 사항

1. **사용량 추적 테이블** 생성
2. **제한 체크 미들웨어** 추가
3. **사용량 대시보드** 표시
4. **업그레이드 프롬프트** 추가
