"""
LangGraph 프롬프트 생성
TypeScript에서 Python으로 포팅
토큰 절감: mart_summary 배열 크기 제한, JSON indent 없음.
"""

import copy
from typing import Optional, Literal, Dict, Any
from app.langgraph.types import WorkspacePurpose, ProjectProfile, MartSummary

# 토큰 절감: 프롬프트에 넣는 mart_summary 배열 상한
MAX_TREND_POINTS = 14
MAX_TOP_CHANNELS = 5
MAX_TOP_PAGES = 5
MAX_INTEGRATED_TREND = 14


def trim_mart_summary_for_prompt(mart_summary: MartSummary) -> MartSummary:
    """LLM 프롬프트용으로 배열 크기 제한 (토큰 절감)."""
    out = copy.deepcopy(mart_summary)
    if out.get("dailyTrend"):
        out["dailyTrend"] = out["dailyTrend"][:MAX_TREND_POINTS]
    if out.get("topChannels"):
        out["topChannels"] = out["topChannels"][:MAX_TOP_CHANNELS]
    if out.get("topPages"):
        out["topPages"] = out["topPages"][:MAX_TOP_PAGES]
    if out.get("integratedTrend"):
        out["integratedTrend"] = out["integratedTrend"][:MAX_INTEGRATED_TREND]
    return out


def clean_summary_for_prompt(mart_summary: MartSummary) -> dict:
    """실제 데이터가 없는 필드를 제거하여 LLM 혼동 방지.
    빈 GA4 필드(kpis 전부 0, topChannels=[], dailyTrend=[])가 남아 있으면
    LLM이 해당 차원을 채우려 환각할 수 있으므로 제거한다.
    """
    out = copy.deepcopy(mart_summary)
    ds = out.get("dataSources", {})
    has_ga4 = ds.get("ga4", {}).get("available", False)
    has_csv = ds.get("csv", {}).get("available", False)

    # GA4 데이터 없으면 GA4 전용 필드 제거 (전부 0인 kpis 포함)
    if not has_ga4:
        out.pop("kpis", None)
        out.pop("topChannels", None)
        out.pop("topPages", None)
        out.pop("dailyTrend", None)
    else:
        # GA4 있어도 빈 배열은 제거
        if not out.get("topChannels"):
            out.pop("topChannels", None)
        if not out.get("topPages"):
            out.pop("topPages", None)
        if not out.get("dailyTrend"):
            out.pop("dailyTrend", None)

    if not has_csv:
        out.pop("csvMetrics", None)

    if not (has_ga4 and has_csv):
        out.pop("integratedTrend", None)

    # statisticalAnalysis가 비어 있으면 제거
    sa = out.get("statisticalAnalysis")
    if sa and not sa.get("metric_correlations") and not sa.get("event_kpi_relationships"):
        out.pop("statisticalAnalysis", None)

    # None 값 제거
    out = {k: v for k, v in out.items() if v is not None}
    return out


def _get_available_data_description(mart_summary: MartSummary) -> str:
    """사용 가능/불가능한 데이터를 명시적으로 설명하여 LLM이 없는 데이터를 만들지 않게 한다."""
    ds = mart_summary.get("dataSources", {})
    has_ga4 = ds.get("ga4", {}).get("available", False)
    has_csv = ds.get("csv", {}).get("available", False)
    lines = []

    if has_ga4:
        lines.append("- GA4 데이터: 사용 가능 (세션, 유저, 참여도 등)")
    else:
        lines.append("- GA4 데이터: **없음** — 세션/유저/채널/페이지 GA4 지표 사용 불가")

    if mart_summary.get("topChannels"):
        lines.append(f"- 채널 데이터: 사용 가능 ({len(mart_summary['topChannels'])}개 채널)")
    else:
        lines.append("- 채널 데이터: **없음** — 채널별 분석·채널 비율·채널 테이블 작성 금지")

    if mart_summary.get("topPages"):
        lines.append(f"- 페이지 데이터: 사용 가능 ({len(mart_summary['topPages'])}개 페이지)")
    else:
        lines.append("- 페이지 데이터: **없음** — 페이지별 분석 작성 금지")

    csv_metrics = mart_summary.get("csvMetrics")
    csv_ds = ds.get("csv", {})
    csv_time_scope = csv_ds.get("timeScope", "7d")
    if csv_metrics:
        metric_names = list(csv_metrics.keys())
        lines.append(f"- CSV 데이터: 사용 가능 (메트릭: {', '.join(metric_names)})")
        if csv_time_scope == "none":
            lines.append("- **CSV는 기간 기준이 없는 집계 데이터입니다.** '최근 7일/30일'로 서술하지 말고, '업로드된 전체 집계'로만 서술하세요. 기간 기반 분석과 집계 데이터 분석을 섹션으로 구분할 것.")
        else:
            lines.append(f"- CSV 데이터는 선택한 기간(최근 {csv_time_scope.replace('d', '일')}) 기준으로 포함됨.")
    else:
        lines.append("- CSV 데이터: 없음")

    return "### 사용 가능한 데이터 (이 범위 밖의 차원·지표는 절대 언급 금지)\n" + "\n".join(lines)


