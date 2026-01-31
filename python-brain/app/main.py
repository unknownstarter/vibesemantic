"""
Python Brain API - FastAPI 서버
LangGraph 엔진, 데이터 수집기, CSV 프로파일러 제공
"""

from fastapi import FastAPI, HTTPException, Header, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional
import os
import asyncio
import traceback
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Vibe Semantic Brain API", version="1.0.0")

# 전역 예외 핸들러
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_detail = f"{str(exc)}\n{traceback.format_exc()}"
    logger.error(f"Unhandled exception: {error_detail}")
    # 최대 1000자로 제한
    if len(error_detail) > 1000:
        error_detail = error_detail[:1000] + "..."
    return JSONResponse(
        status_code=500,
        content={"detail": error_detail}
    )

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인만 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
async def health():
    return {"status": "ok", "service": "brain-api"}

# API Key 인증
async def verify_api_key(x_api_key: Optional[str] = Header(None)):
    expected_key = os.getenv("API_KEY")
    if not expected_key:
        raise HTTPException(status_code=500, detail="API key not configured")
    if x_api_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key

# Request/Response Models
class ChartContextModel(BaseModel):
    """Epic 5.2: 차트→채팅. 선택한 차트/메트릭 컨텍스트. API는 camelCase 수신."""
    range: Optional[str] = None  # "7d" | "30d"
    metric_names: Optional[list[str]] = Field(None, alias="metricNames")
    chart_type: Optional[str] = Field(None, alias="chartType")  # "trend" | "channel" | "page" | "integrated"
    label: Optional[str] = None

    model_config = {"populate_by_name": True}

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
    chart_context: Optional[ChartContextModel] = None  # Epic 5.2

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
    file_id: str
    storage_path: str
    original_filename: Optional[str] = None  # e.g. "data.xlsx" -> use read_excel
    headers: list[str]
    mapping: dict
    date_range: Optional[dict] = None

