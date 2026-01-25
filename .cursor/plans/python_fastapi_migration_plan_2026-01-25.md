# Python FastAPI 마이그레이션 계획
**Date: 2026-01-25**
**Status: 계획 수립**

## 🎯 제안된 아키텍처

```
Python FastAPI (The Brain) - GCP Cloud Run / AWS App Runner
├── LangGraph 엔진
│   └── 리포트 생성, 채팅 분석
├── 고급 데이터 수집기 (Collector)
│   ├── GA4 데이터 수집
│   └── CSV 데이터 수집
└── CSV 프로파일러
    └── 스키마 분석 및 매핑
```

---

## 📊 현재 vs 제안 아키텍처 비교

### 현재 아키텍처 (Monolithic Next.js)

**구조:**
```
Next.js 서버 (Vercel)
├── API Routes
│   ├── /api/workspaces/[workspaceId]/agent
│   │   └── runAnalysis() (TypeScript, 3-10초)
│   ├── /api/projects/[projectId]/refresh
│   │   └── refreshMartData() (TypeScript, 10-30초)
│   ├── /api/projects/[projectId]/csv/datasets/[datasetId]/ingest
│   │   └── ingestDataset() (TypeScript, 10-60초)
│   └── /api/projects/[projectId]/csv/datasets/[datasetId]/probe
│       └── probeSchema() (TypeScript, 5-15초)
└── Frontend
```

**제약사항:**
- ❌ **타임아웃**: Vercel Hobby 60초, Pro 300초
- ❌ **메모리**: 제한적
- ❌ **동시 처리**: 제한적
- ❌ **확장성**: 수직 확장만 가능

### 제안된 아키텍처 (Microservices)

**구조:**
```
Next.js 서버 (Frontend + 간단한 API)
└── API Routes (인증, CRUD만)
    └── Python FastAPI 서버로 위임

Python FastAPI 서버 (The Brain)
├── /api/v1/analyze
│   └── LangGraph 실행 (Python, 무제한)
├── /api/v1/collect/ga4
│   └── GA4 데이터 수집 (Python, 무제한)
├── /api/v1/collect/csv
│   └── CSV 데이터 수집 (Python, 무제한)
└── /api/v1/profiler/csv
    └── CSV 프로파일링 (Python, 무제한)
```

**장점:**
- ✅ **타임아웃**: Cloud Run 최대 60분
- ✅ **메모리**: 독립 할당 (최대 8GB)
- ✅ **동시 처리**: 오토스케일링 (수백~수천)
- ✅ **확장성**: 수평 확장

---

## 🔍 현재 코드베이스 분석

### 1. LangGraph 엔진

**현재 위치:**
- `src/lib/langgraph/graph.ts` - `runAnalysis()`
- `src/lib/langgraph/nodes.ts` - 노드 로직
- `src/lib/langgraph/prompts.ts` - 프롬프트
- `src/lib/langgraph/types.ts` - 타입 정의

**실행 위치:**
- `src/app/api/workspaces/[workspaceId]/agent/route.ts`

**실행 시간:**
- 리포트 생성: 3-10초
- 채팅 응답: 3-10초

**문제점:**
- Vercel 타임아웃 제약
- LLM 호출이 많을 경우 타임아웃 가능
- 메모리 집약적 (LangGraph 상태 관리)

---

### 2. GA4 데이터 수집기

**현재 위치:**
- `src/lib/ga4/api.ts` - `refreshMartData()`
- `src/lib/ga4/rate-limiter.ts` - Rate limiting

**실행 위치:**
- `src/app/api/projects/[projectId]/refresh/route.ts`

**실행 시간:**
- 7일 데이터: 10-20초
- 30일 데이터: 20-40초

**문제점:**
- 여러 GA4 API 호출 (Rate limiting 필요)
- 대용량 데이터 처리
- 타임아웃 가능성 (30일 데이터)

---

