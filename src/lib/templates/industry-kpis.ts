/**
 * Industry-specific KPI templates for semantic layer
 * Used to auto-generate metric_definitions based on project profile
 */

export interface IndustryKPI {
  name: string
  displayName: string
  description: string
  category: 'acquisition' | 'engagement' | 'retention' | 'conversion' | 'revenue'
  sourceType: 'ga4' | 'csv' | 'calculated'
  formula?: string
  dependencies?: string[]
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'ratio'
  dataType: 'number' | 'percentage' | 'currency' | 'duration'
  synonyms: string[]
  exampleQuestions: string[]
  priority: number // 1 = highest, 5 = lowest
}

// Base KPIs applicable to all industries
const BASE_KPIS: IndustryKPI[] = [
  // Acquisition
  {
    name: 'total_users',
    displayName: '총 사용자 수',
    description: '기간 내 서비스를 방문한 고유 사용자 수',
    category: 'acquisition',
    sourceType: 'ga4',
    aggregation: 'sum',
    dataType: 'number',
    synonyms: ['사용자', 'users', 'DAU', 'MAU', '방문자'],
    exampleQuestions: ['이번 주 사용자 수는?', '방문자가 얼마나 됐어?'],
    priority: 1,
  },
  {
    name: 'new_users',
    displayName: '신규 사용자 수',
    description: '처음 방문한 사용자 수',
    category: 'acquisition',
    sourceType: 'ga4',
    aggregation: 'sum',
    dataType: 'number',
    synonyms: ['신규', '첫 방문', '새 사용자', 'new users'],
    exampleQuestions: ['신규 유입이 얼마나 됐어?', '새로운 사용자 추이'],
    priority: 2,
  },
  {
    name: 'sessions',
    displayName: '세션 수',
    description: '총 세션(방문) 수',
    category: 'acquisition',
    sourceType: 'ga4',
    aggregation: 'sum',
    dataType: 'number',
    synonyms: ['방문', '세션', 'visits', 'sessions'],
    exampleQuestions: ['세션 수가 어떻게 돼?', '방문 횟수 알려줘'],
    priority: 2,
  },
  // Engagement
  {
    name: 'engagement_rate',
    displayName: '참여율',
    description: '참여 세션 비율 (10초 이상 또는 2페이지 이상)',
    category: 'engagement',
    sourceType: 'ga4',
    aggregation: 'avg',
    dataType: 'percentage',
    synonyms: ['인게이지먼트', '참여', 'engagement'],
    exampleQuestions: ['참여율이 어때?', '사용자들이 얼마나 참여해?'],
    priority: 2,
  },
  {
    name: 'bounce_rate',
    displayName: '이탈률',
    description: '단일 페이지만 보고 떠난 세션 비율',
    category: 'engagement',
    sourceType: 'ga4',
    aggregation: 'avg',
    dataType: 'percentage',
    synonyms: ['바운스', '이탈', 'bounce'],
    exampleQuestions: ['이탈률이 높아?', '바운스율 알려줘'],
    priority: 3,
  },
  {
    name: 'avg_session_duration',
    displayName: '평균 세션 시간',
    description: '세션당 평균 체류 시간',
    category: 'engagement',
    sourceType: 'ga4',
    aggregation: 'avg',
    dataType: 'duration',
    synonyms: ['체류 시간', '세션 시간', 'duration', '머무르는 시간'],
    exampleQuestions: ['사용자들이 얼마나 머물러?', '평균 체류 시간은?'],
    priority: 3,
  },
  // Retention
  {
    name: 'dau_per_mau',
    displayName: 'DAU/MAU',
    description: '일간 활성 사용자 대비 월간 활성 사용자 비율 (Stickiness)',
    category: 'retention',
    sourceType: 'calculated',
    formula: 'dau / mau',
    dependencies: ['dau', 'mau'],
    aggregation: 'ratio',
    dataType: 'percentage',
    synonyms: ['스티키니스', '재방문율', 'stickiness'],
    exampleQuestions: ['DAU/MAU가 어때?', '스티키니스 확인해줘'],
    priority: 2,
  },
]

