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
    integratedTrend: Optional[list[dict]]
    dataSources: dict
    metricDefinitions: Optional[list[dict]]

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
    martSummary: Optional[MartSummary]
    conversationHistory: Optional[list[dict]]  # 추가: 채팅 히스토리
    analysisMarkdown: Optional[str]
    analystQuestions: Optional[list[AnalystQuestion]]
    dataAccessed: list[str]
    error: Optional[str]
    messages: list[dict]
