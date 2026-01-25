# 에이전트 채팅 문제 수정 및 개선 사항

## 🔍 발견된 문제

### 1. **에러 처리 로직 오류** ✅ 수정 완료
- **문제**: `agent/route.ts`에서 `result.error`를 체크하지만, `callBrainAnalyze`는 에러 시 exception을 throw하므로 `result.error`는 항상 undefined
- **수정**: `result.error` 체크 제거, exception 기반 에러 처리로 변경

### 2. **대화 컨텍스트 누락** ⚠️ Python Brain API 수정 필요
- **문제**: 채팅 모드에서 이전 대화 메시지가 LLM에 전달되지 않음
- **현재**: 매번 새로운 SystemMessage와 HumanMessage만 전송
- **영향**: 대화 흐름이 끊기고, 이전 대화 내용을 참조할 수 없음

### 3. **data_accessed 필드 누락** ⚠️ Python Brain API 수정 필요
- **문제**: Python Brain API 응답에 `data_accessed` 필드가 없음
- **영향**: 프론트엔드에서 데이터 접근 추적 불가

---

## ✅ 완료된 수정 사항

### Next.js API 라우트 개선 (`src/app/api/workspaces/[workspaceId]/agent/route.ts`)

1. **에러 처리 개선**
   - `result.error` 체크 제거 (항상 undefined였음)
   - Exception 기반 에러 처리로 변경
   - 사용자 친화적 에러 메시지 제공
   - 상세한 로깅 추가

2. **응답 구조 개선**
   - `dataAccessed` 기본값 설정 (`[]`)
   - `analysisMarkdown`, `analystQuestions` 기본값 설정

---

## 🔧 Python Brain API 개선 필요 사항

### 1. 대화 컨텍스트 로드 (채팅 모드)

**파일**: `python-brain/app/langgraph/nodes.py`

**현재 코드** (`load_context_and_mart_summary`):
```python
def load_context_and_mart_summary(state: AnalysisState) -> Dict[str, Any]:
    """컨텍스트 및 Mart 요약 로드"""
    # ... mart summary 로드만 수행
```

**개선 필요**:
```python
def load_context_and_mart_summary(state: AnalysisState) -> Dict[str, Any]:
    """컨텍스트 및 Mart 요약 로드"""
    supabase = get_supabase_client()
    data_accessed = []
    
    # 채팅 모드일 때 이전 대화 메시지 로드
    conversation_history = []
    if state["mode"] == "chat" and state.get("threadId"):
        # 최근 10개 메시지 로드 (최신순)
        messages_result = supabase.table("chat_messages") \
            .select("role, content, created_at") \
            .eq("workspace_id", state["workspaceId"]) \
            .eq("thread_id", state["threadId"]) \
            .order("created_at", desc=False) \
            .limit(10) \
            .execute()
        
        conversation_history = messages_result.data or []
        data_accessed.append("chat_messages")
    
    # ... 기존 mart summary 로드 코드 ...
    
    return {
        "martSummary": mart_summary,
        "conversationHistory": conversation_history,  # 추가
        "dataAccessed": data_accessed
    }
```

### 2. 대화 컨텍스트를 LLM에 전달

**파일**: `python-brain/app/langgraph/graph.py`

**현재 코드** (`generate_analysis`):
```python
messages = [
    SystemMessage(content=system_prompt),
    HumanMessage(content=user_prompt)
]
```

**개선 필요**:
```python
def generate_analysis(state: Dict[str, Any]) -> Dict[str, Any]:
    """LLM을 사용한 분석 생성"""
    if not state.get("martSummary"):
        return {"error": "No mart summary available"}
    
    mart_summary = state["martSummary"]
    conversation_history = state.get("conversationHistory", [])
    
    system_prompt = build_system_prompt(...)
    user_prompt = build_user_prompt(...)
    
    # 메시지 구성
    messages = [SystemMessage(content=system_prompt)]
    
    # 채팅 모드일 때 이전 대화 히스토리 추가
    if state["mode"] == "chat" and conversation_history:
        from langchain_core.messages import HumanMessage, AIMessage
        
        for msg in conversation_history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))
    
    # 현재 사용자 메시지 추가
    messages.append(HumanMessage(content=user_prompt))
    
    # ... 기존 LLM 호출 코드 ...
```

### 3. data_accessed 필드 반환

**파일**: `python-brain/app/main.py`

**현재 코드**:
```python
return AnalyzeResponse(
    analysis_markdown=result.get("analysisMarkdown", ""),
    analyst_questions=result.get("analystQuestions", []),
    mart_summary=result.get("martSummary"),
    thread_id=result.get("threadId", request.thread_id)
)
```

**개선 필요**:
```python
# AnalyzeResponse 모델에 data_accessed 필드 추가
class AnalyzeResponse(BaseModel):
    analysis_markdown: str
    analyst_questions: list
    mart_summary: Optional[dict] = None
    thread_id: str
    data_accessed: Optional[list] = None  # 추가

# 응답에 포함
return AnalyzeResponse(
    analysis_markdown=result.get("analysisMarkdown", ""),
    analyst_questions=result.get("analystQuestions", []),
    mart_summary=result.get("martSummary"),
    thread_id=result.get("threadId", request.thread_id),
    data_accessed=result.get("dataAccessed", [])  # 추가
)
```

---

## 📋 AI 에이전트 베스트 프랙티스 적용

### 1. **Thread 기반 메모리 관리** ✅ 이미 구현됨
- `threadId`를 통한 대화 세션 관리
- `chat_messages` 테이블에 대화 저장

### 2. **대화 컨텍스트 유지** ⚠️ 개선 필요
- 이전 대화 메시지를 LLM에 전달하여 연속성 유지
- 최근 N개 메시지만 로드하여 토큰 사용량 최적화

### 3. **에러 처리 및 사용자 경험** ✅ 개선 완료
- 사용자 친화적 에러 메시지
- 상세한 로깅으로 디버깅 용이

### 4. **데이터 접근 추적** ⚠️ 개선 필요
- `data_accessed` 필드로 어떤 데이터를 사용했는지 추적
- 감사 로그 및 투명성 향상

---

## 🎯 고객 요구사항 반영

> "다양한 데이터를 간단하게 연동하고 자동으로 정리해준 상태에서 데이터 분석 AI 에이전트와 얘기하고 싶어"

### 현재 구현 상태
- ✅ 다양한 데이터 연동: GA4, CSV 지원
- ✅ 자동 정리: Mart 테이블로 자동 집계
- ✅ AI 에이전트 대화: 채팅 모드 지원

### 개선 필요 사항
- ⚠️ 대화 컨텍스트 유지: 이전 대화 참조 가능하도록
- ⚠️ 자연스러운 대화: 연속적인 대화 흐름

---

## 🚀 다음 단계

1. **즉시 적용 가능** (Next.js): ✅ 완료
   - 에러 처리 개선
   - 응답 구조 개선

2. **Python Brain API 수정 필요**:
   - 대화 컨텍스트 로드 기능 추가
   - LLM에 이전 대화 전달
   - `data_accessed` 필드 반환

3. **테스트**:
   - 채팅 모드에서 이전 대화 참조 테스트
   - 에러 시나리오 테스트
   - 성능 테스트 (대화 히스토리 로드)

---

## 📝 참고 자료

- [LangGraph Memory Best Practices](https://docs.langchain.com/oss/python/langgraph/memory)
- [AI Agent Conversation Context](https://docs.databricks.com/aws/en/generative-ai/agent-framework/stateful-agents)
- [OpenAI Agents SDK Context Management](https://cookbook.openai.com/examples/agents_sdk/context_personalization)