// E-commerce specific KPIs
const ECOMMERCE_KPIS: IndustryKPI[] = [
  {
    name: 'conversion_rate',
    displayName: '전환율',
    description: '구매 완료 비율',
    category: 'conversion',
    sourceType: 'ga4',
    aggregation: 'avg',
    dataType: 'percentage',
    synonyms: ['구매 전환', 'CVR', 'conversion'],
    exampleQuestions: ['전환율이 얼마야?', '구매 전환이 잘 되고 있어?'],
    priority: 1,
  },
  {
    name: 'revenue',
    displayName: '매출',
    description: '총 매출액',
    category: 'revenue',
    sourceType: 'ga4',
    aggregation: 'sum',
    dataType: 'currency',
    synonyms: ['매출', '수익', 'revenue', '판매액'],
    exampleQuestions: ['이번 달 매출은?', '매출 추이 보여줘'],
    priority: 1,
  },
  {
    name: 'average_order_value',
    displayName: '평균 주문 금액',
    description: '주문당 평균 결제 금액',
    category: 'revenue',
    sourceType: 'calculated',
    formula: 'revenue / transactions',
    dependencies: ['revenue', 'transactions'],
    aggregation: 'avg',
    dataType: 'currency',
    synonyms: ['AOV', '객단가', '평균 객단가'],
    exampleQuestions: ['객단가가 얼마야?', 'AOV 확인해줘'],
    priority: 2,
  },
  {
    name: 'cart_abandonment_rate',
    displayName: '장바구니 이탈률',
    description: '장바구니에 담고 구매하지 않은 비율',
    category: 'conversion',
    sourceType: 'calculated',
    formula: '1 - (transactions / add_to_cart)',
    dependencies: ['transactions', 'add_to_cart'],
    aggregation: 'avg',
    dataType: 'percentage',
    synonyms: ['장바구니 포기', 'cart abandonment'],
    exampleQuestions: ['장바구니 이탈이 많아?', '카트 포기율 알려줘'],
    priority: 3,
  },
  {
    name: 'purchase_frequency',
    displayName: '구매 빈도',
    description: '사용자당 평균 구매 횟수',
    category: 'retention',
    sourceType: 'calculated',
    formula: 'transactions / unique_purchasers',
    dependencies: ['transactions', 'unique_purchasers'],
    aggregation: 'avg',
    dataType: 'number',
    synonyms: ['재구매', '구매 주기'],
    exampleQuestions: ['재구매율은 어때?', '고객들이 얼마나 자주 사?'],
    priority: 3,
  },
]

// SaaS specific KPIs
const SAAS_KPIS: IndustryKPI[] = [
  {
    name: 'signup_rate',
    displayName: '가입 전환율',
    description: '방문자 대비 가입자 비율',
    category: 'conversion',
    sourceType: 'calculated',
    formula: 'signups / visitors',
    dependencies: ['signups', 'visitors'],
    aggregation: 'avg',
    dataType: 'percentage',
    synonyms: ['회원가입 전환', 'signup conversion'],
    exampleQuestions: ['가입 전환율이 어때?', '얼마나 가입해?'],
    priority: 1,
  },
  {
    name: 'trial_to_paid_rate',
    displayName: '유료 전환율',
    description: '무료 체험 사용자의 유료 전환 비율',
    category: 'conversion',
    sourceType: 'calculated',
    formula: 'paid_users / trial_users',
    dependencies: ['paid_users', 'trial_users'],
    aggregation: 'avg',
    dataType: 'percentage',
    synonyms: ['트라이얼 전환', 'trial conversion', '유료화'],
    exampleQuestions: ['트라이얼에서 유료 전환이 얼마야?', '유료 전환율은?'],
    priority: 1,
  },
  {
    name: 'feature_adoption_rate',
    displayName: '기능 사용률',
    description: '주요 기능 사용 비율',
    category: 'engagement',
    sourceType: 'calculated',
    formula: 'feature_users / active_users',
    dependencies: ['feature_users', 'active_users'],
    aggregation: 'avg',
    dataType: 'percentage',
    synonyms: ['기능 채택', 'feature adoption'],
    exampleQuestions: ['핵심 기능 사용률은?', '어떤 기능을 많이 써?'],
    priority: 2,
  },
  {
    name: 'churn_rate',
    displayName: '이탈률 (Churn)',
    description: '서비스를 떠난 사용자 비율',
    category: 'retention',
    sourceType: 'calculated',
    formula: 'churned_users / total_users',
    dependencies: ['churned_users', 'total_users'],
    aggregation: 'avg',
    dataType: 'percentage',
    synonyms: ['이탈', 'churn', '해지율'],
    exampleQuestions: ['이탈률이 어때?', 'churn rate 확인해줘'],
    priority: 1,
  },
  {
    name: 'mrr',
    displayName: 'MRR',
    description: '월간 반복 매출',
    category: 'revenue',
    sourceType: 'csv',
    aggregation: 'sum',
    dataType: 'currency',
    synonyms: ['월 매출', 'monthly recurring revenue', '반복 매출'],
    exampleQuestions: ['MRR이 얼마야?', '월간 매출은?'],
    priority: 1,
  },
  {
    name: 'arpu',
    displayName: 'ARPU',
    description: '사용자당 평균 매출',
    category: 'revenue',
    sourceType: 'calculated',
    formula: 'revenue / active_users',
    dependencies: ['revenue', 'active_users'],
    aggregation: 'avg',
    dataType: 'currency',
    synonyms: ['객단가', 'average revenue per user'],
    exampleQuestions: ['ARPU가 얼마야?', '사용자당 매출은?'],
    priority: 2,
  },
]