def _get_purpose_focus(purpose: str, available_data_sources: Optional[Dict] = None) -> str:
    """워크스페이스 목적별 분석 초점. 실제 데이터 유무에 따라 조건부 생성."""
    ds = available_data_sources or {}
    has_ga4 = ds.get("ga4", {}).get("available", False)
    has_csv = ds.get("csv", {}).get("available", False)
    csv_metrics = ds.get("csv", {}).get("metrics", [])

    if purpose == "marketing":
        lines = []
        if has_ga4:
            lines.append("- 채널별 유입 효율성과 ROI에 집중")
            lines.append("- 캠페인/채널별 전환 성과 분석")
            lines.append("- 트래픽 소스의 품질 평가")
            lines.append("- 마케팅 예산 배분 최적화 관점")
        if has_csv:
            metrics_str = ', '.join(csv_metrics) if csv_metrics else '업로드된 메트릭'
            lines.append(f"- CSV 데이터 기반 지표 분석 ({metrics_str})")
        if not has_ga4 and has_csv:
            lines.append("- 채널/트래픽/페이지 데이터 없음 → 보유한 CSV 데이터 범위에서만 마케팅 성과 분석")
        if not has_ga4 and not has_csv:
            lines.append("- 분석 가능한 데이터가 없습니다")
        return "\n".join(lines)

    if purpose == "product":
        lines = []
        if has_ga4:
            lines.append("- 사용자 행동 패턴과 제품 사용성에 집중")
            lines.append("- 주요 페이지/기능별 참여도 분석")
            lines.append("- 사용자 여정과 이탈 포인트 파악")
            lines.append("- 신규 vs 기존 사용자 행동 차이")
        if has_csv:
            metrics_str = ', '.join(csv_metrics) if csv_metrics else '업로드된 메트릭'
            lines.append(f"- CSV 데이터 기반 지표 분석 ({metrics_str})")
        if not has_ga4 and has_csv:
            lines.append("- GA4 데이터 없음 → 보유한 CSV 데이터 범위에서만 제품 성과 분석")
        return "\n".join(lines) if lines else PURPOSE_FOCUS.get(purpose, "")

    # biz, sales 등은 기존 고정값 사용 (필요 시 확장)
    return PURPOSE_FOCUS.get(purpose, "")

# 목적별 분석 초점
PURPOSE_FOCUS = {
    "product": """
- 사용자 행동 패턴과 제품 사용성에 집중
- 주요 페이지/기능별 참여도 분석
- 사용자 여정과 이탈 포인트 파악
- 신규 vs 기존 사용자 행동 차이""",
    
    "marketing": """
- 채널별 유입 효율성과 ROI에 집중
- 캠페인/채널별 전환 성과 분석
- 트래픽 소스의 품질 평가
- 마케팅 예산 배분 최적화 관점""",
    
    "biz": """
- 비즈니스 KPI와 매출 연관성에 집중
- 성장 지표와 목표 대비 달성률
- 시장/경쟁 관점의 성과 해석
- 경영진 보고용 핵심 인사이트""",
    
    "sales": """
- 리드 생성과 전환에 집중
- 고객 획득 효율성 분석
- 영업 파이프라인 연계 지표
- 고가치 세그먼트 식별""",
}

