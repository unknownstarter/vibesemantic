# 문제 상황: CSV 전용 데이터인데 리포트에 실제 데이터와 무관한 내용(환각) 포함

**작성일**: 2026-02-01  
**상태**: 문제 정리 (원인 추정 및 확인 대상 파일 정리, 구현 없음)

---

## 1. 문제 상황

### 1.1 입력 데이터 (실제)

- **데이터 소스**: 단순 CSV 파일 하나만 업로드
- **파일 예시**: "myleads - 시트1"
- **컬럼**: `Date`, `Sessions`, `Leads` (3개만 존재)
- **데이터**: 2026-01-01 ~ 2026-01-10, 일별 Sessions·Leads 숫자만 존재 (예: 100/10, 200/30, 300/25 …)
- **채널·유입 경로·페이지 등**: **전혀 없음**

### 1.2 생성된 리포트 (문제)

- **워크스페이스**: "마케팅 분석" (Marketing)으로 리포트 생성
- **리포트 내용**:
  - "유기적 검색(Organic Search) 45%", "직접 유입(Direct) 30%", "소셜 미디어(Social Media) 10%" 등 **채널별 비율·변화율** 기술
  - 채널별 성과 테이블 (세션, 비율, 변화율)
  - "유기검색과 전환율 상관", "SEO 전략", "직접 유입 5% 감소" 등 **통계·해석**
- **문제점**: 위 내용은 **업로드한 CSV에 없는 차원(채널)과 지표**를 근거 없이 만들어 낸 것으로, **실제 데이터와 무관한 거짓말(환각)** 이다. CSV에는 Date·Sessions·Leads만 있으므로 채널·비율·변화율을 계산할 수 없다.

### 1.3 기대 동작

- CSV에 **Date, Sessions, Leads**만 있으면, 리포트는 **해당 기간·Sessions·Leads·파생 지표(예: 전환율)** 만 사용해 요약·트렌드·권고를 해야 한다.
- 채널·유입 경로·페이지 등 **데이터에 없는 차원**은 리포트에 포함하지 않거나, "채널 데이터가 없습니다" 등으로 명시해야 한다.

---

## 2. 원인으로 추정되는 부분

### 2.1 워크스페이스 목적(purpose)에 따른 고정 플랜

- **마케팅** 워크스페이스일 때, **need_channels = True**, **need_ga4 = True** 로 고정되는 로직이 있음.
- 따라서 **CSV만 넣은 프로젝트**여도 "마케팅 분석"이면 GA4·채널 데이터가 있다고 가정하고, MartSummary를 만들거나 프롬프트가 "채널별 성과"를 요구할 가능성이 있음.
- **확인 대상**: `data_source_selector.py` — `workspace_purpose == "marketing"` 일 때의 기본값(need_ga4, need_channels) 및 report 모드에서 question_intent가 어떻게 세팅되는지.

### 2.2 MartSummary 구조가 GA4/채널 중심

- Summary 빌더가 **mart_ga4_***, **mart_ga4_channel_daily** 등을 조회하고, **topChannels**, **dailyTrend** 등을 GA4 기준으로 채움.
- **CSV 전용** 프로젝트에서는 mart_ga4_*·mart_ga4_channel_daily가 비어 있을 수 있는데, 이때 **topChannels가 빈 배열**로 넘어가도, **프롬프트**가 "채널별 성과를 분석해라"라고만 하면 LLM이 **데이터 없이 채널 숫자를 지어낼(환각)** 가능성이 큼.
- **확인 대상**: `summary_builder.py` — CSV만 있을 때 어떤 MartSummary가 만들어지는지, topChannels/dailyTrend가 비어 있으면 프롬프트에 어떻게 전달되는지. `prompts.py` — report용 시스템/유저 프롬프트에서 "채널", "topChannels", "유기검색" 등 언급 여부 및, **데이터가 없을 때** 채널 섹션을 쓰지 말라고 명시하는지.

### 2.3 리포트용 프롬프트가 “마케팅 리포트 템플릿”을 강하게 유도

- 시스템/유저 프롬프트에 "채널별 성과", "유기검색·직접유입·소셜" 등 **고정된 마케팅 리포트 구조**가 들어 있으면, 실제 MartSummary에 채널 데이터가 없어도 LLM이 그 구조를 채우기 위해 **허구의 수치**를 생성할 수 있음.
- **확인 대상**: `prompts.py` — report 모드의 시스템 프롬프트·유저 프롬프트, "채널", "topChannels", "dailyTrend" 사용 방식, 그리고 **"데이터에 없는 차원은 기술하지 말 것"** 같은 가드라인 존재 여부.

### 2.4 CSV → Mart 반영 후에도 “데이터 소스 구분”이 프롬프트까지 전달되지 않음

