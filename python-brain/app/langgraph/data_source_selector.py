"""
Data Source Selector
Determines which data sources are needed based on user question and workspace purpose.
Epic 4.1: build_plan() returns full Plan for Planner node (intent + need_* + date_range).
"""

from typing import Dict, List, Optional, Set, Any
import re


def build_plan(
    user_message: Optional[str],
    mode: str,
    workspace_purpose: str,
    range_value: str,
    chart_context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Build Planner output: intent, need_ga4, need_csv, need_channels, need_pages, need_events, date_range.
    Report mode: full range plan (intent=full_report, all need_* True).
    Chat mode: userMessage-based plan via analyze_question_intent + simple intent string.
    Epic 5.2: chart_context 있으면 date_range·metrics_requested 반영.
    """
    date_range = range_value if range_value in ("7d", "30d") else "7d"
    if chart_context and chart_context.get("range") in ("7d", "30d"):
        date_range = chart_context["range"]
    if mode == "report":
        return {
            "intent": "full_report",
            "need_ga4": True,
            "need_csv": True,
            "need_channels": True,
            "need_pages": True,
            "need_events": True,
            "date_range": date_range,
        }
    # Epic 5.2: 차트 컨텍스트 있으면 해당 메트릭/차트 타입 반영
    if chart_context:
        chart_type = chart_context.get("chartType") or ""
        if chart_type == "channel":
            intent_result = {"need_ga4": True, "need_csv": False, "need_channels": True, "need_pages": False, "need_events": False}
        elif chart_type == "page":
            intent_result = {"need_ga4": True, "need_csv": False, "need_channels": False, "need_pages": True, "need_events": False}
        elif chart_type == "integrated":
            intent_result = {"need_ga4": True, "need_csv": True, "need_channels": False, "need_pages": False, "need_events": False}
        else:
            intent_result = {"need_ga4": True, "need_csv": False, "need_channels": False, "need_pages": False, "need_events": False}
        return {
            "intent": "chart_focus",
            "need_ga4": intent_result.get("need_ga4", True),
            "need_csv": intent_result.get("need_csv", False),
            "need_channels": intent_result.get("need_channels", False),
            "need_pages": intent_result.get("need_pages", False),
            "need_events": intent_result.get("need_events", False),
            "date_range": date_range,
            "metrics_requested": chart_context.get("metricNames"),
            "dimensions_requested": None,
        }
    intent_result = analyze_question_intent(user_message, mode, workspace_purpose)
    intent = _derive_intent(user_message, intent_result, workspace_purpose)
    return {
        "intent": intent,
        "need_ga4": intent_result.get("need_ga4", True),
        "need_csv": intent_result.get("need_csv", False),
        "need_channels": intent_result.get("need_channels", False),
        "need_pages": intent_result.get("need_pages", False),
        "need_events": intent_result.get("need_events", False),
        "date_range": date_range,
    }


def _derive_intent(
    user_message: Optional[str],
    intent_result: Dict[str, bool],
    workspace_purpose: str,
) -> str:
    """Derive a simple intent label for Chat mode (no LLM)."""
    if not user_message or not user_message.strip():
        return "general"
    lower = user_message.lower()
    if intent_result.get("need_channels"):
        return "channel_breakdown"
    if intent_result.get("need_pages"):
        return "page_breakdown"
    if intent_result.get("need_csv"):
        return "csv_metrics"
    if intent_result.get("need_events"):
        return "events"
    if any(k in lower for k in ("요약", "summary", "전체", "overview", "전반")):
        return "overview"
    return "general"


def analyze_question_intent(
    user_message: Optional[str],
    mode: str,
    workspace_purpose: str
) -> Dict[str, bool]:
    """
    Analyze user question to determine which data sources are needed
    
    Args:
        user_message: User's question (for chat mode)
        mode: "report" or "chat"
        workspace_purpose: Workspace purpose (product, marketing, biz, sales)
        
    Returns:
        Dictionary indicating which data sources to load:
        {
            "need_ga4": bool,
            "need_csv": bool,
            "need_events": bool,
            "need_channels": bool,
            "need_pages": bool,
        }
    """
    # Default: load all for report mode
    if mode == "report":
        return {
            "need_ga4": True,
            "need_csv": True,  # Will be filtered later if no CSV data exists
            "need_events": True,
            "need_channels": True,
            "need_pages": True,
        }
    
    # For chat mode, analyze question intent
    if not user_message:
        return {
            "need_ga4": True,
            "need_csv": False,
            "need_events": False,
            "need_channels": False,
            "need_pages": False,
        }
    
    user_message_lower = user_message.lower()
    
    # GA4-related keywords
    ga4_keywords = [
        "세션", "session", "사용자", "user", "유입", "acquisition",
        "전환", "conversion", "이탈률", "bounce", "참여", "engagement",
        "채널", "channel", "페이지", "page", "경로", "path",
        "ga4", "analytics", "트래픽", "traffic"
    ]
    
    # CSV-related keywords
    csv_keywords = [
        "csv", "매출", "revenue", "수익", "profit", "비용", "cost",
        "주문", "order", "구매", "purchase", "판매", "sales",
        "이벤트", "event", "커스텀", "custom", "외부", "external"
    ]
    
    # Event-related keywords
    event_keywords = [
        "이벤트", "event", "클릭", "click", "전환", "conversion",
        "가입", "signup", "구매", "purchase", "다운로드", "download"
    ]
    
    # Channel-related keywords
    channel_keywords = [
        "채널", "channel", "유입 경로", "acquisition", "마케팅", "marketing",
        "소스", "source", "매체", "medium", "광고", "ad"
    ]
    
    # Page-related keywords
    page_keywords = [
        "페이지", "page", "화면", "screen", "경로", "path", "url",
        "인기", "popular", "조회", "view", "방문", "visit"
    ]
    
    # Check keyword matches
    need_ga4 = any(kw in user_message_lower for kw in ga4_keywords)
    need_csv = any(kw in user_message_lower for kw in csv_keywords)
    need_events = any(kw in user_message_lower for kw in event_keywords)
    need_channels = any(kw in user_message_lower for kw in channel_keywords)
    need_pages = any(kw in user_message_lower for kw in page_keywords)
    
    # Purpose-based defaults
    if workspace_purpose == "marketing":
        need_channels = True  # Marketing always needs channel data
        need_ga4 = True
    elif workspace_purpose == "product":
        need_events = True  # Product needs event data
        need_pages = True
    
    # If no specific keywords found, use purpose-based defaults
    if not any([need_ga4, need_csv, need_events, need_channels, need_pages]):
        if workspace_purpose == "marketing":
            return {
                "need_ga4": True,
                "need_csv": False,
                "need_events": False,
                "need_channels": True,
                "need_pages": False,
            }
        elif workspace_purpose == "product":
            return {
                "need_ga4": True,
                "need_csv": False,
                "need_events": True,
                "need_channels": False,
                "need_pages": True,
            }
        else:
            # Default: minimal GA4 data
            return {
                "need_ga4": True,
                "need_csv": False,
                "need_events": False,
                "need_channels": False,
                "need_pages": False,
            }
    
    return {
        "need_ga4": need_ga4,
        "need_csv": need_csv,
        "need_events": need_events,
        "need_channels": need_channels,
        "need_pages": need_pages,
    }


def refine_plan_with_available_data(
    plan: Dict[str, Any],
    data_sources: Dict[str, Any],
) -> Dict[str, Any]:
    """
    build_summary_from_mart 이후 호출.
    실제 데이터 유무에 따라 plan의 need_* 플래그를 보정한다.
    예: GA4 데이터가 없으면 need_ga4=False, need_channels=False, need_pages=False.
    이를 통해 이후 프롬프트 생성 시 불필요한 분석 지시를 줄인다.
    """
    refined = dict(plan)
    has_ga4 = data_sources.get("ga4", {}).get("available", False)
    has_csv = data_sources.get("csv", {}).get("available", False)

    if not has_ga4:
        refined["need_ga4"] = False
        refined["need_channels"] = False
        refined["need_pages"] = False
        refined["need_events"] = False

    if not has_csv:
        refined["need_csv"] = False

    return refined


def should_include_csv_data(
    csv_metrics: List[Dict[str, Any]],
    question_intent: Dict[str, bool],
    user_message: Optional[str] = None
) -> bool:
    """
    Determine if CSV data should be included in analysis
    
    Args:
        csv_metrics: List of CSV metrics
        question_intent: Question intent analysis
        user_message: User's question
        
    Returns:
        True if CSV data should be included
    """
    # If no CSV data exists, don't include
    if not csv_metrics or len(csv_metrics) == 0:
        return False
    
    # If question explicitly mentions CSV-related terms, include
    if question_intent.get("need_csv", False):
        return True
    
    # If question doesn't mention GA4 but mentions metrics that could be in CSV
    if user_message:
        user_lower = user_message.lower()
        csv_metric_keywords = ["매출", "revenue", "수익", "profit", "주문", "order", "구매", "purchase"]
        if any(kw in user_lower for kw in csv_metric_keywords):
            # Check if GA4 doesn't have this data
            if "ga4" not in user_lower and "analytics" not in user_lower:
                return True
    
    # Default: don't include CSV unless explicitly needed
    return False
