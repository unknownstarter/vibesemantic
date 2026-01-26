"""
LangGraph 프롬프트 생성
TypeScript에서 Python으로 포팅
"""

from typing import Optional, Literal, Dict, Any
from app.langgraph.types import WorkspacePurpose, ProjectProfile, MartSummary

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
    mode: Literal["report", "chat"] = "report"
) -> str:
    """시스템 프롬프트 생성"""
    lang_instructions = "모든 응답은 한국어로 작성합니다." if language == "ko" else "All responses must be in English."
    purpose_focus = PURPOSE_FOCUS.get(purpose, "")
    
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

## 데이터 규칙 (반드시 준수)
- 제공된 martSummary 데이터 범위 내에서만 분석합니다
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
        return f"""{base_context}

## 응답 포맷 (리포트 모드 - 자연스러운 문단 형식)

리포트는 **자연스러운 문단 형식**으로 작성하되, 다음 내용을 포함하세요:

### 리포트 구조
1. **요약**: 전체 기간의 핵심 지표 요약 (2-3문장, 자연스러운 문단)
2. **주요 발견사항**: 중요한 인사이트 3-5개 (자연스러운 문단으로 설명)
3. **상세 분석**: 
   - KPI 트렌드 분석 (질문과 관련된 경우만)
   - 채널별 성과 분석 (질문이 채널 관련인 경우만)
   - 페이지별 성과 분석 (질문이 페이지 관련인 경우만)
   - CSV 메트릭 분석 (질문이 CSV 관련인 경우만)
   - 통합 인사이트 (GA4 + CSV, 둘 다 있고 관련된 경우만)
4. **통계적 분석**: 상관관계, 인과관계 힌트 (있는 경우, 유의미한 결과만)
5. **제안**: 실행 가능한 액션 아이템 3-5개

### 작성 규칙
- **자연스러운 문단 형식**으로 작성하되, 데이터는 반드시 **마크다운 테이블**로 제시
- 마크다운 헤더(`##`)와 굵은 글씨(`**`) 활용
- 구체적인 수치 인용 (예: "**총 세션 1,234회**", "**Organic Search 45%**")
- **데이터 비교나 수치 제시 시 반드시 마크다운 테이블 사용**
  - 예시:
    ```
    | 채널 | 세션 | 비율 | 변화율 |
    |------|------|------|--------|
    | Organic Search | 1,234 | 45% | +15% |
    | Direct | 800 | 30% | -5% |
    ```
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
    
    # 채팅 모드
    return f"""{base_context}

## 응답 포맷 (채팅 모드 - 대화형)

### 질문 이해 및 데이터 추출 프로세스
1. **질문 분석**:
   - 사용자 질문의 핵심 키워드 파악 (예: "전환율", "채널", "페이지", "트렌드", "비교")
   - 질문 유형 분류: 비교/트렌드/원인분석/개선제안/수치조회
   - 시간 범위 확인 (특정 기간 언급 여부)
   - 세그먼트/필터 확인 (채널, 페이지, 사용자 유형 등)

2. **관련 데이터 추출**:
   - 질문과 직접 관련된 데이터만 선별 (전체 데이터 나열 금지)
   - 비교 질문이면 비교 대상 데이터 추출
   - 트렌드 질문이면 dailyTrend 데이터 활용
   - 채널 질문이면 topChannels 데이터 활용
   - 페이지 질문이면 topPages 데이터 활용
   - KPI 질문이면 kpis 데이터 활용
   - CSV 메트릭 질문이면 csvMetrics 또는 integratedTrend 활용

3. **데이터 기반 답변**:
   - 추출한 데이터의 구체적 수치 인용 (예: "Organic Search는 1,234세션으로 전체의 45%")
   - 추세나 패턴 설명 (예: "지난주 대비 15% 증가")
   - 원인 분석 (가능한 경우 데이터로 뒷받침)

4. **인사이트 질문 생성**:
   - 답변한 내용과 연관된 다음 단계 질문
   - 더 깊은 분석을 위한 질문 (예: "특정 채널의 전환율을 더 자세히 보고 싶으신가요?")
   - 비교/대조 질문 (예: "다른 기간과 비교해보시겠어요?")

### 답변 구조 (마크다운 형식 필수)
답변은 반드시 **마크다운 형식**으로 작성하세요. 리포트처럼 보기 좋게 구조화하세요.

**중요**: 데이터가 있는 경우 반드시 **마크다운 테이블**과 **그래프 설명**을 포함하세요.

#### 핵심 답변
질문에 대한 직접적이고 구체적인 답변 (2-3문장). **굵은 글씨**로 중요한 수치를 강조하세요.

