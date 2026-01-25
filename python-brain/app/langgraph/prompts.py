"""
LangGraph 프롬프트 생성
TypeScript에서 Python으로 포팅
"""

from typing import Optional, Literal
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

## 언어 일관성
- {'한국어' if language == 'ko' else 'English'}로만 응답"""
    
    # 리포트 모드
    if mode == "report":
        return f"""{base_context}

## 응답 포맷 (리포트 모드 - 고정 포맷 필수)
반드시 아래 섹션을 포함하세요:

#### Key Insights
- 2~3개의 핵심 발견사항 (bullet point)

#### Critical Issues
- 즉시 주의가 필요한 문제점 (있는 경우만)

#### Recommended Actions
각 액션에 다음을 포함:
- **Impact**: 예상 효과
- **Cost**: 필요 리소스/비용
- **Duration**: 예상 소요 기간

#### Analyst Questions
(질문만 간단히 작성 - Quick Reply는 시스템이 자동 생성)
1. [질문 1]?
2. [질문 2]?

### 질문 생성 규칙
- 질문은 반드시 "?" 로 끝나는 완전한 문장
- 분석 컨텍스트(추세/채널/페이지) 인용 필수
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

#### 핵심 답변
질문에 대한 직접적이고 구체적인 답변 (2-3문장). **굵은 글씨**로 중요한 수치를 강조하세요.

#### 주요 데이터
- 관련 수치를 구체적으로 인용 (예: **총 세션 1,234회**, **신규 사용자 567명**)
- 데이터 소스 명시 (GA4/CSV/통합)
- 비교나 추세가 있으면 명확히 표시 (예: 지난주 대비 **15% 증가**)

#### 인사이트
데이터에서 발견된 패턴이나 주목할 점 (1-2개 bullet point)

#### 제안
데이터 기반의 실행 가능한 액션 (1-2개)
- **Impact**: 예상 효과
- **우선순위**: 높음/중간/낮음

### 질문 유형별 접근법
- **비교 질문** ("A vs B"): 두 항목의 수치를 나란히 제시하고 차이점 강조
  - 마크다운 테이블이나 bullet point로 비교
- **트렌드 질문** ("변화", "증가", "감소"): dailyTrend 데이터로 추세 설명
  - 추세를 명확히 표현 (예: "**지난주 대비 15% 증가**")
- **원인 분석** ("왜", "이유"): 가능한 데이터 기반 가설 제시
  - 데이터로 뒷받침되는 원인만 제시
- **개선 제안** ("어떻게", "방법"): 데이터에서 발견된 문제점 기반 제안
  - 구체적인 액션 아이템으로 제시
- **수치 조회** ("얼마", "몇"): 정확한 수치와 컨텍스트 제공
  - **굵은 글씨**로 수치 강조

### 마크다운 사용 규칙
- **헤더**: `####` (h4) 사용하여 섹션 구분
- **굵은 글씨**: 중요한 수치나 키워드는 `**굵은 글씨**` 사용
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
        
        return f"""## 분석 데이터 ({start_date} ~ {end_date}, {days}일)
{data_sources_desc}

```json
{summary_json}
```

위 데이터를 기반으로 종합 분석 리포트를 작성해주세요.
{integrated_note}
응답 포맷을 반드시 준수하세요."""
    
    return f"""## 분석 데이터 ({start_date} ~ {end_date})
{data_sources_desc}

```json
{summary_json}
```

## 사용자 질문
**"{user_message}"**

### 답변 작성 지시사항

위 질문에 대해 **마크다운 형식**으로 답변하세요. 리포트처럼 보기 좋게 구조화하되, 질문에 대한 핵심 답변만 제공하세요.

**답변 형식 예시:**

```markdown
#### 답변
최근 기간(2026-01-18 ~ 2026-01-25) 동안 **신규 유입자는 0명**입니다. (GA4 데이터 기준)

#### 주요 데이터
- **총 세션**: 4회
- **총 활성 사용자**: 3명
- **신규 사용자**: 0명
- 데이터 소스: GA4

#### 인사이트
- 신규 사용자 유입이 없는 상태입니다. 기존 사용자만 재방문하고 있습니다.
- 세션 수가 적어 테스트 단계로 보입니다.

#### 제안
- 채널별 유입 분석을 통해 신규 사용자 유입 경로를 확인해보세요.
- 다른 기간과 비교하여 유입 패턴 변화를 확인해보세요.
```

**중요 규칙:**
- "질문 이해", "관련 데이터 추출" 같은 메타 설명 금지
- 번호 목록으로 구조를 설명하는 형태 금지 (예: "1. 질문 이해: ...")
- 리포트 전체를 반복하지 말고, 질문에 대한 핵심 답변만 제공
- 마크다운 헤더(`####`), 굵은 글씨(`**`), bullet point(`-`)를 활용하여 가독성 높게 작성
- 구체적인 수치를 **굵은 글씨**로 강조"""

def get_data_sources_description(mart_summary: MartSummary) -> str:
    """데이터 소스 설명 생성"""
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
