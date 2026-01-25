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
    workflow.add_edge("generate", "persist")
    workflow.add_edge("persist", END)
    
    return workflow.compile()

def generate_analysis(state: Dict[str, Any]) -> Dict[str, Any]:
    """LLM을 사용한 분석 생성"""
    if not state.get("martSummary"):
        return {"error": "No mart summary available"}
    
    mart_summary = state["martSummary"]
    conversation_history = state.get("conversationHistory", [])
    
    system_prompt = build_system_prompt(
        language=state["language"],
        purpose=state["workspacePurpose"],
        profile=state["projectProfile"],
        metric_definitions=mart_summary.get("metricDefinitions"),
        mode=state["mode"]
    )
    
    user_prompt = build_user_prompt(
        state["mode"],
        mart_summary,
        state.get("userMessage")
    )
    
    model = ChatOpenAI(
        model_name="gpt-4o",
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        temperature=0.3
    )
    
    # 메시지 구성
    messages = [SystemMessage(content=system_prompt)]
    
    # 채팅 모드일 때 이전 대화 히스토리 추가
    if state["mode"] == "chat" and conversation_history:
        for msg in conversation_history:
            if msg.get("role") == "user":
                messages.append(HumanMessage(content=msg.get("content", "")))
            elif msg.get("role") == "assistant":
                messages.append(AIMessage(content=msg.get("content", "")))
    
    # 현재 사용자 메시지 추가
    messages.append(HumanMessage(content=user_prompt))
    
    response = model.invoke(messages)
    
    raw_content = response.content if isinstance(response.content, str) else \
        "".join(c.text if hasattr(c, "text") else str(c) for c in response.content)
    
    # 리포트 모드: Analyst Questions 섹션에서 질문 파싱
    # 채팅 모드: 답변 끝에 있는 후속 질문 추출
    if state["mode"] == "report":
        questions = parse_analyst_questions(raw_content)
        cleaned_markdown = remove_analyst_questions_section(raw_content)
    else:
        # 채팅 모드: 후속 질문 추출 (답변 끝부분의 질문)
        questions = extract_chat_followup_questions(raw_content)
        cleaned_markdown = raw_content  # 채팅 모드에서는 전체 내용 유지
    
    # LangChain 메시지 객체는 JSON serializable하지 않으므로 반환하지 않음
    # messages 필드는 LangGraph 내부에서만 사용되며, 최종 응답에는 필요 없음
    return {
        "analysisMarkdown": cleaned_markdown,
        "analystQuestions": questions,
    }

async def run_analysis(input: Dict[str, Any]) -> Dict[str, Any]:
    """분석 실행 (Non-streaming)"""
    graph = create_analysis_graph()
    
    initial_state: GraphState = {
        **input,
        "dataAccessed": [],
        "messages": []
    }
    
    result = await graph.ainvoke(initial_state)
    
    # LangChain 메시지 객체는 JSON serializable하지 않으므로 제거
    # 필요한 정보는 이미 analysisMarkdown과 analystQuestions에 포함됨
    if "messages" in result:
        del result["messages"]
    
    return result

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