#### 주요 데이터 (테이블 형식 필수)
- 관련 수치를 **마크다운 테이블**로 제시하세요
- 예시:
  ```
  | 지표 | 값 | 변화율 |
  |------|-----|--------|
  | 총 세션 | **1,234회** | +15% |
  | 신규 사용자 | **567명** | +8% |
  ```
- 데이터 소스 명시 (GA4/CSV/통합)
- 비교나 추세가 있으면 명확히 표시 (예: 지난주 대비 **15% 증가**)

#### 데이터 시각화
- 트렌드 데이터가 있으면 일별 추세를 설명하세요 (그래프로 표시됨)
- 채널별/페이지별 데이터가 있으면 비교 테이블로 제시하세요
- 통계적 상관관계가 발견되면 테이블로 정리하세요

#### 인사이트
데이터에서 발견된 패턴이나 주목할 점 (1-2개 bullet point)

#### 제안
데이터 기반의 실행 가능한 액션 (1-2개)
- **Impact**: 예상 효과
- **우선순위**: 높음/중간/낮음

### 질문 유형별 접근법
- **비교 질문** ("A vs B"): 반드시 **마크다운 테이블**로 두 항목의 수치를 나란히 제시하고 차이점 강조
  - 예시:
    ```
    | 항목 | A | B | 차이 |
    |------|---|---|------|
    | 세션 | 100 | 200 | +100% |
    ```
- **트렌드 질문** ("변화", "증가", "감소"): dailyTrend 데이터를 **테이블**로 제시하고 추세 설명
  - 추세를 명확히 표현 (예: "**지난주 대비 15% 증가**")
  - 일별 데이터가 있으면 상위 5-7일을 테이블로 제시
- **원인 분석** ("왜", "이유"): 가능한 데이터 기반 가설을 **테이블**로 정리하여 제시
  - 데이터로 뒷받침되는 원인만 제시
- **개선 제안** ("어떻게", "방법"): 데이터에서 발견된 문제점을 **테이블**로 정리하고 기반 제안
  - 구체적인 액션 아이템을 테이블로 제시
- **수치 조회** ("얼마", "몇"): 정확한 수치를 **테이블**로 정리하여 제공
  - **굵은 글씨**로 수치 강조

### 마크다운 사용 규칙
- **헤더**: `####` (h4) 사용하여 섹션 구분
- **굵은 글씨**: 중요한 수치나 키워드는 `**굵은 글씨**` 사용
- **테이블**: 데이터 비교나 수치 제시 시 반드시 마크다운 테이블 사용
  - 예시: `| 컬럼1 | 컬럼2 | 컬럼3 |`
- **리스트**: bullet point (`-`) 또는 번호 리스트 (`1.`) 사용
- **코드 블록**: 데이터 값이나 JSON은 `` `코드` `` 사용
- **구조화**: 섹션별로 명확하게 구분

### 금지 사항
- "질문 이해", "관련 데이터 추출", "구체적 답변", "유의미한 후속 질문" 같은 메타 구조 설명 금지
- 리포트 전체 내용 반복 금지
- 일반론적이고 뻔한 조언 금지
- 관련 없는 데이터 나열 금지
- 300단어 이상의 긴 답변 금지
- 데이터 없이 추측만 하는 답변 금지
- 번호 목록으로 구조를 설명하는 형태 금지 (예: "1. 질문 이해: ...")"""

def build_user_prompt(
    mode: Literal["report", "chat"],
    mart_summary: MartSummary,
    user_message: Optional[str] = None
) -> str:
    """사용자 프롬프트 생성"""
    import json
    
    summary_json = json.dumps(mart_summary, indent=2, ensure_ascii=False)
    data_sources_desc = get_data_sources_description(mart_summary)
    
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
        
        # 데이터 소스 요약 (간결하게)
        data_sources_list = []
        if mart_summary.get("dataSources", {}).get("ga4", {}).get("available"):
            data_sources_list.append("GA4")
        if mart_summary.get("dataSources", {}).get("csv", {}).get("available"):
            data_sources_list.append("CSV")
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

**중요**: 위 데이터 중 질문과 관련된 부분만 사용하세요. 관련 없는 데이터는 무시하세요.
{statistical_instruction}
위 데이터와 통계적 분석 결과를 기반으로 **자연스럽고 읽기 쉬운** 종합 분석 리포트를 작성해주세요.

**작성 지침:**
1. 자연스러운 문단 형식으로 작성 (과도한 구조화 금지)
2. 중요한 수치는 `**굵은 글씨**`로 강조
3. 데이터 소스는 자연스럽게 언급 (과도한 강조 금지)
4. 관련 없는 데이터는 절대 포함하지 마세요
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
    
    return f"""## 분석 데이터 ({start_date} ~ {end_date})
데이터 소스: {data_sources_desc}

**중요**: 위 데이터 중 질문과 직접 관련된 부분만 사용하세요. 관련 없는 데이터는 무시하세요.
{statistical_instruction}
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
