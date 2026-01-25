# 아키텍처 및 주요 로직 설계
**작성일**: 2026-01-26  
**버전**: 1.0

---

## 1. 시스템 아키텍처 개요

### 1.1 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Marketing   │  │   App (Auth)  │  │   API Routes │ │
│  │   Landing    │  │   Dashboard   │  │   (CRUD)     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTP
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Backend Services                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Python Brain API (FastAPI)               │  │
│  │  ┌──────────────┐  ┌──────────────┐            │  │
│  │  │  LangGraph   │  │   Collectors │            │  │
│  │  │   Engine     │  │   (GA4/CSV)  │            │  │
│  │  └──────────────┘  └──────────────┘            │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Supabase   │  │  Google      │  │  Google      │
│  (PostgreSQL │  │  Analytics 4  │  │  Sheets API  │
│   + Auth)    │  │  + BigQuery   │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

### 1.2 기술 스택

**Frontend:**
- Next.js 14 (App Router)
- TypeScript (Strict Mode)
- React Query (데이터 페칭)
- TailwindCSS (스타일링)
- Supabase Client (인증)

**Backend:**
- Python FastAPI (Brain API)
- LangGraph + LangChain (AI 엔진)
- Supabase (PostgreSQL, Auth, RLS)
- Google Analytics 4 API
- Google BigQuery API
- Google Sheets API (Apps Script)

**Infrastructure:**
- Vercel (Frontend 배포)
- Render / Cloud Run (Brain API 배포)
- Supabase Cloud (Database, Auth)

---

## 2. 데이터 플로우

### 2.1 사용자 인증 플로우

```
1. 사용자 로그인 시도
   ↓
2. Supabase Auth (Email OTP / Google OAuth)
   ↓
3. 세션 생성 (3분 유효)
   ↓
4. RLS (Row Level Security) 정책 적용
   ↓
5. 사용자별 데이터 접근 제어
```

**주요 파일:**
- `src/app/(auth)/login/page.tsx` - 로그인 UI
- `src/lib/supabase/client.ts` - Supabase 클라이언트
- `src/lib/supabase/middleware.ts` - 인증 미들웨어

### 2.2 프로젝트 생성 및 데이터 소스 연결

```
1. 프로젝트 생성
   POST /api/projects
   ↓
2. 프로필 정보 저장 (산업, 목표 등)
   ↓
3. Semantic Layer 활성화
   ↓
4. Metric Definitions 자동 생성
   ↓
5. 데이터 소스 연결 (GA4 / CSV)
   ↓
6. Workspace 생성
```

**주요 파일:**
- `src/app/api/projects/route.ts` - 프로젝트 CRUD
- `src/lib/semantic-layer/metrics.ts` - 메트릭 정의 생성
- `src/app/api/ga4/oauth/start/route.ts` - GA4 OAuth 시작

### 2.3 데이터 수집 플로우

#### GA4 데이터 수집
```
1. 사용자 GA4 연결 요청
   POST /api/ga4/oauth/start
   ↓
2. Google OAuth 인증
   ↓
3. Property 선택
   POST /api/ga4/properties/select
   ↓
4. 데이터 수집 요청
   POST /api/projects/[id]/refresh
   ↓
5. Brain API 호출
   POST {BRAIN_API_URL}/api/v1/collect/ga4
   ↓
6. BigQuery 쿼리 실행
   ↓
7. mart_events 테이블에 저장
```

**주요 파일:**
- `src/app/api/projects/[projectId]/refresh/route.ts` - GA4 수집 트리거
- `python-brain/app/collectors/ga4_collector.py` - GA4 수집 로직

#### CSV 데이터 수집
```
1. CSV 파일 업로드
   POST /api/projects/[id]/csv/datasets/[id]/upload
   ↓
2. 스키마 프로파일링
   POST /api/projects/[id]/csv/datasets/[id]/probe
   ↓
3. 컬럼 매핑 설정 (사용자 확인)
   POST /api/projects/[id]/csv/datasets/[id]/confirm
   ↓
4. 데이터 수집
   POST /api/projects/[id]/csv/datasets/[id]/ingest
   ↓
5. Brain API 호출
   POST {BRAIN_API_URL}/api/v1/collect/csv
   ↓
6. mart_events 테이블에 저장
```

**주요 파일:**
- `src/lib/csv/probe.ts` - CSV 프로파일링
- `src/app/api/projects/[projectId]/csv/datasets/[datasetId]/ingest/route.ts` - CSV 수집
- `python-brain/app/collectors/csv_collector.py` - CSV 수집 로직

### 2.4 AI 분석 플로우