def format_metrics_for_prompt(metric_definitions: list, max_count: int = 10) -> str:
    """메트릭 정의를 프롬프트 형식으로 변환"""
    if not metric_definitions:
        return "(정의된 메트릭 없음)"
    
    prioritized = sorted(
        [d for d in metric_definitions if d.get("is_active", True)],
        key=lambda x: x.get("priority", 3)
    )[:max_count]
    
    if not prioritized:
        return "(정의된 메트릭 없음)"
    
    lines = []
    for d in prioritized:
        category = f" [{d['category']}]" if d.get("category") else ""
        lines.append(f"- {d.get('display_name', d['name'])}: {d.get('description', d['name'])}{category}")
    
    return "\n".join(lines)

def build_system_prompt(
    language: Literal["ko", "en"],
    purpose: WorkspacePurpose,
    profile: ProjectProfile,
    metric_definitions: Optional[list] = None,
    mode: Literal["report", "chat"] = "report",
    available_data_sources: Optional[Dict[str, Any]] = None,
) -> str:
    """시스템 프롬프트 생성. available_data_sources로 실제 데이터 유무에 따라 분석 초점과 가드를 조정."""
    lang_instructions = "모든 응답은 한국어로 작성합니다." if language == "ko" else "All responses must be in English."
    purpose_focus = _get_purpose_focus(purpose, available_data_sources)
    
    # Metric definitions 섹션 생성
    metrics_section = ""
    if metric_definitions and len(metric_definitions) > 0:
        metrics_section = f"""
## 프로젝트별 메트릭 정의 (Semantic Layer)
이 프로젝트에서 사용 가능한 주요 지표들:
{format_metrics_for_prompt(metric_definitions, 10)}

**중요**: 사용자 질문이나 분석 시 위 메트릭 정의를 우선적으로 참고하세요.
- 메트릭 이름, 동의어, 예시 질문을 활용하여 사용자 의도를 정확히 파악
- 정의된 메트릭이 있으면 해당 메트릭을 사용하여 분석
- 정의되지 않은 메트릭은 일반적인 용어로 해석하되, 가능하면 정의된 메트릭과 연결"""
    
    base_context = f"""당신은 {profile.get('serviceName', '서비스')}의 데이터 분석 전문가입니다.
{lang_instructions}

## 서비스 정보
- 서비스명: {profile.get('serviceName', '(미설정)')}
- 설명: {profile.get('serviceDescription', '(미설정)')}
- 타겟 사용자: {profile.get('targetAudience', '(미설정)')}
- 산업: {profile.get('industry', '(미설정)')}
- 목표: {', '.join(profile.get('goals', []) or []) or '(미설정)'}
- 핵심 KPI: {', '.join(profile.get('kpis', []) or []) or '(미설정)'}
{metrics_section}

## 분석 초점 ({purpose})
{purpose_focus}

## 데이터 규칙 (반드시 준수 — 위반 시 환각/거짓)
- 제공된 martSummary JSON에 포함된 데이터만 사용합니다
- **martSummary에 없는 필드·차원·지표는 절대 언급하거나 수치를 만들지 않습니다**
- **topChannels 필드가 없거나 빈 배열이면 채널 분석(유기검색, 직접유입, 소셜 등)을 하지 않습니다**
- **topPages 필드가 없거나 빈 배열이면 페이지별 분석을 하지 않습니다**
- **kpis 필드가 없으면 GA4 KPI(세션, 유저, 참여율 등) 분석을 하지 않습니다**
- **csvMetrics만 있고 GA4 필드가 없으면 CSV 메트릭만 분석합니다**
- 숫자를 추정하거나 날조하지 않습니다
- 불확실한 내용은 "데이터로 확인 필요"라고 명시합니다
- dataSources.integrated가 true이면 GA4와 CSV 데이터 통합 분석
- metricDefinitions가 제공되면 해당 메트릭 정의를 우선적으로 활용
- statisticalAnalysis가 제공되면 통계적 상관관계와 인과관계 힌트를 활용하여 더 깊이 있는 분석 제공

## 통계 분석 활용 가이드
- statisticalAnalysis.metric_correlations: 지표 간 상관관계 분석 결과
- statisticalAnalysis.event_kpi_relationships: 이벤트와 KPI 간 관계 분석
- statisticalAnalysis.causality_hints: 잠재적 인과관계 힌트 (실험적 검증 필요)
- 상관관계는 인과관계를 의미하지 않으므로, 통계적 힌트를 제시할 때는 "상관관계가 발견되었으나 인과관계는 실험으로 검증 필요"라고 명시

## 언어 일관성
- {'한국어' if language == 'ko' else 'English'}로만 응답"""
    
    # 리포트 모드
    if mode == "report":
        ds = available_data_sources or {}
        has_ga4 = ds.get("ga4", {}).get("available", False)
        has_csv = ds.get("csv", {}).get("available", False)
        # P1-5: 데이터 소스 적응형 리포트 구조
        if has_csv and not has_ga4:
            report_structure = """
### 리포트 구조 (CSV 전용 — 채널/페이지 섹션 금지)
1. **요약**: 전체 기간 핵심 지표 요약 (2-3문장)
2. **시계열 트렌드**: csvMetrics의 trend 데이터로 일별 추세 설명
3. **지표 요약 및 파생 지표**: csvMetrics total, derivedMetrics(비율 등) 활용
4. **제안**: 실행 가능한 액션 3-5개
5. **Analyst Questions**: 최소 3개"""
        elif has_ga4 and not has_csv:
            report_structure = """
### 리포트 구조 (GA4 전용)
1. **요약**: 핵심 지표 요약 (2-3문장)
2. **주요 발견사항**: 인사이트 3-5개
3. **상세 분석**: KPI 트렌드, 채널별 성과, 페이지별 성과 (데이터 있는 항목만)
4. **통계적 분석**: 상관관계/인과관계 힌트 (있는 경우만)
5. **제안**: 액션 3-5개
6. **Analyst Questions**: 최소 3개"""
        elif has_ga4 and has_csv:
            report_structure = """
### 리포트 구조 (GA4 + CSV 통합)
1. **요약**: 통합 핵심 지표 요약
2. **주요 발견사항**: GA4·CSV 연계 인사이트 3-5개
3. **상세 분석**: 트렌드, 채널/페이지(GA4), CSV 메트릭·파생 지표, 통합 인사이트 (데이터 있는 항목만)
4. **통계적 분석**: (있는 경우만)
5. **제안**: 액션 3-5개
6. **Analyst Questions**: 최소 3개"""
        else:
            report_structure = """
### 리포트 구조
1. **요약**: 핵심 지표 요약
2. **주요 발견사항**: 인사이트 3-5개
3. **상세 분석**: martSummary에 있는 데이터 범위에서만
4. **제안**: 액션 3-5개
5. **Analyst Questions**: 최소 3개"""

        return f"""{base_context}

## 응답 포맷 (리포트 모드 - 자연스러운 문단 형식)

리포트는 **자연스러운 문단 형식**으로 작성하되, 데이터 소스에 맞는 구조만 사용하세요.
{report_structure}

### 작성 규칙
- **자연스러운 문단 형식**으로 작성하되, 데이터는 반드시 **마크다운 테이블**로 제시
- 마크다운 헤더(`##`)와 굵은 글씨(`**`) 활용
- 구체적인 수치 인용 (예: "**총 1,234회**", "**전환율 15%**")
- **데이터 비교나 수치 제시 시 반드시 마크다운 테이블 사용**
  - 예시:
    ```
    | 지표 | 값 | 변화율 |
    |------|-----|--------|
    | 총 세션 | 1,234 | +15% |
    | 전환율 | 8.5% | -2% |
    ```
- **martSummary에 없는 차원(채널, 페이지 등)의 테이블은 절대 만들지 않습니다**
- 추세 설명 시 변화율 포함 (예: "지난주 대비 **15% 증가**")
- **통계적 분석 결과가 있으면 반드시 포함** (상관관계, 인과관계 힌트)
  - 통계적 상관관계는 테이블로 정리하여 제시
- 상관관계 발견 시 "상관관계가 발견되었으나 인과관계는 실험으로 검증 필요" 명시
- **관련 없는 데이터는 절대 포함하지 마세요** (예: GA4 질문에 CSV 데이터 사용 금지)
- 불필요한 JSON 구조나 메타 설명 금지
- **매번 다른 관점과 인사이트를 제공하세요** (같은 데이터라도 다른 해석과 제안)

### Analyst Questions 생성 (최소 3개 필수)
- **반드시 최소 3개의 질문을 생성하세요**
- 질문은 반드시 "?" 로 끝나는 완전한 문장
- 분석 컨텍스트(추세/채널/페이지) 인용 필수
- **통계적 분석 결과가 있으면 이를 기반으로 질문 생성**
  - 상관관계 발견 시: "X와 Y의 상관관계가 실제로 인과관계인지 검증해볼까요?"
  - 이벤트-KPI 관계 발견 시: "이벤트 A가 KPI B에 미치는 영향을 더 자세히 분석해볼까요?"
- 질문 유형 다양화:
  1. 통계적 인사이트 기반 질문 (상관관계, 인과관계)
  2. 트렌드/추세 관련 질문
  3. 채널/페이지 성과 관련 질문
  4. 개선/최적화 관련 질문
- Quick Reply, next_params 작성 금지 (시스템이 자동 생성)"""
    
    # 채팅 모드 (P1-4: 경량화 — 핵심 규칙만, 모순 제거)
    return f"""{base_context}

## 응답 포맷 (채팅 모드 - 대화형)

### Chat 모드 핵심 규칙 (반드시 준수)
- **답변 길이**: 300단어 이내. 한두 문단 + 핵심 수치만.
- **후속 질문**: 정확히 2~3개만. "다음에 볼 만한 질문" 형태로 끝에 나열.
- **리포트 형식 금지**: 긴 섹션·여러 테이블·보고서 스타일 금지. 대화형 한두 문단 + 반문만.
- **데이터**: martSummary JSON에 있는 데이터만 사용. 수치는 **마크다운 테이블**과 **굵은 글씨**로 제시. 데이터 소스(GA4/CSV)에 맞는 항목만 언급.

### 답변 형식
- 질문에 맞는 데이터만 선별 (dailyTrend/topChannels/topPages/kpis/csvMetrics — 있는 것만).
- 핵심 답변 2-3문장 + 필요 시 테이블 한 개 + 후속 질문 2-3개.
- 마크다운: `##`·`**수치**`·`| 컬럼 | 값 |` 테이블 사용.

### 금지 사항
- "질문 이해", "관련 데이터 추출" 등 메타 설명 금지. 번호 목록으로 구조 설명 금지.
- 리포트 스타일·300단어 초과·후속 질문 3개 초과 금지.
- martSummary에 없는 차원·지표 언급 금지. 데이터 없이 추측 금지."""

