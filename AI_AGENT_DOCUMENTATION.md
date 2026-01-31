# AI 에이전트 및 Brain API 문서

**마지막 업데이트**: 2026-01-31

## 목차
1. [개요](#개요)
2. [아키텍처](#아키텍처)
3. [API 엔드포인트](#api-엔드포인트)
4. [LangGraph 워크플로우](#langgraph-워크플로우)
5. [프롬프트 시스템](#프롬프트-시스템)
6. [타입 정의](#타입-정의)
7. [환경 변수](#환경-변수)

---

## 개요

Vibe Semantic의 AI 에이전트 시스템은 다음 컴포넌트로 구성됩니다:

| 컴포넌트 | 설명 | 기술 스택 |
|----------|------|-----------|
| **Python Brain API** | AI 엔진 백엔드 서버 | FastAPI, LangGraph, LangChain |
| **Next.js Agent API** | 프론트엔드 ↔ Brain 중계 | Next.js API Routes |
| **Brain API Client** | Brain 서버 호출 유틸리티 | TypeScript |

### 주요 기능
- **리포트 생성** (`mode: "report"`): 자동 분석 리포트
- **채팅 분석** (`mode: "chat"`): 대화형 데이터 분석
- **CSV 프로파일링**: 스키마 자동 감지
- **통계적 분석**: 상관관계, 인과관계 힌트

---

## 아키텍처

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Next.js App    │────▶│  Agent API       │────▶│  Python Brain   │
│  (Frontend)     │     │  /api/workspaces │     │  FastAPI Server │
└─────────────────┘     │  /[wid]/agent    │     └─────────────────┘
                        └──────────────────┘              │
                                                          ▼
                                                  ┌─────────────────┐
                                                  │  LangGraph      │
                                                  │  Workflow       │
                                                  └─────────────────┘
                                                          │
                        ┌─────────────────────────────────┼─────────────────────────────────┐
                        ▼                                 ▼                                 ▼
                ┌───────────────┐              ┌───────────────┐              ┌───────────────┐
                │  guard_and    │              │  load_context │              │  generate     │
                │  _route       │              │  _mart_summary│              │  _analysis    │
                └───────────────┘              └───────────────┘              └───────────────┘
                                                                                      │
                                                                                      ▼
                                                                              ┌───────────────┐
                                                                              │  persist      │
                                                                              │  _results     │
                                                                              └───────────────┘
```

---

## API 엔드포인트

### 1. Next.js Agent API

**경로**: `POST /api/workspaces/[workspaceId]/agent`

**요청 (Request)**:
```typescript
{
  mode: 'report' | 'chat',      // 분석 모드
  range: '7d' | '30d',          // 분석 기간
  userMessage?: string,          // 채팅 모드 필수
  threadId?: string,             // 대화 스레드 ID
  language?: 'ko' | 'en'         // 응답 언어
}
```

**응답 (Response)**:
```typescript
{
  analysisMarkdown: string,      // 분석 결과 (마크다운)
  analystQuestions: AnalystQuestion[], // 후속 질문 (최소 3개)
  martSummary?: MartSummary,     // 데이터 요약 (그래프용)
  threadId: string,              // 대화 스레드 ID
  dataAccessed?: string[]        // 접근한 데이터 목록
}
```

---

### 2. Python Brain API

**Base URL**: `BRAIN_API_URL` 환경 변수

#### POST /api/v1/analyze

**요청 (Request)**:
```python
{
    "workspace_id": str,
    "project_id": str,
    "mode": "report" | "chat",
    "range": "7d" | "30d",
    "user_message": Optional[str],  # 채팅 모드 필수
    "thread_id": str,
    "language": "ko" | "en",
    "project_profile": dict,        # 서비스 프로필
    "workspace_purpose": str,       # product | marketing | biz | sales
    "agent_config": dict,
    "user_id": str,
    "role": str                     # owner | admin | viewer
}
```

**응답 (Response)**:
```python
{
    "analysis_markdown": str,       # 분석 결과 마크다운
    "analyst_questions": list,      # 후속 질문 목록
    "mart_summary": Optional[dict], # 데이터 요약
    "thread_id": str,
    "data_accessed": Optional[list]
}
```

#### POST /api/v1/profiler/csv

CSV 스키마 프로파일링 (Pandas 기반)

#### POST /api/v1/collect/csv

CSV 데이터 수집 및 변환

---

### 3. Report·Chat 자산 API (Epic 4.6)

**리포트 목록**: `GET /api/workspaces/[workspaceId]/report?list=1&limit=10`  
- 쿼리: `list=1`, `range`(선택), `limit`(기본 10, 최대 30)  
- 응답: `{ reports: [{ id, range, created_at, generated_at }] }` — workspace 내 저장된 리포트 자산 목록.

**채팅 스레드 목록**: `GET /api/workspaces/[workspaceId]/threads?limit=20`  
- 응답: `{ threads: [{ thread_id, last_message_at, message_count, preview? }] }` — workspace 내 대화 스레드 목록 (과거 대화 "내 데이터" 노출용).

**persist_results 저장 내용**  
- Report: `reports` 행에 `metadata`로 `range`, `workspace_id`, `generated_at` 포함.  
- Chat: `chat_messages`에 user/assistant 메시지 저장, `thread_id` 기준.

---

## LangGraph 워크플로우

### 그래프 구조 (Epic 4.4)

```python
# 실행 순서: guard → planner → tool → explainer → persist → END
workflow.add_node("guard", guard_and_route)
workflow.add_node("planner", planner_node)       # 의도·필요 데이터·모드 → plan
workflow.add_node("tool", tool_node)             # plan 기반 Summary/Mart/Graph 조회
workflow.add_node("explainer", explainer_node)   # Report 정형 / Chat 추론+반문
workflow.add_node("persist", persist_results)
```

### 노드 설명

| 노드 | 역할 |
|------|------|
| `guard_and_route` | 사용자 권한 및 프로젝트 접근 권한 확인 |
| `planner_node` | 의도·need_ga4/need_csv/…·date_range → plan (계산/집계 없음) |
| `tool_node` | plan에 따라 Summary(Mart+Semantic Graph) 조회, conversation_history 로드. LLM 없음. |
| `explainer_node` | martSummary+히스토리 → analysisMarkdown, analystQuestions. Report: 정형 리포트. Chat: 짧은 추론+반문 2~3개. |
| `persist_results` | chat_messages, reports(metadata에 range/workspace_id/generated_at) 저장, audit_log 기록 |

### GraphState 구조

```python
class GraphState(TypedDict):
    userId: str
    projectId: str
    workspaceId: str
    role: str                        # owner | admin | viewer
    language: str                    # ko | en
    projectProfile: dict             # 서비스 정보
    workspacePurpose: str            # product | marketing | biz | sales
    agentConfig: dict
    mode: str                        # report | chat
    range: str                       # 7d | 30d
    userMessage: Optional[str]       # 채팅 모드 필수
    threadId: str
    martSummary: Optional[dict]      # 데이터 요약
    conversationHistory: Optional[list]  # 이전 대화
    analysisMarkdown: Optional[str]  # 분석 결과
    analystQuestions: Optional[list] # 후속 질문
    dataAccessed: list               # 접근한 데이터
    error: Optional[str]
    messages: list
```

---

## 프롬프트 시스템

### 시스템 프롬프트 구조

```python
def build_system_prompt(
    language: "ko" | "en",
    purpose: WorkspacePurpose,
    profile: ProjectProfile,
    metric_definitions: Optional[list],
    mode: "report" | "chat"
) -> str
```

### 목적별 분석 초점 (PURPOSE_FOCUS)

| 목적 | 분석 초점 |
|------|-----------|
| `product` | 사용자 행동 패턴, 제품 사용성, 사용자 여정, 이탈 포인트 |
| `marketing` | 채널별 유입 효율성, ROI, 캠페인 성과, 예산 배분 |
| `biz` | 비즈니스 KPI, 매출 연관성, 목표 달성률, 경영진 보고 |
| `sales` | 리드 생성, 고객 획득, 영업 파이프라인, 고가치 세그먼트 |

---

### 리포트 모드 프롬프트

```
## 응답 포맷 (리포트 모드 - 자연스러운 문단 형식)

### 리포트 구조
1. **요약**: 전체 기간의 핵심 지표 요약 (2-3문장)
2. **주요 발견사항**: 중요한 인사이트 3-5개
3. **상세 분석**: 
   - KPI 트렌드 분석
   - 채널별 성과 분석
   - 페이지별 성과 분석
   - CSV 메트릭 분석
   - 통합 인사이트 (GA4 + CSV)
4. **통계적 분석**: 상관관계, 인과관계 힌트
5. **제안**: 실행 가능한 액션 아이템 3-5개

### 작성 규칙
- 자연스러운 문단 형식 + 마크다운 테이블
- 마크다운 헤더(##)와 굵은 글씨(**) 활용
- 구체적인 수치 인용 (예: "**총 세션 1,234회**")
- 데이터 비교 시 반드시 마크다운 테이블 사용
- 통계적 분석 결과 포함
- 매번 다른 관점과 인사이트 제공

### Analyst Questions 생성 (최소 3개 필수)
- 통계적 인사이트 기반 질문
- 트렌드/추세 관련 질문
- 채널/페이지 성과 관련 질문
- 개선/최적화 관련 질문
```

---

### 채팅 모드 프롬프트

```
## 응답 포맷 (채팅 모드 - 대화형)

### 질문 이해 및 데이터 추출 프로세스
1. **질문 분석**: 키워드, 질문 유형, 시간 범위, 세그먼트 파악
2. **관련 데이터 추출**: 질문과 직접 관련된 데이터만 선별
3. **데이터 기반 답변**: 구체적 수치 인용, 추세/패턴 설명
4. **인사이트 질문 생성**: 다음 단계 분석 질문

### 답변 구조 (마크다운 형식 필수)
- **핵심 답변**: 2-3문장의 직접적인 답변
- **주요 데이터**: 마크다운 테이블로 수치 제시
- **데이터 시각화**: 트렌드/비교 설명
- **인사이트**: 패턴이나 주목할 점
- **제안**: 실행 가능한 액션

### 질문 유형별 접근법
- **비교 질문** ("A vs B"): 테이블로 비교
- **트렌드 질문** ("변화", "증가"): dailyTrend 테이블 제시
- **원인 분석** ("왜", "이유"): 데이터 기반 가설
- **개선 제안** ("어떻게"): 액션 아이템 테이블
- **수치 조회** ("얼마"): 테이블로 정확한 수치 제공

### 금지 사항
- 메타 구조 설명 금지
- 리포트 전체 내용 반복 금지
- 관련 없는 데이터 나열 금지
- 300단어 이상 긴 답변 금지
```

---

### 사용자 프롬프트 구조

#### 리포트 모드
```
## 분석 데이터 (2026-01-20 ~ 2026-01-27, 7일)
데이터 소스: GA4 + CSV

## 통계적 분석 결과 (있는 경우)
### 주요 지표 상관관계
- 세션 ↔ 전환: 강한 상관관계 (r=0.85, 유의함)

### 이벤트-KPI 관계
- button_click ↔ 전환율: 중간 상관관계 (r=0.65, 유의함)

**작성 지침:**
1. 자연스러운 문단 형식
2. 중요한 수치는 **굵은 글씨**
3. 마크다운 테이블 사용
4. 통계적 분석 결과 활용

**Analyst Questions 섹션 (반드시 포함):**
## Analyst Questions
1. [통계적 분석 기반 질문]
2. [트렌드 관련 질문]
3. [채널/페이지 성과 관련 질문]
```

#### 채팅 모드
```
## 분석 데이터 (2026-01-20 ~ 2026-01-27)
데이터 소스: GA4 + CSV

## 사용자 질문
**"신규 사용자 유입이 어떻게 되나요?"**

**핵심 규칙:**
1. 질문과 관련된 데이터만 사용
2. 통계적 분석 결과 활용
3. 마크다운 테이블 사용
4. 중요한 수치는 **굵은 글씨**
```

---

## 타입 정의

### MartSummary

```typescript
interface MartSummary {
  period: {
    start: string,      // "2026-01-20"
    end: string,        // "2026-01-27"
    days: number        // 7
  },
  kpis: {
    totalSessions: number,
    totalUsers: number,
    newUsers: number,
    avgSessionDuration: number,
    bounceRate: number,
    conversionRate: number
  },
  topChannels: Array<{
    name: string,
    sessions: number,
    users: number,
    conversionRate: number
  }>,
  topPages: Array<{
    path: string,
    title: string,
    views: number,
    engagementRate: number
  }>,
  dailyTrend: Array<{
    date: string,
    sessions: number,
    users: number
  }>,
  csvMetrics?: Record<string, number>,
  integratedTrend?: Array<{
    date: string,
    ga4Sessions: number,
    csvMetrics: Record<string, number>
  }>,
  dataSources: {
    ga4: { available: boolean, recordCount?: number },
    csv: { available: boolean, metrics?: string[], recordCount?: number },
    integrated: boolean
  },
  metricDefinitions?: Array<{
    name: string,
    display_name: string,
    description: string,
    category: string,
    priority: number,
    is_active: boolean
  }>,
  statisticalAnalysis?: {
    summary: string,
    metric_correlations: Array<{
      metric1: string,
      metric2: string,
      correlation: {
        coefficient: number,
        strength: string,
        significant: boolean
      }
    }>,
    event_kpi_relationships: Array<{
      event_name: string,
      kpi_metric: string,
      correlation: {
        coefficient: number,
        strength: string,
        significant: boolean
      }
    }>,
    causality_hints: Array<{
      metric1: string,
      metric2: string
    }>
  }
}
```

### AnalystQuestion

```typescript
interface AnalystQuestion {
  id: string,           // "q1"
  question: string,     // "채널별 전환율을 비교해볼까요?"
  context: string,      // "채널 분석"
  quickReplies: Array<{
    label: string,      // "채널 상세 분석"
    nextParams: {
      range?: "7d" | "30d",
      focus?: "channel" | "page"
    }
  }>
}
```

### WorkspacePurpose

```typescript
type WorkspacePurpose = "product" | "marketing" | "biz" | "sales"
```

### ProjectProfile

```typescript
interface ProjectProfile {
  serviceName?: string,
  serviceDescription?: string,
  targetAudience?: string,
  industry?: string,
  goals?: string[],
  kpis?: string[]
}
```

---

## 환경 변수

### Next.js (.env.local)

```bash
# Brain API 연결
BRAIN_API_URL=https://your-brain-api.onrender.com
BRAIN_API_KEY=your-secret-api-key
```

### Python Brain API

```bash
# API 인증
API_KEY=your-secret-api-key

# OpenAI
OPENAI_API_KEY=sk-...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 배포

### Python Brain API

- **권장**: Render (무료 플랜 지원)
- **대안**: GCP Cloud Run, AWS App Runner
- **타임아웃**: 최대 5분 (LLM 응답 대기)
- **메모리**: 최소 512MB 권장

### Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 참고

- [LangGraph 공식 문서](https://langchain-ai.github.io/langgraph/)
- [LangChain 공식 문서](https://python.langchain.com/)
- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
