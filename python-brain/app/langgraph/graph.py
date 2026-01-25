"""
LangGraph 그래프 생성 및 실행
TypeScript에서 Python으로 포팅
"""

from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END, START
from langgraph.graph.message import add_messages
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, BaseMessage
from typing import Dict, Any, Optional, AsyncIterator, Annotated
from app.langgraph.types import AnalysisState
from app.langgraph.nodes import (
    guard_and_route,
    load_context_and_mart_summary,
    parse_analyst_questions,
    remove_analyst_questions_section,
    extract_chat_followup_questions,
    persist_results
)
from app.langgraph.prompts import build_system_prompt, build_user_prompt
import os
import json

# State Schema 정의
from typing_extensions import TypedDict

class GraphState(TypedDict):
    userId: str
    projectId: str
    workspaceId: str
    role: str
    language: str
    projectProfile: dict
    workspacePurpose: str
    agentConfig: dict
    mode: str
    range: str
    userMessage: Optional[str]
    threadId: str
    martSummary: Optional[dict]
    conversationHistory: Optional[list]  # 추가
    analysisMarkdown: Optional[str]
    analystQuestions: Optional[list]
    dataAccessed: Annotated[list, add_messages]
    error: Optional[str]
    messages: Annotated[list, add_messages]

def create_analysis_graph():
    """LangGraph 그래프 생성"""
    model = ChatOpenAI(
        model_name="gpt-4o",
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        temperature=0.3,
        streaming=True
    )
    
    # State Graph 생성
    workflow = StateGraph(GraphState)
    
    # Node 추가
    workflow.add_node("guard", guard_and_route)
    workflow.add_node("load_context", load_context_and_mart_summary)
    workflow.add_node("generate", generate_analysis)
    workflow.add_node("persist", persist_results)
    
    # Edges
    workflow.set_entry_point("guard")
    workflow.add_conditional_edges(
        "guard",
        lambda state: END if state.get("error") else "load_context"
    )
    workflow.add_conditional_edges(
        "load_context",
        lambda state: END if state.get("error") else "generate"
    )
    workflow.add_conditional_edges(
        "generate",
        lambda state: END if state.get("error") else "persist"
    )
    workflow.add_edge("persist", END)
    
    return workflow.compile()

def generate_analysis(state: Dict[str, Any]) -> Dict[str, Any]:
    """LLM을 사용한 분석 생성"""
    try:
        if not state.get("martSummary"):
            return {"error": "No mart summary available"}
        
        mart_summary = state["martSummary"]
        conversation_history = state.get("conversationHistory") or []
        mode = state.get("mode", "report")
        user_message = state.get("userMessage")
        
        # 채팅 모드에서 userMessage 필수 체크
        if mode == "chat" and not user_message:
            return {"error": "User message is required for chat mode"}
        
        # OpenAI API 키 확인
        openai_key = os.getenv("OPENAI_API_KEY")
        if not openai_key:
            return {"error": "OPENAI_API_KEY not configured"}
        
        system_prompt = build_system_prompt(
            language=state.get("language", "ko"),
            purpose=state.get("workspacePurpose", "product"),
            profile=state.get("projectProfile", {}),
            metric_definitions=mart_summary.get("metricDefinitions"),
            mode=mode
        )
        
        user_prompt = build_user_prompt(
            mode,
            mart_summary,
            user_message
        )
        
        model = ChatOpenAI(
            model_name="gpt-4o",
            openai_api_key=openai_key,
            temperature=0.3
        )
        
        # 메시지 구성
        messages = [SystemMessage(content=system_prompt)]
        
        # 채팅 모드일 때 이전 대화 히스토리 추가
        if mode == "chat" and conversation_history:
            for msg in conversation_history:
                if not isinstance(msg, dict):
                    continue
                role = msg.get("role")
                content = msg.get("content", "")
                if not content:
                    continue
                    
                if role == "user":
                    messages.append(HumanMessage(content=content))
                elif role == "assistant":
                    messages.append(AIMessage(content=content))
        
        # 현재 사용자 메시지 추가
        messages.append(HumanMessage(content=user_prompt))
        
        # LLM 호출
        response = model.invoke(messages)
        
        raw_content = response.content if isinstance(response.content, str) else \
            "".join(c.text if hasattr(c, "text") else str(c) for c in response.content)
        
        if not raw_content or len(raw_content.strip()) == 0:
            return {"error": "Empty response from LLM"}
        
        # 리포트 모드: Analyst Questions 섹션에서 질문 파싱
        # 채팅 모드: 답변 끝에 있는 후속 질문 추출
        try:
            if mode == "report":
                questions = parse_analyst_questions(raw_content)
                cleaned_markdown = remove_analyst_questions_section(raw_content)
            else:
                # 채팅 모드: 후속 질문 추출 (답변 끝부분의 질문)
                questions = extract_chat_followup_questions(raw_content)
                cleaned_markdown = raw_content  # 채팅 모드에서는 전체 내용 유지
        except Exception:
            questions = []
            cleaned_markdown = raw_content
        
        return {
            "analysisMarkdown": cleaned_markdown or "",
            "analystQuestions": questions or [],
        }
    except Exception as e:
        import traceback
        error_msg = f"Error in generate_analysis: {str(e)}"
        # traceback은 너무 길 수 있으므로 메시지만
        return {"error": error_msg[:500]}

async def run_analysis(input: Dict[str, Any]) -> Dict[str, Any]:
    """분석 실행 (Non-streaming)"""
    try:
        graph = create_analysis_graph()
        
        initial_state: GraphState = {
            **input,
            "dataAccessed": [],
            "messages": []
        }
        
        result = await graph.ainvoke(initial_state)
        
        # 에러 체크
        if result.get("error"):
            return result
        
        # LangChain 메시지 객체는 JSON serializable하지 않으므로 제거
        if "messages" in result:
            del result["messages"]
        
        # 필수 필드 검증
        if not result.get("analysisMarkdown") and input.get("mode") == "chat":
            return {"error": "Failed to generate analysis response"}
        
        return result
    except Exception as e:
        return {"error": str(e)}

async def run_analysis_stream(input: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
    """분석 실행 (Streaming)"""
    graph = create_analysis_graph()
    
    initial_state: GraphState = {
        **input,
        "dataAccessed": [],
        "messages": []
    }
    
    async for state in graph.astream(initial_state):
        yield state
