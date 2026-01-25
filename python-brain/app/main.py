"""
Python Brain API - FastAPI 서버
LangGraph 엔진, 데이터 수집기, CSV 프로파일러 제공
"""

from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import asyncio

app = FastAPI(title="Vibe Semantic Brain API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인만 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Key 인증
async def verify_api_key(x_api_key: Optional[str] = Header(None)):
    expected_key = os.getenv("API_KEY")
    if not expected_key:
        raise HTTPException(status_code=500, detail="API key not configured")
    if x_api_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key

# Request/Response Models
class AnalyzeRequest(BaseModel):
    workspace_id: str
    project_id: str
    mode: str  # "report" | "chat"
    range: str  # "7d" | "30d"
    user_message: Optional[str] = None
    thread_id: str
    language: str = "ko"  # "ko" | "en"
    project_profile: dict
    workspace_purpose: str
    agent_config: dict
    user_id: str
    role: str

class AnalyzeResponse(BaseModel):
    analysis_markdown: str
    analyst_questions: list
    mart_summary: Optional[dict] = None
    thread_id: str
    data_accessed: Optional[list] = None

class GA4CollectRequest(BaseModel):
    project_id: str
    range: str  # "7d" | "30d"

class CSVCollectRequest(BaseModel):
    project_id: str
    dataset_id: str
    mapping: dict
    date_range: dict

class CSVProfilerRequest(BaseModel):
    headers: list[str]
    sample_rows: list[list[str]]
    language: str = "ko"
    project_profile: Optional[dict] = None

# API 엔드포인트
@app.post("/api/v1/analyze", response_model=AnalyzeResponse)
async def analyze(
    request: AnalyzeRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    LangGraph 엔진 실행
    리포트 생성 또는 채팅 분석
    """
    from app.langgraph.graph import run_analysis
    
    try:
        if request.mode == "chat" and not request.user_message:
            raise HTTPException(status_code=400, detail="user_message is required for chat mode")
        
        result = await run_analysis({
            "userId": request.user_id,
            "projectId": request.project_id,
            "workspaceId": request.workspace_id,
            "role": request.role,
            "language": request.language,
            "projectProfile": request.project_profile or {},
            "workspacePurpose": request.workspace_purpose,
            "agentConfig": request.agent_config or {},
            "mode": request.mode,
            "range": request.range,
            "userMessage": request.user_message,
            "threadId": request.thread_id,
        })
        
        if result.get("error"):
            raise HTTPException(status_code=400, detail=result["error"])
        
        if "messages" in result:
            result = {k: v for k, v in result.items() if k != "messages"}
        
        analysis_markdown = result.get("analysisMarkdown", "")
        if not analysis_markdown and request.mode == "chat":
            analysis_markdown = "죄송합니다. 답변을 생성하는 중 오류가 발생했습니다."
        
        return AnalyzeResponse(
            analysis_markdown=analysis_markdown,
            analyst_questions=result.get("analystQuestions", []) or [],
            mart_summary=result.get("martSummary"),
            thread_id=result.get("threadId", request.thread_id),
            data_accessed=result.get("dataAccessed", []) or []
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/collect/ga4")
async def collect_ga4(
    request: GA4CollectRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    GA4 데이터 수집
    """
    # TODO: GA4 수집기 포팅
    raise HTTPException(status_code=501, detail="Not implemented yet")

@app.post("/api/v1/collect/csv")
async def collect_csv(
    request: CSVCollectRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    CSV 데이터 수집
    """
    # TODO: CSV 수집기 포팅
    raise HTTPException(status_code=501, detail="Not implemented yet")

@app.post("/api/v1/profiler/csv")
async def profiler_csv(
    request: CSVProfilerRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    CSV 스키마 프로파일링
    """
    # TODO: CSV 프로파일러 포팅
    raise HTTPException(status_code=501, detail="Not implemented yet")

@app.get("/health")
async def health():
    """Health check"""
    return {"status": "ok"}