class CSVProfilerRequest(BaseModel):
    file_content: Optional[str] = None  # Base64 encoded CSV content
    storage_path: Optional[str] = None  # Supabase Storage path (alternative to file_content)
    headers: Optional[list[str]] = None  # Optional: pre-parsed headers
    sample_rows: Optional[list[list[str]]] = None  # Optional: pre-parsed sample rows
    language: str = "ko"
    project_profile: Optional[dict] = None
    max_rows: int = 10000  # Maximum rows to analyze

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
        logger.info(f"Analyze request: mode={request.mode}, workspace_id={request.workspace_id}, project_id={request.project_id}")
        
        if request.mode == "chat" and not request.user_message:
            raise HTTPException(status_code=400, detail="user_message is required for chat mode")
        
        logger.info("Calling run_analysis...")
        chart_context_dict = None
        if request.chart_context:
            chart_context_dict = {
                "range": request.chart_context.range,
                "metricNames": request.chart_context.metric_names,
                "chartType": request.chart_context.chart_type,
                "label": request.chart_context.label,
            }
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
            "chartContext": chart_context_dict,
        })
        
        logger.info(f"run_analysis completed: has_error={bool(result.get('error'))}, has_analysis={bool(result.get('analysisMarkdown'))}")
        
        # 에러 체크
        if result.get("error"):
            error_msg = result["error"]
            logger.error(f"Analysis error: {error_msg}")
            if len(error_msg) > 200:
                error_msg = error_msg[:200] + "..."
            raise HTTPException(status_code=400, detail=error_msg)
        
        # messages 필드 제거 (JSON serialization 방지)
        if "messages" in result:
            result = {k: v for k, v in result.items() if k != "messages"}
        
        # 필수 필드 검증
        analysis_markdown = result.get("analysisMarkdown", "")
        if not analysis_markdown:
            logger.warning("Empty analysis_markdown")
            if request.mode == "chat":
                analysis_markdown = "죄송합니다. 답변을 생성하는 중 오류가 발생했습니다."
            else:
                raise HTTPException(status_code=500, detail="Failed to generate analysis")
        
        logger.info("Returning response")
        # 응답 생성
        return AnalyzeResponse(
            analysis_markdown=analysis_markdown,
            analyst_questions=result.get("analystQuestions", []) or [],
            mart_summary=result.get("martSummary"),
            thread_id=result.get("threadId", request.thread_id),
            data_accessed=result.get("dataAccessed", []) or []
        )
    except HTTPException as e:
        logger.error(f"HTTPException: {e.detail}")
        raise
    except Exception as e:
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        logger.error(f"Exception in analyze: {error_detail}")
        if len(error_detail) > 1000:
            error_detail = error_detail[:1000] + "..."
        raise HTTPException(status_code=500, detail=error_detail)

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
    CSV 데이터 수집 (Pandas 기반)
    """
    from app.services.csv_ingest import ingest_csv_file
    from app.services.supabase import get_supabase_client
    
    try:
        logger.info(f"CSV ingestion request: file_id={request.file_id}, project_id={request.project_id}")
        
        supabase = get_supabase_client()
        
        result = ingest_csv_file(
            supabase=supabase,
            project_id=request.project_id,
            dataset_id=request.dataset_id,
            file_id=request.file_id,
            storage_path=request.storage_path,
            original_filename=request.original_filename,
            headers=request.headers,
            mapping=request.mapping,
            date_range_filter=request.date_range
        )
        
        return {
            "total_rows": result["total_rows"],
            "processed_rows": result["processed_rows"],
            "inserted_records": result["inserted_records"],
            "errors": result["errors"],
            "processing_time_ms": result["processing_time_ms"]
        }
        
    except Exception as e:
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        logger.error(f"Exception in collect_csv: {error_detail}")
        if len(error_detail) > 1000:
            error_detail = error_detail[:1000] + "..."
        raise HTTPException(status_code=500, detail=error_detail)

@app.post("/api/v1/profiler/csv")
async def profiler_csv(
    request: CSVProfilerRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    CSV 스키마 프로파일링 (Pandas 기반)
    Enhanced column analysis for better schema detection
    """
    from app.services.csv_profiler import (
        profile_csv_with_pandas,
        convert_pandas_profile_to_column_analysis
    )
    from app.services.supabase import get_supabase_client
    import base64
    
    try:
        logger.info(f"CSV profiling request: has_file_content={request.file_content is not None}, has_storage_path={request.storage_path is not None}")
        
        file_content_bytes: bytes
        
        # Get file content
        if request.file_content:
            # Decode base64
            try:
                file_content_bytes = base64.b64decode(request.file_content)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid base64 file content: {str(e)}")
        elif request.storage_path:
            # Download from Supabase Storage
            supabase = get_supabase_client()
            try:
                response = supabase.storage.from_("csv-uploads").download(request.storage_path)
                if not response:
                    raise HTTPException(status_code=404, detail=f"File not found in storage: {request.storage_path}")
                file_content_bytes = response
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to download file from storage: {str(e)}")
        else:
            raise HTTPException(status_code=400, detail="Either file_content or storage_path must be provided")
        
        # Profile with Pandas
        pandas_profile = profile_csv_with_pandas(
            file_content_bytes,
            max_rows=request.max_rows
        )
        
        # Convert to ColumnAnalysis format (for compatibility)
        column_analysis = convert_pandas_profile_to_column_analysis(pandas_profile)
        
        return {
            "total_rows": pandas_profile["total_rows"],
            "total_columns": pandas_profile["total_columns"],
            "encoding": pandas_profile["encoding"],
            "column_analysis": column_analysis,
            "pandas_profile": pandas_profile  # Full profile for advanced use
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        logger.error(f"Exception in profiler_csv: {error_detail}")
        if len(error_detail) > 1000:
            error_detail = error_detail[:1000] + "..."
        raise HTTPException(status_code=500, detail=error_detail)

@app.get("/health")
async def health():
    """Health check"""
    return {"status": "ok"}
