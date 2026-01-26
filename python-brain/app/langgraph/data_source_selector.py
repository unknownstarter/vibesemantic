"""
Data Source Selector
Determines which data sources are needed based on user question and workspace purpose
"""

from typing import Dict, List, Optional, Set
import re


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


def should_include_csv_data(
    csv_metrics: List[Dict],
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
