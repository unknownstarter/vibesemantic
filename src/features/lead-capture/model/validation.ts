import { LeadFormData } from "@/entities/lead/types";

export interface ValidationErrors {
  companyName?: string;
  contactName?: string;
  jobRole?: string;
  serviceName?: string;
  dau?: string;
  purposes?: string;
  painPoint?: string;
  currentTool?: string;
  expectedFeature?: string;
}

export function validateLeadForm(data: Partial<LeadFormData>): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.companyName || data.companyName.trim().length === 0) {
    errors.companyName = "회사명을 입력해주세요.";
  }

  if (!data.contactName || data.contactName.trim().length === 0) {
    errors.contactName = "담당자 이름을 입력해주세요.";
  }

  if (!data.jobRole) {
    errors.jobRole = "직책/직무를 선택해주세요.";
  }

  if (!data.serviceName || data.serviceName.trim().length === 0) {
    errors.serviceName = "서비스 이름을 입력해주세요.";
  }

  if (!data.dau) {
    errors.dau = "서비스 DAU를 선택해주세요.";
  }

  if (!data.purposes || data.purposes.length === 0) {
    errors.purposes = "최소 하나의 사용 목적을 선택해주세요.";
  }

  if (!data.painPoint || data.painPoint.trim().length === 0) {
    errors.painPoint = "지금 가장 답답한 점을 입력해주세요.";
  }

  if (!data.currentTool) {
    errors.currentTool = "현재 사용 중인 분석 도구를 선택해주세요.";
  }

  if (!data.expectedFeature) {
    errors.expectedFeature = "가장 기대하는 기능을 선택해주세요.";
  }

  return errors;
}