#### 리포트 생성
```
1. Workspace 리포트 요청
   POST /api/workspaces/[id]/report
   ↓
2. Brain API 호출
   POST {BRAIN_API_URL}/api/v1/analyze
   {
     mode: "report",
     workspace_id: "...",
     range: "7d" | "30d"
   }
   ↓
3. LangGraph 실행
   ├─ load_context_and_mart_summary()
   │  ├─ 프로젝트 프로필 로드
   │  ├─ Metric Definitions 로드 (Semantic Layer)
   │  └─ mart_events 데이터 쿼리
   ├─ build_system_prompt()
   │  └─ 메트릭 정의 포함
   ├─ run_llm_analysis()
   │  └─ 리포트 생성
   └─ persist_results()
      └─ 분석 결과 저장
   ↓
4. 마크다운 리포트 반환
   {
     analysisMarkdown: "...",
     martSummary: {...},
     analystQuestions: [...]
   }
```

#### 채팅 분석
```
1. 사용자 메시지 전송
   POST /api/workspaces/[id]/agent
   {
     mode: "chat",
     user_message: "...",
     thread_id: "..."
   }
   ↓
2. Brain API 호출
   POST {BRAIN_API_URL}/api/v1/analyze
   ↓
3. LangGraph 실행
   ├─ load_context_and_mart_summary()
   ├─ load_chat_history() (thread_id 기반)
   ├─ build_chat_prompt()
   │  └─ 사용자 메시지 + 컨텍스트
   ├─ run_llm_analysis()
   │  └─ 마크다운 답변 생성
   └─ persist_results()
      └─ 채팅 메시지 저장
   ↓
4. 마크다운 답변 + 차트 데이터 반환
   {
     analysisMarkdown: "...",
     martSummary: {...},
     analystQuestions: [...]
   }
```

**주요 파일:**
- `src/app/api/workspaces/[workspaceId]/agent/route.ts` - 분석 요청
- `python-brain/app/langgraph/graph.py` - LangGraph 엔진
- `python-brain/app/langgraph/nodes.py` - 노드 로직
- `python-brain/app/langgraph/prompts.py` - 프롬프트

---

## 3. 데이터베이스 스키마

### 3.1 주요 테이블

#### projects
- 프로젝트 기본 정보
- `profile` (JSONB): 산업, 목표, DAU 등
- `feature_flags` (JSONB): Semantic Layer 활성화 등

#### workspaces
- 워크스페이스 정보
- `purpose`: 워크스페이스 목적
- `agent_config`: 에이전트 설정

#### metric_definitions
- Semantic Layer 메트릭 정의
- `project_id`: 프로젝트 ID
- `name`, `description`, `formula`: 메트릭 정보
- `is_active`: 활성화 여부

#### mart_events
- 수집된 이벤트 데이터
- `project_id`: 프로젝트 ID
- `event_date`: 이벤트 날짜
- `metric_name`: 메트릭 이름
- `dimension_name`, `dimension_value`: 차원 정보
- `value`: 메트릭 값

#### chat_messages
- 채팅 메시지 히스토리
- `workspace_id`: 워크스페이스 ID
- `thread_id`: 스레드 ID
- `role`: 'user' | 'assistant'
- `content`: 메시지 내용
- `metadata`: 차트 데이터 등 (JSONB)

### 3.2 Row Level Security (RLS)

모든 테이블에 RLS 정책 적용:
- 사용자는 자신이 소유한 프로젝트/워크스페이스만 접근 가능
- `auth.uid()` 기반 필터링

---

## 4. 주요 로직 설계

### 4.1 Semantic Layer

**목적:** 프로젝트별 메트릭 정의를 자동 생성하고 LLM 분석에 활용

**작동 방식:**
1. 프로젝트 생성 시 프로필 기반으로 메트릭 정의 자동 생성
2. 프로필 수정 시 메트릭 정의 동기화
3. LangGraph 분석 시 메트릭 정의를 프롬프트에 포함
4. 5분 TTL 캐싱으로 성능 최적화

**주요 파일:**
- `src/lib/semantic-layer/metrics.ts` - 메트릭 정의 생성/조회
- `src/lib/semantic-layer/cache.ts` - 캐싱 로직
- `python-brain/app/langgraph/prompts.py` - 프롬프트에 메트릭 포함

### 4.2 LangGraph 엔진

**구조:**
```
StateGraph
├─ guard_and_route (라우팅)
│  ├─ mode == "report" → generate_report
│  └─ mode == "chat" → chat_analysis
├─ load_context_and_mart_summary (컨텍스트 로드)
├─ build_system_prompt (프롬프트 생성)
├─ run_llm_analysis (LLM 실행)
└─ persist_results (결과 저장)
```