### 3. CSV 프로파일러

**현재 위치:**
- `src/lib/csv/probe.ts` - `probeSchema()`
- `src/lib/csv/parser.ts` - CSV 파싱

**실행 위치:**
- `src/app/api/projects/[projectId]/csv/datasets/[datasetId]/probe/route.ts`

**실행 시간:**
- 스키마 분석: 5-15초 (LLM 호출)

**문제점:**
- LLM 호출로 인한 지연
- 복잡한 분석 로직

---

### 4. CSV 데이터 수집기

**현재 위치:**
- `src/lib/csv/ingest.ts` - `ingestDataset()`

**실행 위치:**
- `src/app/api/projects/[projectId]/csv/datasets/[datasetId]/ingest/route.ts`

**실행 시간:**
- 소규모 파일: 10-30초
- 대규모 파일: 30-60초

**문제점:**
- 대용량 파일 처리
- 타임아웃 가능성 (대규모 파일)

---

## 🚀 마이그레이션 계획

### Phase 1: Python FastAPI 서버 구축

#### 1.1 프로젝트 구조
```
python-brain/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 앱
│   ├── config.py               # 환경 변수 설정
│   ├── langgraph/
│   │   ├── __init__.py
│   │   ├── graph.py            # LangGraph 엔진
│   │   ├── nodes.py            # 노드 로직
│   │   ├── prompts.py          # 프롬프트
│   │   └── types.py            # 타입 정의
│   ├── collectors/
│   │   ├── __init__.py
│   │   ├── ga4_collector.py    # GA4 데이터 수집
│   │   └── csv_collector.py    # CSV 데이터 수집
│   ├── profilers/
│   │   ├── __init__.py
│   │   └── csv_profiler.py   # CSV 프로파일링
│   ├── services/
│   │   ├── __init__.py
│   │   ├── supabase.py         # Supabase 클라이언트
│   │   └── auth.py             # 인증 헬퍼
│   └── utils/
│       ├── __init__.py
│       └── rate_limiter.py     # Rate limiting
├── requirements.txt
├── Dockerfile
├── .env.example
└── README.md
```

#### 1.2 API 엔드포인트 설계

```python
# POST /api/v1/analyze
# - 리포트 생성, 채팅 분석
# Request: {
#   "workspace_id": "...",
#   "project_id": "...",
#   "mode": "report" | "chat",
#   "range": "7d" | "30d",
#   "user_message": "...",
#   "thread_id": "...",
#   "language": "ko" | "en",
#   ...
# }
# Response: {
#   "analysis_markdown": "...",
#   "analyst_questions": [...],
#   "mart_summary": {...},
#   "thread_id": "..."
# }

# POST /api/v1/collect/ga4
# - GA4 데이터 수집
# Request: {
#   "project_id": "...",
#   "range": "7d" | "30d"
# }
# Response: {
#   "success": true,
#   "records_inserted": 1234
# }

# POST /api/v1/collect/csv
# - CSV 데이터 수집
# Request: {
#   "project_id": "...",
#   "dataset_id": "...",
#   "mapping": {...},
#   "date_range": {...}
# }
# Response: {
#   "success": true,
#   "total_rows": 10000,
#   "inserted_records": 10000
# }

# POST /api/v1/profiler/csv
# - CSV 스키마 프로파일링
# Request: {
#   "headers": [...],
#   "sample_rows": [...],
#   "language": "ko" | "en",
#   "project_profile": {...}
# }
# Response: {
#   "date_column": "...",
#   "metric_columns": [...],
#   "dimension_columns": [...],
#   "aggregation_rules": {...}
# }
```

---

### Phase 2: Next.js API Routes 수정

#### 2.1 LangGraph 엔진 분리

**변경 전:**
```typescript
// src/app/api/workspaces/[workspaceId]/agent/route.ts
import { runAnalysis } from '@/lib/langgraph/graph'

export async function POST(...) {
  const result = await runAnalysis({ ... }) // 직접 실행
  return NextResponse.json(result)
}
```