// Media/Content specific KPIs
const MEDIA_KPIS: IndustryKPI[] = [
  {
    name: 'page_views',
    displayName: '페이지뷰',
    description: '총 페이지 조회 수',
    category: 'engagement',
    sourceType: 'ga4',
    aggregation: 'sum',
    dataType: 'number',
    synonyms: ['PV', 'pageviews', '조회수'],
    exampleQuestions: ['페이지뷰가 얼마나 돼?', 'PV 알려줘'],
    priority: 1,
  },
  {
    name: 'pages_per_session',
    displayName: '세션당 페이지수',
    description: '방문당 평균 페이지 조회 수',
    category: 'engagement',
    sourceType: 'calculated',
    formula: 'page_views / sessions',
    dependencies: ['page_views', 'sessions'],
    aggregation: 'avg',
    dataType: 'number',
    synonyms: ['페이지 깊이', 'depth'],
    exampleQuestions: ['사용자들이 몇 페이지나 봐?', '페이지 뎁스는?'],
    priority: 2,
  },
  {
    name: 'scroll_depth',
    displayName: '스크롤 깊이',
    description: '페이지 스크롤 비율',
    category: 'engagement',
    sourceType: 'ga4',
    aggregation: 'avg',
    dataType: 'percentage',
    synonyms: ['스크롤', 'scroll'],
    exampleQuestions: ['사용자들이 얼마나 스크롤해?', '콘텐츠를 끝까지 봐?'],
    priority: 3,
  },
  {
    name: 'ad_impressions',
    displayName: '광고 노출',
    description: '광고 노출 횟수',
    category: 'revenue',
    sourceType: 'csv',
    aggregation: 'sum',
    dataType: 'number',
    synonyms: ['임프레션', 'impressions', '노출'],
    exampleQuestions: ['광고 노출이 얼마나 돼?', '임프레션 수치는?'],
    priority: 2,
  },
  {
    name: 'ad_revenue',
    displayName: '광고 수익',
    description: '광고를 통한 수익',
    category: 'revenue',
    sourceType: 'csv',
    aggregation: 'sum',
    dataType: 'currency',
    synonyms: ['광고 매출', 'ad revenue'],
    exampleQuestions: ['광고 수익이 얼마야?', '광고로 얼마 벌었어?'],
    priority: 1,
  },
]

// Gaming specific KPIs
const GAMING_KPIS: IndustryKPI[] = [
  {
    name: 'dau',
    displayName: 'DAU',
    description: '일간 활성 사용자',
    category: 'engagement',
    sourceType: 'ga4',
    aggregation: 'avg',
    dataType: 'number',
    synonyms: ['일일 사용자', 'daily active users'],
    exampleQuestions: ['DAU가 얼마야?', '오늘 몇 명이 접속했어?'],
    priority: 1,
  },
  {
    name: 'retention_d1',
    displayName: 'D1 리텐션',
    description: '1일차 재방문율',
    category: 'retention',
    sourceType: 'calculated',
    formula: 'd1_users / d0_users',
    dependencies: ['d1_users', 'd0_users'],
    aggregation: 'avg',
    dataType: 'percentage',
    synonyms: ['1일 리텐션', 'day 1 retention'],
    exampleQuestions: ['D1 리텐션이 어때?', '다음 날 얼마나 돌아와?'],
    priority: 1,
  },
  {
    name: 'retention_d7',
    displayName: 'D7 리텐션',
    description: '7일차 재방문율',
    category: 'retention',
    sourceType: 'calculated',
    formula: 'd7_users / d0_users',
    dependencies: ['d7_users', 'd0_users'],
    aggregation: 'avg',
    dataType: 'percentage',
    synonyms: ['7일 리텐션', 'day 7 retention'],
    exampleQuestions: ['D7 리텐션은?', '일주일 후에 얼마나 남아?'],
    priority: 1,
  },
  {
    name: 'retention_d30',
    displayName: 'D30 리텐션',
    description: '30일차 재방문율',
    category: 'retention',
    sourceType: 'calculated',
    formula: 'd30_users / d0_users',
    dependencies: ['d30_users', 'd0_users'],
    aggregation: 'avg',
    dataType: 'percentage',
    synonyms: ['30일 리텐션', 'day 30 retention'],
    exampleQuestions: ['D30 리텐션은?', '한 달 후 리텐션이 어때?'],
    priority: 2,
  },
  {
    name: 'arpdau',
    displayName: 'ARPDAU',
    description: 'DAU당 평균 수익',
    category: 'revenue',
    sourceType: 'calculated',
    formula: 'revenue / dau',
    dependencies: ['revenue', 'dau'],
    aggregation: 'avg',
    dataType: 'currency',
    synonyms: ['일간 객단가'],
    exampleQuestions: ['ARPDAU가 얼마야?', '일간 ARPU는?'],
    priority: 2,
  },
  {
    name: 'paying_user_rate',
    displayName: '과금률',
    description: '유료 결제 사용자 비율',
    category: 'conversion',
    sourceType: 'calculated',
    formula: 'paying_users / active_users',
    dependencies: ['paying_users', 'active_users'],
    aggregation: 'avg',
    dataType: 'percentage',
    synonyms: ['결제 전환', 'PUR', 'paying user rate'],
    exampleQuestions: ['과금률이 어때?', '결제하는 사용자가 몇 %야?'],
    priority: 2,
  },
]

