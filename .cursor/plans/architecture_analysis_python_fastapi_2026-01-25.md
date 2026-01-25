# 아키텍처 분석: Python FastAPI 분리 제안
**Date: 2026-01-25**
**Status: 분석 완료**

## 🔍 현재 아키텍처 분석

### 현재 구조 (Monolithic Next.js)

```
Next.js 서버 (Vercel/Node.js)
├── API Routes
│   ├── /api/workspaces/[workspaceId]/agent
│   │   └── runAnalysis() → LangGraph 실행 (TypeScript)
│   ├── /api/projects/[projectId]/refresh
│   │   └── refreshMartData() → GA4 데이터 수집 (TypeScript)
│   ├── /api/projects/[projectId]/csv/datasets/[datasetId]/ingest
│   │   └── ingestDataset() → CSV 데이터 수집 (TypeScript)
│   └── /api/projects/[projectId]/csv/datasets/[datasetId]/probe
│       └── probeSchema() → CSV 프로파일링 (TypeScript)
└── Frontend (React)
```

**현재 위치:**
- **LangGraph 엔진**: `src/lib/langgraph/` (TypeScript, Next.js API Route에서 실행)
- **GA4 데이터 수집기**: `src/lib/ga4/api.ts` (TypeScript, Next.js API Route에서 실행)
- **CSV 프로파일러**: `src/lib/csv/probe.ts` (TypeScript, Next.js API Route에서 실행)
- **CSV 수집기**: `src/lib/csv/ingest.ts` (TypeScript, Next.js API Route에서 실행)

---

## 🎯 제안된 아키텍처 (Python FastAPI 분리)

```
Next.js 서버 (Frontend + 간단한 API)
└── API Routes (인증, CRUD만)
    ├── /api/projects
    ├── /api/workspaces
    └── ...

Python FastAPI 서버 (The Brain) - GCP Cloud Run / AWS App Runner
├── LangGraph 엔진
│   └── 리포트 생성, 채팅 분석
├── 고급 데이터 수집기 (Collector)
│   ├── GA4 데이터 수집
│   └── CSV 데이터 수집
└── CSV 프로파일러
    └── 스키마 분석 및 매핑
```

---

## 📊 비교 분석

### 현재 아키텍처의 문제점

#### 1. **성능 및 확장성**
- ❌ **타임아웃 제약**: Vercel/Next.js API Routes는 최대 60초 (Hobby) 또는 300초 (Pro)
- ❌ **콜드 스타트**: LangGraph 실행 시 초기 로딩 시간
- ❌ **메모리 제약**: Next.js 서버의 메모리 제한
- ❌ **동시 처리 제한**: Vercel의 동시 실행 제한

#### 2. **리소스 집약적 작업**
- ❌ **LangGraph 실행**: LLM 호출, 상태 관리, 그래프 실행 (3-10초)
- ❌ **GA4 데이터 수집**: 여러 API 호출, 대용량 데이터 처리 (10-30초)
- ❌ **CSV 수집**: 대용량 파일 파싱, 변환, DB 삽입 (10-60초)
- ❌ **CSV 프로파일링**: LLM 호출, 스키마 분석 (5-15초)

#### 3. **운영 및 모니터링**
- ❌ **로깅 제한**: Next.js 서버 로그만 가능
- ❌ **메트릭 수집 어려움**: 성능 모니터링 제한
- ❌ **에러 추적**: 복잡한 에러 핸들링

---

### 제안된 아키텍처의 장점

#### 1. **성능 및 확장성**
- ✅ **무제한 타임아웃**: Cloud Run/App Runner는 최대 60분
- ✅ **전용 리소스**: CPU, 메모리 독립 할당
- ✅ **오토스케일링**: 트래픽에 따라 자동 확장
- ✅ **동시 처리**: 수백~수천 요청 동시 처리 가능

#### 2. **리소스 집약적 작업 최적화**
- ✅ **LangGraph**: Python 네이티브 지원, 더 나은 성능
- ✅ **데이터 수집**: 백그라운드 작업, 큐 시스템 가능
- ✅ **CSV 처리**: 대용량 파일 처리 최적화
- ✅ **LLM 호출**: 배치 처리, 캐싱 최적화

#### 3. **운영 및 모니터링**
- ✅ **상세 로깅**: Cloud Logging 통합
- ✅ **메트릭 수집**: Cloud Monitoring, Prometheus
- ✅ **에러 추적**: Sentry, Cloud Error Reporting
- ✅ **비용 최적화**: 사용한 만큼만 과금 (Cloud Run)

---

## 🔄 마이그레이션 계획

### Phase 1: Python FastAPI 서버 구축

#### 1.1 기본 구조
```
python-brain/
├── app/
│   ├── main.py              # FastAPI 앱
│   ├── langgraph/
│   │   ├── graph.py         # LangGraph 엔진
│   │   ├── nodes.py         # 노드 로직
│   │   └── prompts.py       # 프롬프트
│   ├── collectors/
│   │   ├── ga4_collector.py # GA4 데이터 수집
│   │   └── csv_collector.py # CSV 데이터 수집
│   ├── profilers/
│   │   └── csv_profiler.py  # CSV 프로파일링
│   └── services/
│       └── supabase.py      # Supabase 클라이언트
├── requirements.txt
└── Dockerfile
```

