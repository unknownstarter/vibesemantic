"""
LangGraph 노드 로직
TypeScript에서 Python으로 포팅
"""

from typing import Optional, TypedDict, List, Dict, Any
from datetime import datetime, timedelta
from app.services.supabase import get_supabase_client
from app.langgraph.types import AnalysisState, MartSummary, AnalystQuestion
from app.langgraph.prompts import build_system_prompt, build_user_prompt
import json
import re
import logging

logger = logging.getLogger(__name__)

# Guard and Route
def guard_and_route(state: AnalysisState) -> Dict[str, Any]:
    """권한 및 프로젝트 상태 체크"""
    try:
        from app.services.auth import verify_project_access
        
        allowed, error = verify_project_access(
            state["userId"],
            state["projectId"],
            state.get("workspaceId")
        )
        
        if not allowed:
            return {"error": error or "Access denied"}
        
        # LangGraph는 노드가 최소 하나의 필드를 업데이트해야 함
        return {"dataAccessed": state.get("dataAccessed", [])}
    except Exception as e:
        import traceback
        error_msg = f"Error in guard_and_route: {str(e)}\n{traceback.format_exc()}"
        return {"error": error_msg[:500]}  # 최대 500자로 제한

# Load Context and Mart Summary
def load_context_and_mart_summary(state: AnalysisState) -> Dict[str, Any]:
    """컨텍스트 및 Mart 요약 로드 (질문 의도 기반 데이터 소스 선택)"""
    try:
        from app.langgraph.data_source_selector import analyze_question_intent, should_include_csv_data
        
        supabase = get_supabase_client()
        data_accessed = []
        
        # 날짜 범위 계산
        end_date = datetime.now()
        days = 7 if state["range"] == "7d" else 30
        start_date = end_date - timedelta(days=days)
        
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")
        
        # 질문 의도 분석하여 필요한 데이터만 로드
        question_intent = analyze_question_intent(
            state.get("userMessage"),
            state.get("mode", "report"),
            state.get("workspacePurpose", "product")
        )
        
        logger.info(f"[LoadContext] Question intent: {question_intent}")
        
        # 최적화: 필요한 쿼리만 병렬 실행
        from concurrent.futures import ThreadPoolExecutor
        
        def fetch_ga4_metrics():
            if not question_intent.get("need_ga4", True):
                return []
            result = supabase.table("mart_ga4_metrics") \
                .select("*") \
                .eq("project_id", state["projectId"]) \
                .gte("date", start_str) \
                .lte("date", end_str) \
                .order("date") \
                .execute()
            return result.data or []
        
        def fetch_kpis():
            if not question_intent.get("need_ga4", True):
                return []
            result = supabase.table("mart_ga4_daily_kpis") \
                .select("*") \
                .eq("project_id", state["projectId"]) \
                .gte("date", start_str) \
                .lte("date", end_str) \
                .order("date") \
                .execute()
            return result.data or []
        
        def fetch_channels():
            if not question_intent.get("need_channels", False):
                return []
            result = supabase.table("mart_ga4_channel_daily") \
                .select("*") \
                .eq("project_id", state["projectId"]) \
                .gte("date", start_str) \
                .lte("date", end_str) \
                .execute()
            return result.data or []
        
        def fetch_pages():
            if not question_intent.get("need_pages", False):
                return []
            result = supabase.table("mart_ga4_top_pages_daily") \
                .select("*") \
                .eq("project_id", state["projectId"]) \
                .gte("date", start_str) \
                .lte("date", end_str) \
                .order("screen_page_views", desc=True) \
                .limit(20) \
                .execute()
            return result.data or []
        
        def fetch_csv_metrics():
            # CSV 데이터는 질문 의도와 실제 데이터 존재 여부를 모두 확인
            if not question_intent.get("need_csv", False):
                return []
            result = supabase.table("mart_csv_daily_metrics") \
                .select("*") \
                .eq("project_id", state["projectId"]) \
                .gte("date", start_str) \
                .lte("date", end_str) \
                .order("date") \
                .execute()
            csv_data = result.data or []
            # 질문 의도 재확인
            if not should_include_csv_data(csv_data, question_intent, state.get("userMessage")):
                logger.info("[LoadContext] CSV data excluded based on question intent")
                return []
            return csv_data
        
        def fetch_events():
            if not question_intent.get("need_events", False):
                return []
            result = supabase.table("mart_events") \
                .select("*") \
                .eq("project_id", state["projectId"]) \
                .eq("source", "ga4") \
                .gte("date", start_str) \
                .lte("date", end_str) \
                .order("date") \
                .execute()
            return result.data or []
        
        # 필요한 쿼리만 실행
        futures_to_run = []
        future_names = []
        
        if question_intent.get("need_ga4", True):
            futures_to_run.append(fetch_ga4_metrics)
            future_names.append("ga4_metrics")
            futures_to_run.append(fetch_kpis)
            future_names.append("kpis")
        
        if question_intent.get("need_channels", False):
            futures_to_run.append(fetch_channels)
            future_names.append("channels")
        
        if question_intent.get("need_pages", False):
            futures_to_run.append(fetch_pages)
            future_names.append("pages")
        
        if question_intent.get("need_csv", False):
            futures_to_run.append(fetch_csv_metrics)
            future_names.append("csv_metrics")
        
        if question_intent.get("need_events", False):
            futures_to_run.append(fetch_events)
            future_names.append("events")
        
        # 병렬 실행
        max_workers = max(len(futures_to_run), 1)
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            results = [executor.submit(fn).result() for fn in futures_to_run]
        
        # 결과 매핑
        result_map = dict(zip(future_names, results))
        ga4_metrics = result_map.get("ga4_metrics", [])
        kpis = result_map.get("kpis", [])
        channels = result_map.get("channels", [])
        pages = result_map.get("pages", [])
        csv_metrics = result_map.get("csv_metrics", [])
        events = result_map.get("events", [])
        
        # Only log accessed data sources
        if question_intent.get("need_ga4", True):
            data_accessed.extend(["mart_ga4_metrics", "mart_ga4_daily_kpis"])
        if question_intent.get("need_channels", False):
            data_accessed.append("mart_ga4_channel_daily")
        if question_intent.get("need_pages", False):
            data_accessed.append("mart_ga4_top_pages_daily")
        if csv_metrics:  # Only if actually loaded
            data_accessed.append("mart_csv_daily_metrics")
        if question_intent.get("need_events", False):
            data_accessed.append("mart_events")
        
        # GA4 Metrics 집계 (새 유연한 테이블 우선)
        ga4_global_metrics = [
            m for m in ga4_metrics
            if not m.get("dimensions") or len(m.get("dimensions", {})) == 0
        ]
        
        def sum_metric(metric_name: str) -> float:
            return sum(
                float(m.get("metric_value", 0) or 0)
                for m in ga4_global_metrics
                if m.get("metric_name") == metric_name
            )
        
        def avg_metric(metric_name: str) -> float:
            values = [
                float(m.get("metric_value", 0) or 0)
                for m in ga4_global_metrics
                if m.get("metric_name") == metric_name
            ]
            return sum(values) / len(values) if values else 0
        
        use_new_table = len(ga4_global_metrics) > 0
        
        total_sessions = sum_metric("sessions") if use_new_table else sum(k.get("sessions", 0) or 0 for k in kpis)
        total_active_users = sum_metric("active_users") if use_new_table else sum(k.get("active_users", 0) or 0 for k in kpis)
        total_new_users = sum_metric("new_users") if use_new_table else sum(k.get("new_users", 0) or 0 for k in kpis)
        
        if use_new_table:
            avg_engagement_rate = avg_metric("engagement_rate")
            avg_bounce_rate = avg_metric("bounce_rate")
            avg_session_duration = avg_metric("avg_session_duration")
        else:
            if kpis:
                avg_engagement_rate = sum(float(k.get("engagement_rate", 0) or 0) for k in kpis) / len(kpis)
                avg_bounce_rate = sum(float(k.get("bounce_rate", 0) or 0) for k in kpis) / len(kpis)
                avg_session_duration = sum(float(k.get("avg_session_duration", 0) or 0) for k in kpis) / len(kpis)
            else:
                avg_engagement_rate = avg_bounce_rate = avg_session_duration = 0
        
        # 채널별 집계
        channel_map = {}
        ga4_channel_metrics = [
            m for m in ga4_metrics
            if m.get("dimensions") and m.get("dimensions", {}).get("channel_group")
        ]
        
        if ga4_channel_metrics:
            for m in ga4_channel_metrics:
                channel_group = m["dimensions"]["channel_group"]
                if not channel_group:
                    continue
                
                if channel_group not in channel_map:
                    channel_map[channel_group] = {"sessions": 0, "users": 0}
                
                if m.get("metric_name") == "sessions":
                    channel_map[channel_group]["sessions"] += float(m.get("metric_value", 0) or 0)
                elif m.get("metric_name") == "active_users":
                    channel_map[channel_group]["users"] += float(m.get("metric_value", 0) or 0)
        else:
            for c in channels:
                channel_group = c.get("channel_group")
                if not channel_group:
                    continue
                
                if channel_group not in channel_map:
                    channel_map[channel_group] = {"sessions": 0, "users": 0}
                
                channel_map[channel_group]["sessions"] += c.get("sessions", 0) or 0
                channel_map[channel_group]["users"] += c.get("active_users", 0) or 0
        
        top_channels = sorted(
            [
                {
                    "name": name,
                    "sessions": data["sessions"],
                    "users": data["users"],
                    "percentage": (data["sessions"] / total_sessions * 100) if total_sessions > 0 else 0
                }
                for name, data in channel_map.items()
            ],
            key=lambda x: x["sessions"],
            reverse=True
        )[:5]
        
        # 페이지별 집계
        page_map = {}
        for p in pages:
            page_path = p.get("page_path")
            if not page_path:
                continue
            
            if page_path not in page_map:
                page_map[page_path] = {
                    "title": p.get("page_title"),
                    "views": 0,
                    "engagementRate": 0,
                    "count": 0
                }
            
            page_map[page_path]["views"] += p.get("screen_page_views", 0) or 0
            page_map[page_path]["engagementRate"] += float(p.get("engagement_rate", 0) or 0)
            page_map[page_path]["count"] += 1
        
        top_pages = sorted(
            [
                {
                    "path": path,
                    "title": data["title"],
                    "views": data["views"],
                    "engagementRate": data["engagementRate"] / data["count"] if data["count"] > 0 else 0
                }
                for path, data in page_map.items()
            ],
            key=lambda x: x["views"],
            reverse=True
        )[:10]
        
        # 일별 트렌드
        daily_trend = [
            {
                "date": k.get("date"),
                "sessions": k.get("sessions", 0) or 0,
                "users": k.get("active_users", 0) or 0
            }
            for k in kpis
        ]
        
        # CSV Metrics 집계
        csv_metrics_summary = {}
        if csv_metrics:
            for m in csv_metrics:
                metric_name = m.get("metric_name")
                if not metric_name:
                    continue
                
                if metric_name not in csv_metrics_summary:
                    csv_metrics_summary[metric_name] = {
                        "total": 0,
                        "byDimension": {},
                        "trend": []
                    }
                
                metric_value = float(m.get("metric_value", 0) or 0)
                csv_metrics_summary[metric_name]["total"] += metric_value
                
                # Dimension별 집계
                dimension_key = m.get("dimension_key")
                dimension_value = m.get("dimension_value")
                if dimension_key and dimension_value:
                    if dimension_key not in csv_metrics_summary[metric_name]["byDimension"]:
                        csv_metrics_summary[metric_name]["byDimension"][dimension_key] = {}
                    csv_metrics_summary[metric_name]["byDimension"][dimension_key][dimension_value] = \
                        csv_metrics_summary[metric_name]["byDimension"][dimension_key].get(dimension_value, 0) + metric_value
                
                # 트렌드 (날짜별로 집계)
                date = m.get("date")
                if date:
                    # 같은 날짜의 기존 항목 찾기
                    existing_trend = next(
                        (t for t in csv_metrics_summary[metric_name]["trend"] if t["date"] == date),
                        None
                    )
                    if existing_trend:
                        existing_trend["value"] += metric_value
                    else:
                        csv_metrics_summary[metric_name]["trend"].append({
                            "date": date,
                            "value": metric_value
                        })
        
        # 트렌드 정렬 (날짜순)
        for metric_name in csv_metrics_summary:
            csv_metrics_summary[metric_name]["trend"].sort(key=lambda x: x["date"])
        
        # 통합 트렌드 (GA4 + CSV)
        integrated_trend = None
        has_ga4_data = len(kpis) > 0
        has_csv_data = len(csv_metrics) > 0
        
        if has_ga4_data and has_csv_data:
            all_dates = set()
            for k in kpis:
                all_dates.add(k.get("date"))
            for m in csv_metrics:
                all_dates.add(m.get("date"))
            
            integrated_trend = []
            for date in sorted(all_dates):
                ga4_day = next((k for k in kpis if k.get("date") == date), None)
                csv_day = [m for m in csv_metrics if m.get("date") == date]
                
                csv_metrics_for_day = {}
                for m in csv_day:
                    metric_name = m.get("metric_name")
                    if metric_name:
                        csv_metrics_for_day[metric_name] = csv_metrics_for_day.get(metric_name, 0) + float(m.get("metric_value", 0) or 0)
                
                integrated_trend.append({
                    "date": date,
                    "ga4Sessions": ga4_day.get("sessions") if ga4_day else None,
                    "ga4Users": ga4_day.get("active_users") if ga4_day else None,
                    "csvMetrics": csv_metrics_for_day if csv_metrics_for_day else None
                })
        
        # 데이터 소스 요약
        data_sources = {
            "ga4": {
                "available": has_ga4_data,
                "dateRange": {
                    "start": kpis[0].get("date"),
                    "end": kpis[-1].get("date")
                } if kpis else None,
                "recordCount": len(kpis)
            },
            "csv": {
                "available": has_csv_data,
                "metrics": list(csv_metrics_summary.keys()) if csv_metrics_summary else None,
                "recordCount": len(csv_metrics)
            },
            "integrated": has_ga4_data and has_csv_data
        }
        
        # Metric Definitions 조회 (Semantic Layer)
        metric_definitions = None
        try:
            # Feature flag 확인 (간단히 구현)
            # 실제로는 feature_flags 테이블에서 확인해야 함
            metric_defs_result = supabase.table("metric_definitions") \
                .select("*") \
                .eq("project_id", state["projectId"]) \
                .eq("is_active", True) \
                .order("priority") \
                .execute()
            
            if metric_defs_result.data:
                metric_definitions = metric_defs_result.data
                data_accessed.append("metric_definitions")
        except Exception:
            pass
        
        # Statistical Analysis (only if we have sufficient data and in report mode)
        # Skip for chat mode to improve performance
        statistical_analysis = None
        mode = state.get("mode", "report")
        if mode == "report" and (len(kpis) >= 7 or len(events) > 0):  # Need at least 7 days for meaningful analysis
            try:
                from app.langgraph.statistical_analysis import perform_statistical_analysis
                
                # Only include data that was actually loaded
                # Limit data size for faster analysis
                kpis_for_analysis = kpis if question_intent.get("need_ga4", True) else []
                events_for_analysis = events[:100] if question_intent.get("need_events", False) else []  # Limit to 100 events
                daily_trends_for_analysis = daily_trend if question_intent.get("need_ga4", True) else []
                channels_for_analysis = channels[:50] if question_intent.get("need_channels", False) else None  # Limit to 50 channels
                
                statistical_analysis = perform_statistical_analysis(
                    kpis_data=kpis_for_analysis,
                    events_data=events_for_analysis,
                    daily_trends=daily_trends_for_analysis,
                    channels_data=channels_for_analysis
                )
                
                # Filter out None coefficients and ensure valid results
                if statistical_analysis:
                    metric_corrs = statistical_analysis.get("metric_correlations", [])
                    if metric_corrs:
                        statistical_analysis["metric_correlations"] = [
                            c for c in metric_corrs 
                            if c.get("correlation", {}).get("coefficient") is not None
                        ][:5]  # Limit to top 5 correlations
                    
                    event_rels = statistical_analysis.get("event_kpi_relationships", [])
                    if event_rels:
                        statistical_analysis["event_kpi_relationships"] = [
                            r for r in event_rels
                            if r.get("correlation", {}).get("coefficient") is not None
                        ][:5]  # Limit to top 5 relationships
            except Exception as e:
                # 통계 분석 실패해도 리포트 생성은 계속
                logger.warning(f"[Statistical Analysis] Error: {str(e)}")
                statistical_analysis = {
                    "metric_correlations": [],
                    "event_kpi_relationships": [],
                    "causality_hints": [],
                    "summary": "Statistical analysis unavailable"
                }
        
        mart_summary: MartSummary = {
            "period": {
                "start": start_str,
                "end": end_str,
                "days": days
            },
            "kpis": {
                "totalSessions": total_sessions,
                "totalActiveUsers": total_active_users,
                "totalNewUsers": total_new_users,
                "avgEngagementRate": round(avg_engagement_rate * 10000) / 100,
                "avgBounceRate": round(avg_bounce_rate * 10000) / 100,
                "avgSessionDuration": round(avg_session_duration)
            },
            "topChannels": top_channels if question_intent.get("need_channels", False) else [],
            "topPages": top_pages if question_intent.get("need_pages", False) else [],
            "dailyTrend": daily_trend if question_intent.get("need_ga4", True) else [],
            "csvMetrics": csv_metrics_summary if csv_metrics_summary else None,
            "integratedTrend": integrated_trend if (has_ga4_data and has_csv_data) else None,
            "dataSources": data_sources,
            "metricDefinitions": metric_definitions,
            "statisticalAnalysis": statistical_analysis
        }
        
        # 채팅 모드일 때 이전 대화 메시지 로드
        conversation_history = []
        if state["mode"] == "chat" and state.get("threadId"):
            try:
                # 최근 10개 메시지 로드 (최신순, 현재 메시지 제외)
                messages_result = supabase.table("chat_messages") \
                    .select("role, content, created_at") \
                    .eq("workspace_id", state["workspaceId"]) \
                    .eq("thread_id", state["threadId"]) \
                    .order("created_at", desc=False) \
                    .limit(10) \
                    .execute()
                
                conversation_history = messages_result.data or []
                data_accessed.append("chat_messages")
            except Exception:
                conversation_history = []
        
        return {
            "martSummary": mart_summary,
            "conversationHistory": conversation_history,
            "dataAccessed": data_accessed
        }
    except Exception as e:
        return {"error": str(e)}