**변경 후:**
```typescript
// src/app/api/workspaces/[workspaceId]/agent/route.ts
export async function POST(...) {
  // Python FastAPI 서버로 위임
  const response = await fetch(`${process.env.BRAIN_API_URL}/api/v1/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.BRAIN_API_KEY}`,
    },
    body: JSON.stringify({
      workspace_id: workspaceId,
      project_id: project.id,
      mode,
      range,
      user_message,
      thread_id: threadId,
      language,
      project_profile: project.profile || {},
      workspace_purpose: workspace.purpose,
      agent_config: workspace.agent_config || {},
      user_id: user.id,
      role,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    return NextResponse.json({ error: error.detail || 'Analysis failed' }, { status: response.status })
  }

  const result = await response.json()
  return NextResponse.json({
    analysisMarkdown: result.analysis_markdown,
    analystQuestions: result.analyst_questions,
    martSummary: result.mart_summary,
    threadId: result.thread_id,
  })
}
```

#### 2.2 GA4 데이터 수집기 분리

**변경 전:**
```typescript
// src/app/api/projects/[projectId]/refresh/route.ts
import { refreshMartData } from '@/lib/ga4/api'

export async function POST(...) {
  const result = await refreshMartData(projectId, range)
  return NextResponse.json(result)
}
```

**변경 후:**
```typescript
// src/app/api/projects/[projectId]/refresh/route.ts
export async function POST(...) {
  const response = await fetch(`${process.env.BRAIN_API_URL}/api/v1/collect/ga4`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.BRAIN_API_KEY}`,
    },
    body: JSON.stringify({
      project_id: projectId,
      range,
    }),
  })

  const result = await response.json()
  return NextResponse.json(result)
}
```

#### 2.3 CSV 프로파일러 분리

**변경 전:**
```typescript
// src/app/api/projects/[projectId]/csv/datasets/[datasetId]/probe/route.ts
import { probeSchema } from '@/lib/csv/probe'

export async function POST(...) {
  const probeResult = await probeSchema(headers, sampleRows, language, projectProfile)
  return NextResponse.json({ mapping: probeResult })
}
```

**변경 후:**
```typescript
// src/app/api/projects/[projectId]/csv/datasets/[datasetId]/probe/route.ts
export async function POST(...) {
  const response = await fetch(`${process.env.BRAIN_API_URL}/api/v1/profiler/csv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.BRAIN_API_KEY}`,
    },
    body: JSON.stringify({
      headers,
      sample_rows: sampleRows,
      language,
      project_profile: projectProfile,
    }),
  })

  const probeResult = await response.json()
  return NextResponse.json({ mapping: probeResult })
}
```

#### 2.4 CSV 수집기 분리

**변경 전:**
```typescript
// src/app/api/projects/[projectId]/csv/datasets/[datasetId]/ingest/route.ts
import { ingestDataset } from '@/lib/csv/ingest'

export async function POST(...) {
  const result = await ingestDataset(supabase, projectId, datasetId, mapping, dateRange)
  return NextResponse.json(result)
}
```

**변경 후:**
```typescript
// src/app/api/projects/[projectId]/csv/datasets/[datasetId]/ingest/route.ts
export async function POST(...) {
  const response = await fetch(`${process.env.BRAIN_API_URL}/api/v1/collect/csv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.BRAIN_API_KEY}`,
    },
    body: JSON.stringify({
      project_id: projectId,
      dataset_id: datasetId,
      mapping,
      date_range: { start_date: startDate, end_date: endDate },
    }),
  })

  const result = await response.json()
  return NextResponse.json(result)
}
```

---

### Phase 3: 환경 변수 및 설정

#### 3.1 Next.js (.env.local)
```env
# Python FastAPI 서버 URL
BRAIN_API_URL=https://brain-xxx.run.app
BRAIN_API_KEY=xxx
```

#### 3.2 Python FastAPI (.env)
```env
# Supabase
SUPABASE_URL=xxx
SUPABASE_SERVICE_KEY=xxx