#### 1.2 API 엔드포인트
```python
# POST /api/v1/analyze
# - 리포트 생성, 채팅 분석

# POST /api/v1/collect/ga4
# - GA4 데이터 수집

# POST /api/v1/collect/csv
# - CSV 데이터 수집

# POST /api/v1/profiler/csv
# - CSV 스키마 프로파일링
```

---

### Phase 2: Next.js API Routes 수정

#### 2.1 변경 전
```typescript
// src/app/api/workspaces/[workspaceId]/agent/route.ts
export async function POST(...) {
  const result = await runAnalysis({ ... }) // 직접 실행
  return NextResponse.json(result)
}
```

#### 2.2 변경 후
```typescript
// src/app/api/workspaces/[workspaceId]/agent/route.ts
export async function POST(...) {
  // Python FastAPI 서버로 위임
  const response = await fetch(`${process.env.BRAIN_API_URL}/api/v1/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ... }),
  })
  return NextResponse.json(await response.json())
}
```

---

### Phase 3: 환경 변수 및 설정

#### 3.1 Next.js (.env.local)
```env
BRAIN_API_URL=https://brain-xxx.run.app
BRAIN_API_KEY=xxx
```

#### 3.2 Python FastAPI (.env)
```env
SUPABASE_URL=xxx
SUPABASE_SERVICE_KEY=xxx
OPENAI_API_KEY=xxx
GOOGLE_APPLICATION_CREDENTIALS=xxx
```

---

## 📈 예상 개선 효과

### 성능
- **타임아웃**: 60초 → 무제한 (최대 60분)
- **동시 처리**: 10-20개 → 수백~수천 개
- **응답 시간**: 유사 (네트워크 오버헤드 추가, 하지만 전용 리소스로 보완)

### 확장성
- **오토스케일링**: 자동으로 트래픽에 맞춰 확장
- **리소스 할당**: CPU/메모리 독립 할당
- **비용**: 사용한 만큼만 과금

### 운영
- **모니터링**: 상세 메트릭 수집
- **로깅**: 구조화된 로그
- **에러 추적**: 개선된 디버깅

---

## ⚠️ 고려사항

### 장점
1. ✅ **확장성**: 무제한 확장 가능
2. ✅ **성능**: 전용 리소스로 최적화
3. ✅ **운영**: 상세 모니터링 및 로깅
4. ✅ **비용**: 사용한 만큼만 과금

### 단점
1. ⚠️ **복잡도 증가**: 두 서버 관리
2. ⚠️ **네트워크 오버헤드**: Next.js → Python API 호출
3. ⚠️ **인증/보안**: API 키 관리 필요
4. ⚠️ **마이그레이션 비용**: 기존 코드 이전 필요

---

## 🎯 권장사항

### 즉시 분리 권장 (High Priority)
1. **LangGraph 엔진** - LLM 호출, 긴 실행 시간
2. **CSV 프로파일러** - LLM 호출, 복잡한 분석

### 중기 분리 고려 (Medium Priority)
3. **GA4 데이터 수집기** - 여러 API 호출, 대용량 데이터
4. **CSV 데이터 수집기** - 대용량 파일 처리

### 유지 가능 (Low Priority)
5. **간단한 CRUD API** - Next.js에서 유지
6. **인증/권한 체크** - Next.js에서 유지

---

## 📝 다음 단계

### Option 1: 점진적 마이그레이션 (권장)
1. Python FastAPI 서버 구축
2. LangGraph 엔진만 먼저 분리
3. 점진적으로 다른 컴포넌트 분리

### Option 2: 전체 마이그레이션
1. Python FastAPI 서버 구축
2. 모든 컴포넌트 한 번에 분리
3. 테스트 및 배포

---

## 🔧 구현 예시

### Python FastAPI 엔드포인트 예시
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

@app.post("/api/v1/analyze")
async def analyze(request: AnalyzeRequest):
    # LangGraph 실행
    result = await run_analysis(
        project_id=request.project_id,
        workspace_id=request.workspace_id,
        mode=request.mode,
        range=request.range,
        user_message=request.user_message,
    )
    return result

@app.post("/api/v1/collect/ga4")
async def collect_ga4(request: GA4CollectRequest):
    # GA4 데이터 수집
    result = await collect_ga4_data(
        project_id=request.project_id,
        range=request.range,
    )
    return result
```

---

## ✅ 결론

**제안된 아키텍처는 확장성과 성능 측면에서 유리합니다.**

특히:
- **LangGraph 엔진**: Python 네이티브 지원, 더 나은 성능
- **타임아웃 제약 해소**: 긴 실행 시간 작업 가능
- **오토스케일링**: 트래픽 증가에 자동 대응
- **운영 개선**: 상세 모니터링 및 로깅

**권장 접근:**
1. LangGraph 엔진부터 분리 (가장 큰 이점)
2. CSV 프로파일러 분리 (LLM 호출)
3. 점진적으로 다른 컴포넌트 분리