def build_user_prompt(
    mode: Literal["report", "chat"],
    mart_summary: MartSummary,
    user_message: Optional[str] = None,
    chart_context: Optional[Dict[str, Any]] = None,
) -> str:
    """사용자 프롬프트 생성. 토큰 절감: trim + clean + indent 없음. 실제 데이터(summary_json)를 반드시 포함."""
    import json
    trimmed = trim_mart_summary_for_prompt(mart_summary)
    cleaned = clean_summary_for_prompt(trimmed)
    summary_json = json.dumps(cleaned, ensure_ascii=False)
    data_sources_desc = get_data_sources_description(mart_summary)
    available_data_desc = _get_available_data_description(mart_summary)
    
    period = mart_summary.get("period", {})
    start_date = period.get("start", "")
    end_date = period.get("end", "")
    days = period.get("days", 0)
    
    if mode == "report":
        integrated_note = ""
        if mart_summary.get("dataSources", {}).get("integrated"):
            integrated_note = "특히 GA4와 CSV 데이터 간의 상관관계와 통합 인사이트에 주목하세요."
        
        # 통계 분석 섹션 추가
        statistical_section = ""
        statistical_analysis = mart_summary.get("statisticalAnalysis")
        if statistical_analysis:
            stat_summary = statistical_analysis.get("summary", "")
            metric_corrs = statistical_analysis.get("metric_correlations", [])
            event_relationships = statistical_analysis.get("event_kpi_relationships", [])
            causality_hints = statistical_analysis.get("causality_hints", [])
            
            if stat_summary or metric_corrs or event_relationships:
                statistical_section = f"""
## 통계적 분석 결과
{stat_summary}

"""
                if metric_corrs:
                    top_corrs = metric_corrs[:3]
                    statistical_section += "### 주요 지표 상관관계\n"
                    for corr in top_corrs:
                        metric1 = corr.get("metric1", "")
                        metric2 = corr.get("metric2", "")
                        corr_data = corr.get("correlation", {})
                        coefficient = corr_data.get("coefficient")
                        if coefficient is None:
                            continue
                        strength = corr_data.get("strength", "")
                        significant = corr_data.get("significant", False)
                        statistical_section += f"- {metric1} ↔ {metric2}: {strength} 상관관계 (r={coefficient:.3f}, {'유의함' if significant else '유의하지 않음'})\n"
                    statistical_section += "\n"
                
                if event_relationships:
                    top_rels = event_relationships[:3]
                    statistical_section += "### 이벤트-KPI 관계\n"
                    for rel in top_rels:
                        event_name = rel.get("event_name", "")
                        kpi_metric = rel.get("kpi_metric", "")
                        corr_data = rel.get("correlation", {})
                        coefficient = corr_data.get("coefficient")
                        if coefficient is None:
                            continue
                        strength = corr_data.get("strength", "")
                        significant = corr_data.get("significant", False)
                        statistical_section += f"- {event_name} ↔ {kpi_metric}: {strength} 상관관계 (r={coefficient:.3f}, {'유의함' if significant else '유의하지 않음'})\n"
                    statistical_section += "\n"
                
                if causality_hints:
                    statistical_section += "### 잠재적 인과관계 힌트\n"
                    statistical_section += "⚠️ 주의: 상관관계는 인과관계를 의미하지 않습니다. 아래 힌트는 통계적 패턴이며, 실제 인과관계는 A/B 테스트나 실험으로 검증해야 합니다.\n\n"
                    for hint in causality_hints[:3]:
                        metric1 = hint.get("metric1", "")
                        metric2 = hint.get("metric2", "")
                        statistical_section += f"- {metric1} → {metric2} 가능성 (검증 필요)\n"
                    statistical_section += "\n"
        
        # 데이터 소스 요약 (간결하게) + CSV timeScope 반영
        data_sources_list = []
        if mart_summary.get("dataSources", {}).get("ga4", {}).get("available"):
            data_sources_list.append("GA4(기간 기준)")
        csv_ds = mart_summary.get("dataSources", {}).get("csv", {})
        if csv_ds.get("available"):
            ts = csv_ds.get("timeScope", "7d")
            if ts == "none":
                data_sources_list.append("CSV(집계, 기간 무관)")
            else:
                data_sources_list.append(f"CSV(최근 {ts.replace('d', '일')})")
        data_sources_str = " + ".join(data_sources_list) if data_sources_list else "데이터 없음"
        
        # 통계 분석이 있고 유의미한 결과가 있을 때만 포함
        statistical_instruction = ""
        if statistical_section and statistical_section.strip():
            statistical_instruction = f"""
{statistical_section}

**통계 분석 활용:**
- 위 통계적 분석 결과를 반드시 리포트에 포함하세요.
- 상관관계 발견 시 "상관관계가 발견되었으나 인과관계는 실험으로 검증 필요"라고 명시하세요.
- 통계적 근거를 제시하여 분석의 깊이를 더하세요.
"""
        
        return f"""## 분석 데이터 ({start_date} ~ {end_date}, {days}일)
데이터 소스: {data_sources_str}

{available_data_desc}

## martSummary (분석 대상 데이터 — 이 JSON에 있는 데이터만 사용할 것)
```json
{summary_json}
```

**중요**: 위 martSummary JSON에 포함된 필드와 수치만 사용하세요. JSON에 없는 차원(채널, 페이지 등)이나 지표는 절대 언급하지 마세요.
{statistical_instruction}
위 martSummary 데이터를 기반으로 **자연스럽고 읽기 쉬운** 종합 분석 리포트를 작성해주세요.

**작성 지침:**
1. 자연스러운 문단 형식으로 작성 (과도한 구조화 금지)
2. 중요한 수치는 `**굵은 글씨**`로 강조
3. **기간 기준이 있는 데이터(GA4, CSV timeScope 7d/30d)와 기간 기준이 없는 데이터(CSV timeScope none)를 섹션으로 구분**하여 서술할 것. CSV가 집계(기간 무관)이면 "아래 CSV 집계 데이터는 기간 기준이 없습니다"라고 명시할 것.
4. **martSummary에 없는 데이터는 절대 포함하지 마세요** (환각/거짓 금지)
5. 통계적 분석 결과가 있으면 반드시 활용하세요

**응답 형식:**
- 자연스러운 문단 형식
- 섹션 구분은 `##` (h2) 사용
- 중요한 수치는 `**굵은 글씨**` 사용
- 데이터 비교나 수치 제시 시 반드시 마크다운 테이블 사용
- 불필요한 JSON 구조나 메타 설명 금지

**Analyst Questions 섹션 (반드시 포함):**
리포트 끝에 다음 형식으로 최소 3개의 질문을 포함하세요:

## Analyst Questions

1. [통계적 분석 결과를 기반으로 한 질문] (예: "X와 Y의 상관관계가 실제로 인과관계인지 검증해볼까요?")
2. [트렌드/추세 관련 질문] (예: "이번 기간 가장 큰 변화는 무엇인가요?")
3. [채널/페이지 성과 관련 질문] (예: "주요 채널별 성과를 비교해볼까요?")

통계적 분석 결과가 있으면 반드시 이를 기반으로 질문을 생성하세요."""
    
    # 통계 분석 섹션 추가 (채팅 모드)
    statistical_section = ""
    statistical_analysis = mart_summary.get("statisticalAnalysis")
    if statistical_analysis:
        stat_summary = statistical_analysis.get("summary", "")
        if stat_summary and stat_summary != "No significant statistical patterns found":
            statistical_section = f"""
## 통계적 분석 결과 (참고용)
{stat_summary}

통계적 분석 결과를 활용하여 질문에 답변할 때 지표 간 관계나 이벤트의 영향을 고려하세요.
"""
    
    # 통계 분석이 있고 유의미한 결과가 있을 때만 포함
    statistical_instruction = ""
    if statistical_section and statistical_section.strip():
        statistical_instruction = f"""
{statistical_section}

**통계 분석 활용:**
- 위 통계적 분석 결과를 답변에 반드시 포함하세요.
- 상관관계나 인과관계 언급 시 통계적 근거를 제시하세요.
"""
    
    chart_context_block = ""
    if chart_context and (chart_context.get("label") or chart_context.get("chartType") or chart_context.get("metricNames")):
        parts = []
        if chart_context.get("label"):
            parts.append(f"설명: {chart_context['label']}")
        if chart_context.get("chartType"):
            parts.append(f"차트 유형: {chart_context['chartType']}")
        if chart_context.get("metricNames"):
            parts.append(f"메트릭: {', '.join(chart_context['metricNames'])}")
        chart_context_block = f"""
## 선택한 차트/메트릭 컨텍스트 (Epic 5.2)
사용자가 대시보드에서 "이 숫자에 대해 물어보기"를 선택했습니다. 답변 시 이 컨텍스트를 반드시 참고하세요.
{chr(10).join(parts)}
"""
    return f"""## 분석 데이터 ({start_date} ~ {end_date})
데이터 소스: {data_sources_desc}

{available_data_desc}

## martSummary (분석 대상 데이터 — 이 JSON에 있는 데이터만 사용할 것)
```json
{summary_json}
```

**중요**: 위 martSummary JSON에 포함된 필드와 수치만 사용하세요. JSON에 없는 차원이나 지표는 절대 언급하지 마세요.
{statistical_instruction}
{chart_context_block}
## 사용자 질문
**"{user_message}"**

### 답변 작성 지시사항

위 질문에 대해 **자연스럽고 읽기 쉬운** 마크다운 형식으로 답변하세요.

**핵심 규칙:**
1. 질문과 관련된 데이터만 사용 (예: GA4 질문에는 CSV 데이터 사용 금지)
2. 통계적 분석 결과가 있으면 반드시 활용
3. 자연스러운 문단 형식으로 작성 (과도한 구조화 금지)
4. 중요한 수치는 `**굵은 글씨**`로 강조

**답변 형식 (예시):**

최근 기간 동안 **신규 유입자는 0명**입니다. 총 세션은 4회, 활성 사용자는 3명으로 기록되었습니다.

**주요 지표:**
| 지표 | 값 | 변화율 |
|------|-----|--------|
| 총 세션 | **4회** | - |
| 활성 사용자 | **3명** | - |
| 신규 사용자 | **0명** | - |

신규 사용자 유입이 없는 상태로, 기존 사용자만 재방문하고 있습니다. 세션 수가 적어 서비스 초기 단계로 보입니다.

**제안:**
- 채널별 유입 분석을 통해 신규 사용자 유입 경로 확인
- 다른 기간과 비교하여 유입 패턴 변화 분석

**중요**: 데이터가 있는 경우 반드시 마크다운 테이블을 사용하여 수치를 제시하세요.

**금지 사항:**
- "질문 이해", "관련 데이터 추출" 같은 메타 설명
- 번호 목록으로 구조 설명 (예: "1. 질문 이해: ...")
- 관련 없는 데이터 나열
- 과도한 구조화 (자연스러운 문단 선호)"""

