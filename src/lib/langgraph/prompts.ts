import type { MartSummary, WorkspacePurpose, ProjectProfile } from './types'

// 목적별 분석 초점
const PURPOSE_FOCUS: Record<WorkspacePurpose, string> = {
  product: `
- 사용자 행동 패턴과 제품 사용성에 집중
- 주요 페이지/기능별 참여도 분석
- 사용자 여정과 이탈 포인트 파악
- 신규 vs 기존 사용자 행동 차이`,
  
  marketing: `
- 채널별 유입 효율성과 ROI에 집중
- 캠페인/채널별 전환 성과 분석
- 트래픽 소스의 품질 평가
- 마케팅 예산 배분 최적화 관점`,
  
  biz: `
- 비즈니스 KPI와 매출 연관성에 집중
- 성장 지표와 목표 대비 달성률
- 시장/경쟁 관점의 성과 해석
- 경영진 보고용 핵심 인사이트`,
  
  sales: `
- 리드 생성과 전환에 집중
- 고객 획득 효율성 분석
- 영업 파이프라인 연계 지표
- 고가치 세그먼트 식별`,
}

export function buildSystemPrompt(
  language: 'ko' | 'en',
  purpose: WorkspacePurpose,
  profile: ProjectProfile,
  mode: 'report' | 'chat' = 'report'
): string {
  const langInstructions = language === 'ko' 
    ? '모든 응답은 한국어로 작성합니다.'
    : 'All responses must be in English.'

  const purposeFocus = PURPOSE_FOCUS[purpose]

  const baseContext = `당신은 ${profile.serviceName || '서비스'}의 데이터 분석 전문가입니다.
${langInstructions}

## 서비스 정보
- 서비스명: ${profile.serviceName || '(미설정)'}
- 설명: ${profile.serviceDescription || '(미설정)'}
- 타겟 사용자: ${profile.targetAudience || '(미설정)'}
- 산업: ${profile.industry || '(미설정)'}
- 목표: ${profile.goals?.join(', ') || '(미설정)'}
- 핵심 KPI: ${profile.kpis?.join(', ') || '(미설정)'}

## 분석 초점 (${purpose})
${purposeFocus}

## 데이터 규칙 (반드시 준수)
- 제공된 martSummary 데이터 범위 내에서만 분석합니다
- 숫자를 추정하거나 날조하지 않습니다
- 불확실한 내용은 "데이터로 확인 필요"라고 명시합니다
- dataSources.integrated가 true이면 GA4와 CSV 데이터 통합 분석

## 언어 일관성
- ${language === 'ko' ? '한국어' : 'English'}로만 응답`

  // 리포트 모드: 전체 섹션 포함
  if (mode === 'report') {
    return `${baseContext}

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
- Quick Reply, next_params 작성 금지 (시스템이 자동 생성)`
  }

  // 채팅 모드: 대화형, 간결, 실행 가능한 답변
  return `${baseContext}

## 응답 포맷 (채팅 모드 - 대화형)

### 핵심 원칙
1. **간결하고 직접적인 답변** - 사용자 질문에 바로 답변
2. **실행 가능한 제안** - 추상적 조언 대신 구체적 액션
3. **대화 흐름 유지** - 리포트 전체 반복 금지

### 답변 구조 (짧게!)
1. **핵심 답변** (1-2문장): 질문에 대한 직접적 답변
2. **근거 데이터** (bullet 2-3개): 관련 수치 인용
3. **구체적 제안** (1-2개): 바로 실행 가능한 액션
4. **후속 질문** (선택): 더 깊은 분석이 필요하면 1개 질문

### 금지 사항
- Key Insights, Critical Issues, Recommended Actions 섹션 헤더 사용 금지
- 리포트 전체 내용 반복 금지
- 일반론적이고 뻔한 조언 금지
- 200단어 이상의 긴 답변 금지`
}

export function buildUserPrompt(
  mode: 'report' | 'chat',
  martSummary: MartSummary,
  userMessage?: string
): string {
  const summaryJson = JSON.stringify(martSummary, null, 2)

  // 데이터 소스 설명 생성
  const dataSourcesDesc = getDataSourcesDescription(martSummary)

  if (mode === 'report') {
    return `## 분석 데이터 (${martSummary.period.start} ~ ${martSummary.period.end}, ${martSummary.period.days}일)
${dataSourcesDesc}

\`\`\`json
${summaryJson}
\`\`\`

위 데이터를 기반으로 종합 분석 리포트를 작성해주세요.
${martSummary.dataSources?.integrated ? '특히 GA4와 CSV 데이터 간의 상관관계와 통합 인사이트에 주목하세요.' : ''}
응답 포맷을 반드시 준수하세요.`
  }

  return `## 분석 데이터 (${martSummary.period.start} ~ ${martSummary.period.end})
${dataSourcesDesc}

\`\`\`json
${summaryJson}
\`\`\`

## 사용자 질문
${userMessage}

위 데이터를 참고하여 **질문에 직접적으로 답변**해주세요.
- 리포트 전체 반복 금지
- 핵심만 간결하게
- 구체적인 수치와 액션 제안`
}

function getDataSourcesDescription(martSummary: MartSummary): string {
  const ds = martSummary.dataSources
  if (!ds) return ''

  const parts: string[] = []

  if (ds.ga4?.available) {
    parts.push(`- **GA4 데이터**: 세션, 유저, 채널, 페이지 정보 포함 (${ds.ga4.recordCount || 0}개 레코드)`)
  }

  if (ds.csv?.available && ds.csv.metrics) {
    parts.push(`- **CSV 커스텀 데이터**: ${ds.csv.metrics.join(', ')} (${ds.csv.recordCount || 0}개 레코드)`)
  }

  if (ds.integrated) {
    parts.push(`- **통합 분석**: GA4와 CSV 데이터가 날짜 기준으로 연결되어 있습니다. integratedTrend에서 확인하세요.`)
  }

  if (parts.length === 0) return ''

  return `
### 사용 가능한 데이터 소스
${parts.join('\n')}`
}

// 질문 JSON 추출용 프롬프트
export const QUESTION_EXTRACTION_PROMPT = `
위 분석 결과에서 Analyst Questions 섹션을 JSON 형태로 추출해주세요.
반드시 아래 형식을 따르세요:

\`\`\`json
{
  "questions": [
    {
      "id": "q1",
      "question": "질문 내용",
      "context": "이 질문이 나온 분석 컨텍스트",
      "quickReplies": [
        {
          "label": "선택지 텍스트",
          "nextParams": {
            "range": "7d|30d",
            "focus": "channel|page|trend|conversion",
            "segment": "세그먼트명"
          }
        }
      ]
    }
  ]
}
\`\`\`

주의: nextParams에는 range, focus, segment 중 최소 1개 이상 포함
`