# Parse Analyst Questions
def parse_analyst_questions(markdown: str) -> List[AnalystQuestion]:
    """마크다운에서 Analyst Questions 추출"""
    # Analyst Questions 섹션 찾기
    questions_match = re.search(
        r'#{1,4}\s*Analyst Questions[\s\S]*?(?=#{1,4}\s+[A-Z]|$)',
        markdown,
        re.IGNORECASE
    )
    
    if not questions_match:
        return get_default_questions()
    
    section = questions_match.group(0)
    questions = []
    
    # 번호 매긴 질문 찾기 (1. 질문내용?)
    numbered_pattern = r'\d+\.\s*\*?\*?([^\n*]+\?)\*?\*?'
    matches = re.finditer(numbered_pattern, section)
    
    for idx, match in enumerate(matches):
        if idx >= 3:
            break
        
        question_text = re.sub(r'^\*+|\*+$', '', match.group(1)).strip()
        
        if len(question_text) > 10 and '?' in question_text:
            questions.append({
                "id": f"q{idx + 1}",
                "question": question_text,
                "context": extract_context(section, question_text),
                "quickReplies": generate_quick_replies(question_text)
            })
    
    # 번호 없이 질문만 있는 경우
    if not questions:
        bullet_pattern = r'[-•]\s*([^\n]+\?)'
        matches = re.finditer(bullet_pattern, section)
        
        for idx, match in enumerate(matches):
            if idx >= 3:
                break
            
            question_text = re.sub(r'^\*+|\*+$', '', match.group(1)).strip()
            
            if (len(question_text) > 10 and 
                '?' in question_text and 
                'quick reply' not in question_text.lower() and
                'next_params' not in question_text.lower()):
                questions.append({
                    "id": f"q{idx + 1}",
                    "question": question_text,
                    "context": extract_context(section, question_text),
                    "quickReplies": generate_quick_replies(question_text)
                })
    
    return questions[:3] if questions else get_default_questions()