# OpenAI
OPENAI_API_KEY=xxx

# Google APIs (GA4)
GOOGLE_APPLICATION_CREDENTIALS=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# API Key (Next.js에서 호출 시 사용)
API_KEY=xxx
```

---

## 📈 예상 개선 효과

### 성능
- **타임아웃**: 60-300초 → 무제한 (최대 60분)
- **동시 처리**: 10-20개 → 수백~수천 개
- **응답 시간**: 유사 (네트워크 오버헤드 추가, 하지만 전용 리소스로 보완)

### 확장성
- **오토스케일링**: 자동으로 트래픽에 맞춰 확장
- **리소스 할당**: CPU/메모리 독립 할당
- **비용**: 사용한 만큼만 과금 (Cloud Run)

### 운영
- **모니터링**: Cloud Monitoring, Prometheus
- **로깅**: Cloud Logging, 구조화된 로그
- **에러 추적**: Sentry, Cloud Error Reporting

---

## ⚠️ 고려사항

### 장점
1. ✅ **확장성**: 무제한 확장 가능
2. ✅ **성능**: 전용 리소스로 최적화
3. ✅ **운영**: 상세 모니터링 및 로깅
4. ✅ **비용**: 사용한 만큼만 과금
5. ✅ **타임아웃 해소**: 긴 실행 시간 작업 가능

### 단점
1. ⚠️ **복잡도 증가**: 두 서버 관리
2. ⚠️ **네트워크 오버헤드**: Next.js → Python API 호출 (~50-100ms)
3. ⚠️ **인증/보안**: API 키 관리 필요
4. ⚠️ **마이그레이션 비용**: 기존 코드 이전 필요
5. ⚠️ **디버깅**: 두 서버 간 디버깅 복잡

---

## 🎯 권장 접근 방법

### Option 1: 점진적 마이그레이션 (권장) ⭐

**Phase 1: LangGraph 엔진만 분리**
- 가장 큰 이점 (타임아웃 해소)
- 가장 복잡한 로직
- 구현 시간: 2-3일

**Phase 2: CSV 프로파일러 분리**
- LLM 호출로 인한 지연
- 구현 시간: 1-2일

**Phase 3: 데이터 수집기 분리**
- GA4, CSV 수집기
- 구현 시간: 2-3일

**총 예상 시간: 5-8일**

### Option 2: 전체 마이그레이션

**한 번에 모든 컴포넌트 분리**
- 구현 시간: 7-10일
- 리스크: 높음
- 테스트 복잡도: 높음

---

## 📝 구현 체크리스트

### Python FastAPI 서버
- [ ] 프로젝트 구조 생성
- [ ] FastAPI 앱 설정
- [ ] Supabase 클라이언트 설정
- [ ] LangGraph 엔진 포팅
- [ ] GA4 수집기 포팅
- [ ] CSV 프로파일러 포팅
- [ ] CSV 수집기 포팅
- [ ] 인증/보안 설정
- [ ] 에러 처리
- [ ] 로깅 설정
- [ ] Dockerfile 작성
- [ ] Cloud Run 배포 설정

### Next.js 수정
- [ ] 환경 변수 추가
- [ ] LangGraph API Route 수정
- [ ] GA4 수집 API Route 수정
- [ ] CSV 프로파일러 API Route 수정
- [ ] CSV 수집 API Route 수정
- [ ] 에러 처리 개선
- [ ] 타임아웃 설정

---

## 🔧 다음 단계

1. **Python FastAPI 서버 기본 구조 생성**
2. **LangGraph 엔진 포팅** (가장 우선)
3. **Next.js API Routes 수정**
4. **테스트 및 배포**

진행할까요?
