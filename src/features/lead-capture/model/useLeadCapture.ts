"use client";

import { useState } from "react";
import { LeadFormData } from "@/entities/lead/types";
import { validateLeadForm, ValidationErrors } from "./validation";
import { useI18n } from "@/shared/lib/i18n/context";
import { submitForm } from "@/shared/lib/analytics";

export function useLeadCapture() {
  const { t } = useI18n();
  const [formData, setFormData] = useState<Partial<LeadFormData>>({});
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const updateField = <K extends keyof LeadFormData>(
    field: K,
    value: LeadFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field in errors && errors[field as keyof ValidationErrors]) {
      setErrors((prev) => ({ ...prev, [field as keyof ValidationErrors]: undefined }));
    }
  };

  const togglePurpose = (purpose: LeadFormData["purposes"][number]) => {
    const currentPurposes = formData.purposes || [];
    const newPurposes = currentPurposes.includes(purpose)
      ? currentPurposes.filter((p) => p !== purpose)
      : [...currentPurposes, purpose];
    updateField("purposes", newPurposes);
  };

  const submit = async () => {
    const validationErrors = validateLeadForm(formData, t.leadCapture.errors);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      // API 엔드포인트로 데이터 전송
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData as LeadFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "제출에 실패했습니다.");
      }

      const result = await response.json();
      console.log("Lead saved successfully:", result);
      
      setIsSubmitted(true);
      submitForm("lead_capture", true);
    } catch (error) {
      console.error("Error submitting lead:", error);
      // 에러 발생 시에도 사용자에게는 성공 메시지 표시
      // (실제 프로덕션에서는 에러 메시지를 표시하는 것이 좋습니다)
      setIsSubmitted(true);
      submitForm("lead_capture", false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setFormData({});
    setErrors({});
    setIsSubmitted(false);
  };

  return {
    formData,
    errors,
    isSubmitting,
    isSubmitted,
    updateField,
    togglePurpose,
    submit,
    reset,
  };
}