def extract_context(section: str, question: str) -> str:
    """질문의 컨텍스트 추출"""
    # 간단한 구현: 질문 주변 텍스트
    idx = section.find(question)
    if idx == -1:
        return "분석 결과"
    
    start = max(0, idx - 100)
    end = min(len(section), idx + len(question) + 100)
    context = section[start:end]
    
    # 키워드 추출
    keywords = ["세션", "유저", "채널", "페이지", "전환", "리텐션"]
    found_keywords = [kw for kw in keywords if kw in context]
    
    return ", ".join(found_keywords) if found_keywords else "분석 결과"

def generate_quick_replies(question: str) -> List[Dict[str, Any]]:
    """Quick Replies 자동 생성"""
    replies = []
    
    # Range 관련 질문
    if any(kw in question for kw in ["7일", "30일", "기간", "기간별"]):
        replies.append({
            "label": "7일로 보기",
            "nextParams": {"range": "7d"}
        })
        replies.append({
            "label": "30일로 보기",
            "nextParams": {"range": "30d"}
        })
    
    # 채널 관련 질문
    if any(kw in question for kw in ["채널", "유입", "트래픽"]):
        replies.append({
            "label": "채널 상세 분석",
            "nextParams": {"focus": "channel"}
        })
    
    # 페이지 관련 질문
    if any(kw in question for kw in ["페이지", "화면", "경로"]):
        replies.append({
            "label": "페이지 상세 분석",
            "nextParams": {"focus": "page"}
        })
    
    # 기본 Quick Reply
    if not replies:
        replies.append({
            "label": "더 자세히 보기",
            "nextParams": {"range": "30d"}
        })
    
    return replies