// Industry to KPI mapping
const INDUSTRY_KPI_MAP: Record<string, IndustryKPI[]> = {
  ecommerce: [...BASE_KPIS, ...ECOMMERCE_KPIS],
  '이커머스': [...BASE_KPIS, ...ECOMMERCE_KPIS],
  '쇼핑몰': [...BASE_KPIS, ...ECOMMERCE_KPIS],
  retail: [...BASE_KPIS, ...ECOMMERCE_KPIS],

  saas: [...BASE_KPIS, ...SAAS_KPIS],
  'SaaS': [...BASE_KPIS, ...SAAS_KPIS],
  software: [...BASE_KPIS, ...SAAS_KPIS],
  'B2B': [...BASE_KPIS, ...SAAS_KPIS],

  media: [...BASE_KPIS, ...MEDIA_KPIS],
  '미디어': [...BASE_KPIS, ...MEDIA_KPIS],
  content: [...BASE_KPIS, ...MEDIA_KPIS],
  '콘텐츠': [...BASE_KPIS, ...MEDIA_KPIS],
  news: [...BASE_KPIS, ...MEDIA_KPIS],
  blog: [...BASE_KPIS, ...MEDIA_KPIS],

  gaming: [...BASE_KPIS, ...GAMING_KPIS],
  '게임': [...BASE_KPIS, ...GAMING_KPIS],
  game: [...BASE_KPIS, ...GAMING_KPIS],

  // Default for unknown industries
  default: BASE_KPIS,
}

/**
 * Get KPIs for a specific industry
 */
export function getIndustryKPIs(industry?: string): IndustryKPI[] {
  if (!industry) {
    return INDUSTRY_KPI_MAP.default
  }

  const normalizedIndustry = industry.toLowerCase().trim()

  // Try exact match first
  if (INDUSTRY_KPI_MAP[normalizedIndustry]) {
    return INDUSTRY_KPI_MAP[normalizedIndustry]
  }

  // Try partial match
  for (const [key, kpis] of Object.entries(INDUSTRY_KPI_MAP)) {
    if (normalizedIndustry.includes(key) || key.includes(normalizedIndustry)) {
      return kpis
    }
  }

  return INDUSTRY_KPI_MAP.default
}

/**
 * Get all available industries
 */
export function getAvailableIndustries(): string[] {
  return ['ecommerce', 'saas', 'media', 'gaming']
}

/**
 * Match project goals to relevant KPIs and boost their priority
 */
export function matchGoalsToKPIs(
  goals: string[] | undefined,
  kpis: IndustryKPI[]
): IndustryKPI[] {
  if (!goals || goals.length === 0) {
    return kpis
  }

  const goalKeywords: Record<string, string[]> = {
    acquisition: ['사용자 확보', '유입', '트래픽', 'acquisition', 'growth', '성장'],
    engagement: ['참여', '활성화', 'engagement', '사용성', 'UX'],
    retention: ['리텐션', '재방문', '이탈 방지', 'retention', 'churn'],
    conversion: ['전환', '구매', 'conversion', '가입'],
    revenue: ['매출', '수익', 'revenue', '매출 성장'],
  }

  const boostedCategories = new Set<string>()

  for (const goal of goals) {
    const normalizedGoal = goal.toLowerCase()
    for (const [category, keywords] of Object.entries(goalKeywords)) {
      if (keywords.some(kw => normalizedGoal.includes(kw.toLowerCase()))) {
        boostedCategories.add(category)
      }
    }
  }

  // Boost priority for matched categories
  return kpis.map(kpi => {
    if (boostedCategories.has(kpi.category)) {
      return { ...kpi, priority: Math.max(1, kpi.priority - 1) }
    }
    return kpi
  })
}
