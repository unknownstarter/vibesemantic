"""
LangGraph 타입 정의
TypeScript에서 Python으로 포팅
"""

from typing import TypedDict, Optional, Literal
from pydantic import BaseModel

# Report Range
ReportRange = Literal["7d", "30d"]

# Member Role
MemberRole = Literal["owner", "admin", "viewer"]

# Workspace Purpose
WorkspacePurpose = Literal["product", "marketing", "biz", "sales"]

# Agent Config
class AgentConfig(TypedDict, total=False):
    language: Literal["ko", "en"]
    temperature: float
    model: str

# Project Profile
class ProjectProfile(TypedDict, total=False):
    serviceName: Optional[str]
    serviceDescription: Optional[str]
    targetAudience: Optional[str]
    industry: Optional[str]
    goals: Optional[list[str]]
    kpis: Optional[list[str]]

# Analyst Question
class AnalystQuestion(BaseModel):
    question: str
    quickReplies: list[dict]
    nextParams: dict

# Mart Summary
class MartSummary(TypedDict, total=False):
    period: dict
    kpis: dict
    topChannels: list[dict]
    topPages: list[dict]
    dailyTrend: list[dict]
    csvMetrics: Optional[dict]
    derivedMetrics: Optional[list[dict]]  # e.g. [{"name": "전환율 (Leads/Sessions)", "value": 0.1, "formula": "Leads/Sessions"}]
    integratedTrend: Optional[list[dict]]
    dataSources: dict
    metricDefinitions: Optional[list[dict]]
    statisticalAnalysis: Optional[dict]
    semanticGraph: Optional[dict]  # Epic 3.3: nodes + edges for Explainer metadata

# Plan (Epic 4.1: Planner 노드 출력)
class Plan(TypedDict, total=False):
    intent: str  # e.g. "full_report", "channel_breakdown", "csv_revenue"
    need_ga4: bool
    need_csv: bool
    need_channels: bool
    need_pages: bool
    need_events: bool
    date_range: str  # "7d" | "30d" from state.range
    metrics_requested: Optional[list[str]]
    dimensions_requested: Optional[list[str]]


# Analysis State
class AnalysisState(TypedDict, total=False):
    userId: str
    projectId: str
    workspaceId: str
    role: MemberRole
    language: Literal["ko", "en"]
    projectProfile: ProjectProfile
    workspacePurpose: WorkspacePurpose
    agentConfig: AgentConfig
    mode: Literal["report", "chat"]
    range: ReportRange
    userMessage: Optional[str]
    threadId: str
    plan: Optional[Plan]  # Epic 4.1: Planner 노드 출력
    chartContext: Optional[dict]  # Epic 5.2: 차트→채팅 (range, metricNames, chartType, label)
    martSummary: Optional[MartSummary]
    conversationHistory: Optional[list[dict]]  # 추가: 채팅 히스토리
    analysisMarkdown: Optional[str]
    analystQuestions: Optional[list[AnalystQuestion]]
    dataAccessed: list[str]
    error: Optional[str]
    messages: list[dict]