def get_default_questions() -> List[AnalystQuestion]:
    """기본 질문 반환"""
    return [
        {
            "id": "q1",
            "question": "이번 기간 가장 큰 변화는 무엇인가요?",
            "context": "분석 결과",
            "quickReplies": [
                {"label": "7일로 보기", "nextParams": {"range": "7d"}},
                {"label": "30일로 보기", "nextParams": {"range": "30d"}}
            ]
        }
    ]

def remove_analyst_questions_section(markdown: str) -> str:
    """마크다운에서 Analyst Questions 섹션 제거"""
    pattern = r'#{1,4}\s*Analyst Questions[\s\S]*?(?=#{1,4}\s+[A-Z]|$)'
    return re.sub(pattern, '', markdown, flags=re.IGNORECASE).strip()

def extract_chat_followup_questions(text: str) -> List[AnalystQuestion]:
    """채팅 모드에서 후속 질문 추출"""
    questions = []
    
    # 답변 끝부분에서 질문 패턴 찾기 (마지막 200자 내)
    # "질문?", "~하시겠어요?", "~보시겠어요?" 등의 패턴
    last_part = text[-200:] if len(text) > 200 else text
    
    # 질문 패턴: "?"로 끝나는 문장
    question_patterns = [
        r'([^.!?]*\?[^.!?]*)',  # 일반 질문
        r'([^.!?]*하시겠어요\?[^.!?]*)',  # "~하시겠어요?"
        r'([^.!?]*보시겠어요\?[^.!?]*)',  # "~보시겠어요?"
        r'([^.!?]*알아보시겠어요\?[^.!?]*)',  # "~알아보시겠어요?"
    ]
    
    found_questions = []
    for pattern in question_patterns:
        matches = re.finditer(pattern, last_part, re.IGNORECASE)
        for match in matches:
            question_text = match.group(1).strip()
            # 너무 짧거나 긴 질문 제외
            if 10 <= len(question_text) <= 100 and '?' in question_text:
                found_questions.append(question_text)
    
    # 중복 제거하고 최대 2개만
    unique_questions = []
    seen = set()
    for q in found_questions:
        q_clean = q.strip().rstrip('?').strip()
        if q_clean not in seen and len(q_clean) > 10:
            seen.add(q_clean)
            unique_questions.append(q)
            if len(unique_questions) >= 2:
                break
    
    # 질문을 AnalystQuestion 형식으로 변환
    for idx, q_text in enumerate(unique_questions):
        questions.append({
            "id": f"chat_q{idx + 1}",
            "question": q_text,
            "context": "채팅 답변",
            "quickReplies": generate_quick_replies(q_text)
        })
    
    return questions