- CSV ingest 결과가 **mart_csv_daily_metrics** 또는 **mart_events** 등에만 있고, **mart_ga4_*** 는 비어 있는 경우, "이 프로젝트는 CSV만 있다"는 정보가 planner/summary/prompt 단계까지 명시적으로 전달되지 않을 수 있음.
- 그 결과 planner가 need_ga4/need_channels를 True로 두고, summary가 GA4 테이블을 조회(결과 빈 배열)한 뒤, 프롬프트에는 "채널 데이터 없음"이 강하게 드러나지 않아 LLM이 환각할 수 있음.
- **확인 대상**: report 생성 플로우에서 **실제 사용 가능한 데이터 소스**(GA4만 / CSV만 / 둘 다)가 어떻게 결정되고, question_intent·MartSummary·프롬프트에 어떻게 반영되는지. `nodes.py`, `summary_builder.py`, `prompts.py`.

### 2.5 Report 모드에서 question_intent 기본값

- **report** 모드(사용자 메시지 없이 리포트만 뽑을 때)에서 question_intent가 **기본값**으로 need_ga4=True, need_channels=True(마케팅일 때)만 세팅되고, **실제 mart에 GA4/채널 데이터가 있는지**는 보지 않을 가능성.
- **확인 대상**: report 모드 진입 시 question_intent를 누가 어떻게 만드는지, 그리고 **실제 데이터 존재 여부**에 따라 need_ga4/need_channels를 False로 바꾸는 로직이 있는지. `data_source_selector.py`, `nodes.py`, `graph.py`.

---

## 3. 확인해야 할 파일

| 파일 | 확인할 내용 |
|------|--------------|
| **python-brain/app/langgraph/data_source_selector.py** | `workspace_purpose == "marketing"` 일 때 need_ga4, need_channels 기본값. report 모드에서 question_intent가 어떻게 결정되는지. CSV만 있는 프로젝트에서 need_ga4/need_channels를 False로 두는 조건 존재 여부. |
| **python-brain/app/langgraph/summary_builder.py** | CSV만 있을 때 어떤 Mart 테이블을 조회하는지. need_ga4/need_channels가 True인데 GA4/채널 테이블이 비어 있으면 topChannels·dailyTrend가 빈 배열로 가는지. CSV 데이터(mart_csv_daily_metrics 등)가 MartSummary의 어떤 필드로 들어가 LLM에 전달되는지. |
| **python-brain/app/langgraph/prompts.py** | report용 시스템·유저 프롬프트에서 "채널", "topChannels", "유기검색", "직접유입" 등 언급 여부. **데이터에 없는 차원(채널 등)은 기술하지 말 것** 또는 **topChannels가 비어 있으면 채널 섹션을 쓰지 말 것** 같은 가드라인 존재 여부. MartSummary가 비어 있는 필드를 LLM에 어떻게 넘기는지(빈 배열 vs 생략). |
| **python-brain/app/langgraph/nodes.py** | report 모드에서 load_context → summary_builder → build_user_prompt 호출 순서 및 question_intent 전달 방식. workspace_purpose·실제 데이터 소스(GA4/CSV) 반영 여부. |
| **python-brain/app/langgraph/graph.py** | report 플로우 진입 시 planner/question_intent 호출 여부 및 인자(workspace_purpose, user_message 유무 등). |
| **python-brain/app/langgraph/types.py** | MartSummary 타입 정의(topChannels, dailyTrend 등). 어떤 필드가 선택적(optional)인지. |
| **DB/마트 스키마** | CSV 전용 프로젝트에서 mart_ga4_*, mart_ga4_channel_daily 등이 비어 있는지, mart_csv_daily_metrics·mart_events 등 CSV 유래 데이터만 있는지 확인 시 참고. `supabase/migrations/`, `src/types/database.ts`. |

---

## 4. 요약

- **문제**: CSV만 넣었는데(컬럼: Date, Sessions, Leads), "마케팅 분석" 리포트에서 **채널별 성과(유기검색 45%, 직접유입 30% 등)** 가 실제 데이터 없이 생성됨 → **환각(거짓말)**.
- **추정 원인**: (1) 마케팅 워크스페이스에서 need_channels/need_ga4 고정, (2) MartSummary가 GA4/채널 중심이고 CSV 전용일 때 빈 topChannels가 넘어감, (3) 프롬프트가 "채널 리포트"를 요구하지만 "데이터 없으면 채널 섹션 쓰지 말라"는 가드 없음, (4) 데이터 소스(CSV만 vs GA4만)에 따른 question_intent·프롬프트 분기 부재.
- **다음 단계**: 위 파일들을 열어 위 표의 "확인할 내용"을 점검한 뒤, **원인 확정** 및 **수정 방안**(데이터 소스 반영, 프롬프트 가드, 빈 topChannels 시 채널 섹션 생략 등)을 별도 문서나 이슈로 정리하면 됨.
