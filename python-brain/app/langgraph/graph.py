"""
LangGraph 그래프 생성 및 실행
TypeScript에서 Python으로 포팅
"""

from langgraph.graph import StateGraph, END, START
from langgraph.graph.message import add_messages
from typing import Dict, Any, Optional, AsyncIterator, Annotated
from app.langgraph.nodes import (
    guard_and_route,
    planner_node,
    tool_node,
    explainer_node,
    persist_results,
)
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
    plan: Optional[dict]  # Epic 4.1: Planner 출력
    chartContext: Optional[dict]  # Epic 5.2: 차트→채팅
    martSummary: Optional[dict]
    conversationHistory: Optional[list]
    analysisMarkdown: Optional[str]
    analystQuestions: Optional[list]
    dataAccessed: Annotated[list, add_messages]
    error: Optional[str]
    messages: Annotated[list, add_messages]

def create_analysis_graph():
    """LangGraph 그래프: guard → planner → tool → explainer → persist (Epic 4.4)."""
    workflow = StateGraph(GraphState)
    workflow.add_node("guard", guard_and_route)
    workflow.add_node("planner", planner_node)
    workflow.add_node("tool", tool_node)
    workflow.add_node("explainer", explainer_node)
    workflow.add_node("persist", persist_results)

    workflow.set_entry_point("guard")
    workflow.add_conditional_edges("guard", _route_after_guard)
    workflow.add_conditional_edges("planner", _route_after_planner)
    workflow.add_conditional_edges("tool", _route_after_tool)
    workflow.add_conditional_edges("explainer", _route_after_explainer)
    workflow.add_edge("persist", END)
    return workflow.compile()


def _route_after_guard(state: Dict[str, Any]) -> str:
    return END if state.get("error") else "planner"


def _route_after_planner(state: Dict[str, Any]) -> str:
    return END if state.get("error") else "tool"


def _route_after_tool(state: Dict[str, Any]) -> str:
    return END if state.get("error") else "explainer"


def _route_after_explainer(state: Dict[str, Any]) -> str:
    return END if state.get("error") else "persist"

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
