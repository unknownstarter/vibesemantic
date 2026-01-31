# 대시보드 스펙: Semantic Snapshot 기반 (Epic 5.1)

**마지막 업데이트**: 2026-01-31

## 1. 개요

대시보드는 **BI 도구가 아니다**.  
**기간/워크스페이스 선택 → Semantic Snapshot(Summary) 기반 차트**로 동작한다.  
즉, Mart 집계 결과인 Summary를 한 시점/범위로 보여주고, “이 숫자에 대해 물어보기”로 채팅과 연결한다.

## 2. 화면/플로우

1. **기간 선택**: `7d` | `30d` (기존 Report range와 동일).
2. **워크스페이스**: 현재 워크스페이스 고정 (목적 기반 뷰는 워크스페이스 purpose 활용).
3. **Summary 조회**: `project_id`, `workspace_id`, `range`로 Summary(Semantic Snapshot) 조회.
4. **차트 렌더링**: Summary 필드 → 차트 N종 매핑 (아래 표 참고).
5. **(선택) 스냅샷 저장**: “이 시점 스냅샷 저장” 시 자산 테이블에 저장 후 목록에서 재조회.

## 3. 차트 ↔ Summary 필드 매핑

| 차트 종류 | Summary 필드 | 차트 입력 형식 | 비고 |
|-----------|--------------|----------------|------|
| **일별 트렌드** (Line) | `dailyTrend` | `{ date, sessions, users }[]` | GA4 KPI 일별. 없으면 비표시. |
| **채널별 세션** (Bar) | `topChannels` | `{ name, value }[]` (name=채널명, value=sessions), 상위 5개 | `topChannels[].name`, `topChannels[].sessions`. |
| **페이지 참여율** (Radar) | `topPages` | `{ subject, value, fullMark }[]`, 상위 5개 | subject=페이지명(title 또는 path), value=engagementRate*100. |
| **GA4+CSV 통합** (Line) | `integratedTrend` | `{ date, ga4Sessions?, [csvMetricKey]: number }[]` | GA4 세션 + CSV 메트릭 키별 값. `csvMetrics` 키와 연동. |

- **KPI 숫자 카드**: `kpis` (totalSessions, totalActiveUsers, avgEngagementRate 등) → 카드 N개.
- **데이터 없음**: 해당 Summary 필드가 비어 있으면 해당 차트는 렌더하지 않음 (기존 ReportCharts 동작과 동일).

## 4. API 명세

### 4.1 Summary 조회 (차트용)

- **경로**: `GET /api/workspaces/[workspaceId]/summary?range=7d|30d`
- **역할**: 해당 워크스페이스·기간의 **Semantic Snapshot(MartSummary)** 반환. 차트는 이 응답만으로 렌더 가능.
- **응답 형식** (차트/대시보드 소비):

```ts
{
  summary: MartSummary  // period, kpis, topChannels, topPages, dailyTrend, csvMetrics, integratedTrend, dataSources, metricDefinitions, ...
}
```

- **구현 참고**:
  - Option A: 캐시된 Report가 있으면 해당 리포트의 `metadata.martSummary` 또는 저장된 Summary 반환.
  - Option B: Brain API 또는 서버 측 `build_summary_from_mart` 호출해 Summary만 생성 후 반환 (캐시 키: workspace_id + range).
- **에러**: 401(권한), 404(워크스페이스 없음), 500(Summary 생성 실패).

### 4.2 기존 Report 캐시와의 관계

- `GET /api/workspaces/[workspaceId]/report` (캐시된 리포트)가 있으면, 리포트 생성 시 이미 `martSummary`를 갖고 있음.
- 대시보드 전용 **Summary 전용 API**를 두면, 리포트 생성 없이 차트만 먼저 그릴 수 있음 (동일 Summary 로직 재사용).

## 5. 선택 UI 스펙

- **기간**: 단일 선택. `7d` / `30d` (기존 range와 동일).
- **워크스페이스**: URL 경로 `[pid]/workspaces/[wid]` 로 결정. 별도 선택 드롭은 (선택) 나중에 추가 가능.
- **목적 기반 뷰**: 워크스페이스 `purpose`(product | marketing | biz | sales)에 따라 추후 “추천 차트 세트” 또는 라벨만 변경 가능 (같은 Summary 필드 사용).

## 6. 차트→채팅 (Task 5.2)

"이 숫자에 대해 물어보기" 클릭 시 Chat 요청에 넘기는 컨텍스트:

```ts
chartContext?: {
  range?: '7d' | '30d'
  metricNames?: string[]
  chartType?: 'trend' | 'channel' | 'page' | 'integrated'
  label?: string
}
```

- Agent API body에 `chartContext` 포함. Brain API는 `chart_context`로 수신.
- Planner가 `plan.metrics_requested`, `plan.date_range` 반영. Explainer 유저 프롬프트에 "선택한 차트/메트릭" 문구 포함.

## 7. 완료 기준

- **5.1**: 기간/워크스페이스 → Summary 기반 차트, 필드 매핑 표, Summary API 명세.
- **5.2**: `chartContext` 전달 시 Planner/Tool/Explainer가 해당 메트릭·기간·컨텍스트로 동작.