def filter_relevant_data_for_question(
    mart_summary: MartSummary,
    user_message: Optional[str]
) -> Dict[str, Any]:
    """
    Filter mart_summary to include only data relevant to the question
    
    Args:
        mart_summary: Full mart summary
        user_message: User's question
        
    Returns:
        Filtered summary with only relevant data
    """
    if not user_message:
        return mart_summary
    
    user_lower = user_message.lower()
    filtered = {}
    
    # Check if question mentions CSV-related terms
    csv_keywords = ["csv", "매출", "revenue", "수익", "profit", "주문", "order", "구매", "purchase", "외부"]
    mentions_csv = any(kw in user_lower for kw in csv_keywords)
    
    # Check if question mentions GA4-related terms
    ga4_keywords = ["ga4", "analytics", "세션", "session", "유입", "acquisition", "채널", "channel"]
    mentions_ga4 = any(kw in user_lower for kw in ga4_keywords)
    
    # If question mentions CSV but not GA4, exclude GA4 data
    if mentions_csv and not mentions_ga4:
        # Keep only CSV-related data
        filtered = {
            "period": mart_summary.get("period"),
            "csvMetrics": mart_summary.get("csvMetrics"),
            "dataSources": {
                "csv": mart_summary.get("dataSources", {}).get("csv", {}),
                "ga4": {"available": False},
                "integrated": False,
            },
            "statisticalAnalysis": mart_summary.get("statisticalAnalysis"),
        }
    # If question mentions GA4 but not CSV, exclude CSV data
    elif mentions_ga4 and not mentions_csv:
        # Keep only GA4-related data
        filtered = {
            "period": mart_summary.get("period"),
            "kpis": mart_summary.get("kpis"),
            "topChannels": mart_summary.get("topChannels"),
            "topPages": mart_summary.get("topPages"),
            "dailyTrend": mart_summary.get("dailyTrend"),
            "dataSources": {
                "ga4": mart_summary.get("dataSources", {}).get("ga4", {}),
                "csv": {"available": False},
                "integrated": False,
            },
            "statisticalAnalysis": mart_summary.get("statisticalAnalysis"),
        }
    else:
        # Keep all data (question mentions both or neither)
        filtered = mart_summary
    
    return filtered


