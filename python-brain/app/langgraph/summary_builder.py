"""
Summary (Semantic Snapshot) builder from Mart.
Mart 쿼리 → 결정론적 집계 → MartSummary. LLM 미관여.
캐시 키: (project_id, workspace_id, range). 동일 입력 → 동일 Summary.
"""

from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime, timedelta
from app.langgraph.types import MartSummary
from app.langgraph.semantic_graph import fetch_semantic_graph


def _date_range_from_range(range_value: str) -> Tuple[datetime, datetime, int]:
    end_date = datetime.now()
    days = 7 if range_value == "7d" else 30
    start_date = end_date - timedelta(days=days)
    return start_date, end_date, days


def build_summary_from_mart(
    supabase,
    project_id: str,
    range_value: str,
    question_intent: Dict[str, Any],
    mode: str = "report",
    workspace_id: Optional[str] = None,
    user_message: Optional[str] = None,
) -> Tuple[MartSummary, List[str]]:
    """
    Mart 테이블 쿼리 + 결정론적 집계로 Summary(Semantic Snapshot) 생성.
    반환: (mart_summary, data_accessed).
    캐시 키 정책: (project_id, workspace_id, range) → 동일 Summary.
    """
    from concurrent.futures import ThreadPoolExecutor

    start_date, end_date, days = _date_range_from_range(range_value)
    start_str = start_date.strftime("%Y-%m-%d")
    end_str = end_date.strftime("%Y-%m-%d")
    data_accessed: List[str] = []

    def fetch_ga4_metrics():
        if not question_intent.get("need_ga4", True):
            return []
        result = supabase.table("mart_ga4_metrics") \
            .select("*") \
            .eq("project_id", project_id) \
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
            .eq("project_id", project_id) \
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
            .eq("project_id", project_id) \
            .gte("date", start_str) \
            .lte("date", end_str) \
            .execute()
        return result.data or []

    def fetch_pages():
        if not question_intent.get("need_pages", False):
            return []
        result = supabase.table("mart_ga4_top_pages_daily") \
            .select("*") \
            .eq("project_id", project_id) \
            .gte("date", start_str) \
            .lte("date", end_str) \
            .order("screen_page_views", desc=True) \
            .limit(20) \
            .execute()
        return result.data or []

    def fetch_csv_metrics():
        if not question_intent.get("need_csv", False):
            return []
        result = supabase.table("mart_csv_daily_metrics") \
            .select("*") \
            .eq("project_id", project_id) \
            .gte("date", start_str) \
            .lte("date", end_str) \
            .order("date") \
            .execute()
        csv_data = result.data or []
        from app.langgraph.data_source_selector import should_include_csv_data
        if not should_include_csv_data(csv_data, question_intent, user_message):
            return []
        return csv_data

    def fetch_events():
        if not question_intent.get("need_events", False):
            return []
        result = supabase.table("mart_events") \
            .select("*") \
            .eq("project_id", project_id) \
            .eq("source", "ga4") \
            .gte("date", start_str) \
            .lte("date", end_str) \
            .order("date") \
            .execute()
        return result.data or []

    futures_to_run = []
    future_names = []
    if question_intent.get("need_ga4", True):
        futures_to_run.extend([fetch_ga4_metrics, fetch_kpis])
        future_names.extend(["ga4_metrics", "kpis"])
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

    if not futures_to_run:
        futures_to_run = [fetch_kpis]
        future_names = ["kpis"]

    max_workers = max(len(futures_to_run), 1)
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        results = [executor.submit(fn).result() for fn in futures_to_run]

    result_map = dict(zip(future_names, results))
    ga4_metrics = result_map.get("ga4_metrics", [])
    kpis = result_map.get("kpis", [])
    channels = result_map.get("channels", [])
    pages = result_map.get("pages", [])
    csv_metrics = result_map.get("csv_metrics", [])
    events = result_map.get("events", [])

    if question_intent.get("need_ga4", True):
        data_accessed.extend(["mart_ga4_metrics", "mart_ga4_daily_kpis"])
    if question_intent.get("need_channels", False):
        data_accessed.append("mart_ga4_channel_daily")
    if question_intent.get("need_pages", False):
        data_accessed.append("mart_ga4_top_pages_daily")
    if csv_metrics:
        data_accessed.append("mart_csv_daily_metrics")
    if question_intent.get("need_events", False):
        data_accessed.append("mart_events")

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

    channel_map = {}
    ga4_channel_metrics = [
        m for m in ga4_metrics
        if m.get("dimensions") and m.get("dimensions", {}).get("channel_group")
    ]
    if ga4_channel_metrics:
        for m in ga4_channel_metrics:
            cg = m["dimensions"].get("channel_group")
            if not cg:
                continue
            if cg not in channel_map:
                channel_map[cg] = {"sessions": 0, "users": 0}
            if m.get("metric_name") == "sessions":
                channel_map[cg]["sessions"] += float(m.get("metric_value", 0) or 0)
            elif m.get("metric_name") == "active_users":
                channel_map[cg]["users"] += float(m.get("metric_value", 0) or 0)
    else:
        for c in channels:
            cg = c.get("channel_group")
            if not cg:
                continue
            if cg not in channel_map:
                channel_map[cg] = {"sessions": 0, "users": 0}
            channel_map[cg]["sessions"] += c.get("sessions", 0) or 0
            channel_map[cg]["users"] += c.get("active_users", 0) or 0

    top_channels = sorted(
        [
            {
                "name": name,
                "sessions": data["sessions"],
                "users": data["users"],
                "percentage": (data["sessions"] / total_sessions * 100) if total_sessions > 0 else 0,
            }
            for name, data in channel_map.items()
        ],
        key=lambda x: x["sessions"],
        reverse=True,
    )[:5]

    page_map = {}
    for p in pages:
        path = p.get("page_path")
        if not path:
            continue
        if path not in page_map:
            page_map[path] = {"title": p.get("page_title"), "views": 0, "engagementRate": 0, "count": 0}
        page_map[path]["views"] += p.get("screen_page_views", 0) or 0
        page_map[path]["engagementRate"] += float(p.get("engagement_rate", 0) or 0)
        page_map[path]["count"] += 1

    top_pages = sorted(
        [
            {
                "path": path,
                "title": data["title"],
                "views": data["views"],
                "engagementRate": data["engagementRate"] / data["count"] if data["count"] > 0 else 0,
            }
            for path, data in page_map.items()
        ],
        key=lambda x: x["views"],
        reverse=True,
    )[:10]

    daily_trend = [
        {"date": k.get("date"), "sessions": k.get("sessions", 0) or 0, "users": k.get("active_users", 0) or 0}
        for k in kpis
    ]

    csv_metrics_summary = {}
    if csv_metrics:
        for m in csv_metrics:
            metric_name = m.get("metric_name")
            if not metric_name:
                continue
            if metric_name not in csv_metrics_summary:
                csv_metrics_summary[metric_name] = {"total": 0, "byDimension": {}, "trend": []}
            metric_value = float(m.get("metric_value", 0) or 0)
            csv_metrics_summary[metric_name]["total"] += metric_value
            dk, dv = m.get("dimension_key"), m.get("dimension_value")
            if dk and dv:
                if dk not in csv_metrics_summary[metric_name]["byDimension"]:
                    csv_metrics_summary[metric_name]["byDimension"][dk] = {}
                csv_metrics_summary[metric_name]["byDimension"][dk][dv] = (
                    csv_metrics_summary[metric_name]["byDimension"][dk].get(dv, 0) + metric_value
                )
            date = m.get("date")
            if date:
                existing = next(
                    (t for t in csv_metrics_summary[metric_name]["trend"] if t["date"] == date),
                    None,
                )
                if existing:
                    existing["value"] += metric_value
                else:
                    csv_metrics_summary[metric_name]["trend"].append({"date": date, "value": metric_value})
    for mn in csv_metrics_summary:
        csv_metrics_summary[mn]["trend"].sort(key=lambda x: x["date"])

    has_ga4_data = len(kpis) > 0
    has_csv_data = len(csv_metrics) > 0
    integrated_trend = None
    if has_ga4_data and has_csv_data:
        all_dates = set(k.get("date") for k in kpis) | set(m.get("date") for m in csv_metrics)
        integrated_trend = []
        for date in sorted(all_dates):
            ga4_day = next((k for k in kpis if k.get("date") == date), None)
            csv_day = [m for m in csv_metrics if m.get("date") == date]
            csv_for_day = {}
            for m in csv_day:
                mn = m.get("metric_name")
                if mn:
                    csv_for_day[mn] = csv_for_day.get(mn, 0) + float(m.get("metric_value", 0) or 0)
            integrated_trend.append({
                "date": date,
                "ga4Sessions": ga4_day.get("sessions") if ga4_day else None,
                "ga4Users": ga4_day.get("active_users") if ga4_day else None,
                "csvMetrics": csv_for_day if csv_for_day else None,
            })

    data_sources = {
        "ga4": {
            "available": has_ga4_data,
            "dateRange": {"start": kpis[0].get("date"), "end": kpis[-1].get("date")} if kpis else None,
            "recordCount": len(kpis),
        },
        "csv": {
            "available": has_csv_data,
            "metrics": list(csv_metrics_summary.keys()) if csv_metrics_summary else None,
            "recordCount": len(csv_metrics),
        },
        "integrated": has_ga4_data and has_csv_data,
    }

    metric_definitions = None
    try:
        r = supabase.table("metric_definitions") \
            .select("*") \
            .eq("project_id", project_id) \
            .eq("is_active", True) \
            .order("priority") \
            .execute()
        if r.data:
            metric_definitions = r.data
            data_accessed.append("metric_definitions")
    except Exception:
        pass

    semantic_graph = None
    semantic_graph_data, graph_data_accessed = fetch_semantic_graph(supabase, project_id)
    if semantic_graph_data:
        semantic_graph = semantic_graph_data
        data_accessed.extend(graph_data_accessed)

    statistical_analysis = None
    if mode == "report" and (len(kpis) >= 7 or len(events) > 0):
        try:
            from app.langgraph.statistical_analysis import perform_statistical_analysis
            kpis_a = kpis if question_intent.get("need_ga4", True) else []
            events_a = events[:100] if question_intent.get("need_events", False) else []
            daily_a = daily_trend if question_intent.get("need_ga4", True) else []
            ch_a = channels[:50] if question_intent.get("need_channels", False) else None
            statistical_analysis = perform_statistical_analysis(
                kpis_data=kpis_a,
                events_data=events_a,
                daily_trends=daily_a,
                channels_data=ch_a,
            )
            if statistical_analysis:
                mc = statistical_analysis.get("metric_correlations", [])
                if mc:
                    statistical_analysis["metric_correlations"] = [
                        c for c in mc if c.get("correlation", {}).get("coefficient") is not None
                    ][:5]
                er = statistical_analysis.get("event_kpi_relationships", [])
                if er:
                    statistical_analysis["event_kpi_relationships"] = [
                        r for r in er if r.get("correlation", {}).get("coefficient") is not None
                    ][:5]
        except Exception:
            statistical_analysis = {
                "metric_correlations": [],
                "event_kpi_relationships": [],
                "causality_hints": [],
                "summary": "Statistical analysis unavailable",
            }

    mart_summary: MartSummary = {
        "period": {"start": start_str, "end": end_str, "days": days},
        "kpis": {
            "totalSessions": total_sessions,
            "totalActiveUsers": total_active_users,
            "totalNewUsers": total_new_users,
            "avgEngagementRate": round(avg_engagement_rate * 10000) / 100,
            "avgBounceRate": round(avg_bounce_rate * 10000) / 100,
            "avgSessionDuration": round(avg_session_duration),
        },
        "topChannels": top_channels if question_intent.get("need_channels", False) else [],
        "topPages": top_pages if question_intent.get("need_pages", False) else [],
        "dailyTrend": daily_trend if question_intent.get("need_ga4", True) else [],
        "csvMetrics": csv_metrics_summary if csv_metrics_summary else None,
        "integratedTrend": integrated_trend if (has_ga4_data and has_csv_data) else None,
        "dataSources": data_sources,
        "metricDefinitions": metric_definitions,
        "statisticalAnalysis": statistical_analysis,
        "semanticGraph": semantic_graph,
    }
    return mart_summary, data_accessed