# Persist Results
def persist_results(state: AnalysisState) -> Dict[str, Any]:
    """결과 저장"""
    try:
        supabase = get_supabase_client()
        
        # State에서 필요한 데이터 가져오기
        analysis_markdown = state.get("analysisMarkdown", "")
        analyst_questions = state.get("analystQuestions", []) or []
        mart_summary = state.get("martSummary")
        mode = state.get("mode", "report")
        user_message = state.get("userMessage")
        
        # Chat message 저장 (user message가 있으면)
        if user_message:
            try:
                supabase.table("chat_messages").insert({
                    "workspace_id": state["workspaceId"],
                    "thread_id": state["threadId"],
                    "role": "user",
                    "content": user_message
                }).execute()
            except Exception:
                pass
        
        # Assistant message 저장
        if analysis_markdown:
            try:
                supabase.table("chat_messages").insert({
                    "workspace_id": state["workspaceId"],
                    "thread_id": state["threadId"],
                    "role": "assistant",
                    "content": analysis_markdown,
                    "metadata": {"questions": analyst_questions}
                }).execute()
            except Exception:
                pass
        
        # Report 모드면 reports 테이블에도 저장
        if mode == "report" and analysis_markdown:
            try:
                metadata = {
                    "questions": analyst_questions
                }
                if mart_summary:
                    metadata["martSummary"] = mart_summary
                
                supabase.table("reports").insert({
                    "workspace_id": state["workspaceId"],
                    "range": state["range"],
                    "report_markdown": analysis_markdown,
                    "metadata": metadata
                }).execute()
            except Exception:
                pass
        
        # Analysis thread 업데이트
        try:
            supabase.table("analysis_threads").upsert({
                "workspace_id": state["workspaceId"],
                "thread_id": state["threadId"],
                "last_range": state["range"],
                "last_snapshot_at": datetime.now().isoformat()
            }, on_conflict="workspace_id,thread_id").execute()
        except Exception:
            pass
        
        # Audit log
        try:
            supabase.table("audit_logs").insert({
                "user_id": state["userId"],
                "project_id": state["projectId"],
                "workspace_id": state["workspaceId"],
                "action": "agent.report.generate" if mode == "report" else "agent.chat.message",
                "data_accessed": state.get("dataAccessed", []),
                "llm_payload_summary": {
                    "mode": mode,
                    "range": state["range"],
                    "questionsCount": len(analyst_questions),
                    "responseLength": len(analysis_markdown)
                }
            }).execute()
        except Exception:
            pass
        
        # LangGraph는 노드가 최소 하나의 필드를 업데이트해야 함
        return {"dataAccessed": state.get("dataAccessed", [])}
    except Exception as e:
        return {"dataAccessed": state.get("dataAccessed", []), "error": str(e)}
