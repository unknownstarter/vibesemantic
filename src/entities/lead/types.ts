export type JobRole =
  | "PO/PM"
  | "Founder/CEO"
  | "Marketer/Growth"
  | "Developer"
  | "기타";

export type DAURange = "0-100" | "100-1K" | "1K-10K" | "10K+";

export type PurposeOption =
  | "지금 봐야 할 핵심 지표 파악"
  | "지표 변화 원인 분석"
  | "실험/AB 테스트 인사이트"
  | "SQL 없이 데이터 확인"
  | "데이터 팀 없이 의사결정하기";

export type AnalyticsTool =
  | "없음"
  | "GA/Firebase"
  | "Metabase/Looker"
  | "직접 SQL"
  | "기타";

export type ExpectedFeature =
  | "지표 자동 추천"
  | "변화 원인 분석"
  | "다음 액션 제안"
  | "자연어 질문"
  | "자동 리포트";

export interface LeadFormData {
  companyName: string;
  contactName: string;
  jobRole: JobRole;
  serviceName: string;
  dau: DAURange;
  purposes: PurposeOption[];
  painPoint: string;
  currentTool: AnalyticsTool;
  expectedFeature: ExpectedFeature;
}

