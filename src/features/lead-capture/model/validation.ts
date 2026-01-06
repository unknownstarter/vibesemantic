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

export function validateLeadForm(
  data: Partial<LeadFormData>,
  errorMessages: typeof import("@/shared/lib/i18n/translations").translations.ko.leadCapture.errors
): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.companyName || data.companyName.trim().length === 0) {
    errors.companyName = errorMessages.companyName;
  }

  if (!data.contactName || data.contactName.trim().length === 0) {
    errors.contactName = errorMessages.contactName;
  }

  if (!data.jobRole) {
    errors.jobRole = errorMessages.jobRole;
  }

  if (!data.serviceName || data.serviceName.trim().length === 0) {
    errors.serviceName = errorMessages.serviceName;
  }

  if (!data.dau) {
    errors.dau = errorMessages.dau;
  }

  if (!data.purposes || data.purposes.length === 0) {
    errors.purposes = errorMessages.purposes;
  }

  if (!data.painPoint || data.painPoint.trim().length === 0) {
    errors.painPoint = errorMessages.painPoint;
  }

  if (!data.currentTool) {
    errors.currentTool = errorMessages.currentTool;
  }

  if (!data.expectedFeature) {
    errors.expectedFeature = errorMessages.expectedFeature;
  }

  return errors;
}