**주요 노드:**
- `load_context_and_mart_summary`: 프로젝트 프로필, 메트릭 정의, 데이터 로드
- `build_system_prompt`: Semantic Layer 메트릭 포함 프롬프트 생성
- `run_llm_analysis`: OpenAI API 호출
- `persist_results`: 분석 결과 저장

**주요 파일:**
- `python-brain/app/langgraph/graph.py` - 그래프 정의
- `python-brain/app/langgraph/nodes.py` - 노드 로직
- `python-brain/app/langgraph/prompts.py` - 프롬프트

### 4.3 데이터 수집기

#### GA4 Collector
- BigQuery 쿼리 실행
- 이벤트 데이터 변환
- `mart_events` 테이블에 배치 삽입

#### CSV Collector
- CSV 파일 파싱
- 컬럼 매핑 적용
- 날짜 범위 필터링
- `mart_events` 테이블에 배치 삽입

**주요 파일:**
- `python-brain/app/collectors/ga4_collector.py`
- `python-brain/app/collectors/csv_collector.py`

### 4.4 React Query 통합

**목적:** 서버 상태 관리 및 캐싱

**주요 쿼리:**
- `useProjectsQuery`: 프로젝트 목록
- `useWorkspacesQuery`: 워크스페이스 목록
- `useSendChatMessageMutation`: 채팅 메시지 전송
- `useGenerateReportMutation`: 리포트 생성

**주요 파일:**
- `src/lib/react-query/queries.ts` - 쿼리 정의
- `src/lib/react-query/mutations.ts` - 뮤테이션 정의

---

## 5. 보안 및 인증

### 5.1 인증 방식
- **Email OTP**: Supabase `signInWithOtp`
- **Google OAuth**: Supabase `signInWithOAuth`
- **세션 관리**: Supabase 세션 (3분 유효)

### 5.2 API 보안
- **Brain API**: API Key 인증 (`X-API-Key` 헤더)
- **Next.js API Routes**: Supabase 세션 검증 (`getAuthContext`)

### 5.3 데이터 보안
- **RLS**: 모든 테이블에 Row Level Security 적용
- **Audit Logging**: 주요 작업에 대한 감사 로그

---

## 6. 성능 최적화

### 6.1 캐싱 전략
- **Metric Definitions**: 5분 TTL 인메모리 캐시
- **React Query**: 자동 캐싱 및 리프레시
- **Next.js**: 서버 컴포넌트 기본 사용

### 6.2 데이터베이스 최적화
- **인덱스**: `project_id`, `event_date`, `metric_name` 등
- **배치 삽입**: 대량 데이터 수집 시 배치 처리
- **파티셔닝**: `mart_events` 테이블 날짜 기반 파티셔닝 (향후)

### 6.3 API 최적화
- **비동기 처리**: 긴 작업은 비동기로 처리
- **타임아웃 관리**: Brain API 타임아웃 설정
- **에러 핸들링**: 재시도 로직 및 에러 복구

---

## 7. 배포 및 인프라

### 7.1 Frontend (Vercel)
- **자동 배포**: GitHub push 시 자동 배포
- **환경 변수**: Vercel 대시보드에서 관리
- **도메인**: 커스텀 도메인 설정 가능

### 7.2 Brain API (Render / Cloud Run)
- **Docker 배포**: Dockerfile 기반
- **환경 변수**: `.env` 파일 또는 플랫폼 설정
- **오토스케일링**: 트래픽에 따라 자동 스케일링

### 7.3 데이터베이스 (Supabase)
- **관리형 PostgreSQL**: Supabase Cloud
- **백업**: 자동 백업 (일일)
- **마이그레이션**: SQL 마이그레이션 파일 관리

---

## 8. 모니터링 및 로깅

### 8.1 로깅
- **Frontend**: `console.log`, `console.error`
- **Brain API**: Python `logging` 모듈
- **Supabase**: 내장 로깅 시스템

### 8.2 에러 추적
- **Frontend**: 사용자 친화적 에러 메시지
- **Brain API**: 상세한 에러 로그 및 스택 트레이스
- **API Routes**: 에러 응답 형식 통일

---

## 9. 향후 개선 사항

### 9.1 단기 (1-2개월)
- [ ] Redis 캐싱 (멀티 인스턴스 환경)
- [ ] 메트릭 정의 UI (사용자 직접 수정)
- [ ] 실시간 데이터 업데이트 (WebSocket)

### 9.2 중기 (3-6개월)
- [ ] 동적 메트릭 계산 (formula 기반)
- [ ] 데이터 파티셔닝 최적화
- [ ] A/B 테스트 기능

### 9.3 장기 (6개월+)
- [ ] 멀티 테넌트 지원 강화
- [ ] 고급 분석 기능 (예측, 이상 탐지)
- [ ] API Rate Limiting

---

**문서 버전**: 1.0  
**최종 수정일**: 2026-01-26