def get_data_sources_description(mart_summary: MartSummary) -> str:
    """데이터 소스 설명 생성 (간결하게)"""
    data_sources = mart_summary.get("dataSources", {})
    sources = []
    
    if data_sources.get("ga4", {}).get("available"):
        sources.append("GA4")
    if data_sources.get("csv", {}).get("available"):
        sources.append("CSV")
    
    if not sources:
        return "데이터 소스: 없음"
    
    return f"데이터 소스: {' + '.join(sources)}"
    ds = mart_summary.get("dataSources")
    if not ds:
        return ""
    
    parts = []
    
    if ds.get("ga4", {}).get("available"):
        record_count = ds["ga4"].get("recordCount", 0)
        parts.append(f"- **GA4 데이터**: 세션, 유저, 채널, 페이지 정보 포함 ({record_count}개 레코드)")
    
    if ds.get("csv", {}).get("available") and ds["csv"].get("metrics"):
        metrics = ", ".join(ds["csv"]["metrics"])
        record_count = ds["csv"].get("recordCount", 0)
        parts.append(f"- **CSV 커스텀 데이터**: {metrics} ({record_count}개 레코드)")
    
    if ds.get("integrated"):
        parts.append("- **통합 분석**: GA4와 CSV 데이터가 날짜 기준으로 연결되어 있습니다. integratedTrend에서 확인하세요.")
    
    if not parts:
        return ""
    
    return f"""
### 사용 가능한 데이터 소스
{chr(10).join(parts)}"""
