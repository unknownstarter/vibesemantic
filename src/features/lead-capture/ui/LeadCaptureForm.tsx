"use client";

import { useLeadCapture } from "../model/useLeadCapture";
import {
  JobRole,
  DAURange,
  PurposeOption,
  AnalyticsTool,
  ExpectedFeature,
} from "@/entities/lead/types";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Container } from "@/shared/ui/Container";
import { useI18n } from "@/shared/lib/i18n/context";

export function LeadCaptureForm() {
  const { t } = useI18n();
  const {
    formData,
    errors,
    isSubmitting,
    isSubmitted,
    updateField,
    togglePurpose,
    submit,
  } = useLeadCapture();

  const JOB_ROLES: JobRole[] = [...t.leadCapture.jobRoles] as JobRole[];
  const DAU_RANGES: DAURange[] = ["0-100", "100-1K", "1K-10K", "10K+"];
  const PURPOSE_OPTIONS: PurposeOption[] = [...t.leadCapture.purposes] as PurposeOption[];
  const ANALYTICS_TOOLS: AnalyticsTool[] = [...t.leadCapture.analyticsTools] as AnalyticsTool[];
  const EXPECTED_FEATURES: ExpectedFeature[] = [...t.leadCapture.expectedFeatures] as ExpectedFeature[];

  if (isSubmitted) {
    return (
      <Container size="md">
        <Card className="p-12 text-center">
          <div className="mb-4 text-6xl">✓</div>
          <h2 className="text-3xl font-bold mb-4 text-white">
            {t.leadCapture.success.title}
          </h2>
          <p className="text-gray-400 mb-8">
            {t.leadCapture.success.message}
          </p>
          <Button onClick={() => window.location.reload()}>
            {t.leadCapture.success.newApplication}
          </Button>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="md">
      <Card className="p-8 md:p-12">
        <div className="mb-8 text-center">
          <p className="text-gray-400 text-lg">
            {t.leadCapture.intro}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-6"
        >
          {/* 회사명 */}
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium mb-2">
              {t.leadCapture.fields.companyName} <span className="text-red-400">*</span>
            </label>
            <input
              id="companyName"
              type="text"
              value={formData.companyName || ""}
              onChange={(e) => updateField("companyName", e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
              aria-required="true"
              aria-invalid={!!errors.companyName}
              aria-describedby={errors.companyName ? "companyName-error" : undefined}
            />
            {errors.companyName && (
              <p id="companyName-error" className="mt-1 text-sm text-red-400" role="alert">
                {errors.companyName}
              </p>
            )}
          </div>

          {/* 담당자 이름 */}
          <div>
            <label htmlFor="contactName" className="block text-sm font-medium mb-2">
              {t.leadCapture.fields.contactName} <span className="text-red-400">*</span>
            </label>
            <input
              id="contactName"
              type="text"
              value={formData.contactName || ""}
              onChange={(e) => updateField("contactName", e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
              aria-required="true"
              aria-invalid={!!errors.contactName}
              aria-describedby={errors.contactName ? "contactName-error" : undefined}
            />
            {errors.contactName && (
              <p id="contactName-error" className="mt-1 text-sm text-red-400" role="alert">
                {errors.contactName}
              </p>
            )}
          </div>

          {/* 이메일 */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              {t.leadCapture.fields.email}
            </label>
            <input
              id="email"
              type="email"
              value={formData.email || ""}
              onChange={(e) => updateField("email", e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
              placeholder={t.leadCapture.placeholders.email}
            />
          </div>

          {/* 전화번호 */}
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium mb-2">
              {t.leadCapture.fields.phoneNumber}
            </label>
            <input
              id="phoneNumber"
              type="tel"
              value={formData.phoneNumber || ""}
              onChange={(e) => updateField("phoneNumber", e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
              placeholder={t.leadCapture.placeholders.phoneNumber}
            />
          </div>

          {/* 직책/직무 */}
          <div>
            <label htmlFor="jobRole" className="block text-sm font-medium mb-2">
              {t.leadCapture.fields.jobRole} <span className="text-red-400">*</span>
            </label>
            <select
              id="jobRole"
              value={formData.jobRole || ""}
              onChange={(e) => updateField("jobRole", e.target.value as JobRole)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
              aria-required="true"
              aria-invalid={!!errors.jobRole}
              aria-describedby={errors.jobRole ? "jobRole-error" : undefined}
            >
              <option value="">{t.leadCapture.placeholders.select}</option>
              {JOB_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            {errors.jobRole && (
              <p id="jobRole-error" className="mt-1 text-sm text-red-400" role="alert">
                {errors.jobRole}
              </p>
            )}
          </div>

          {/* 서비스 이름 */}
          <div>
            <label htmlFor="serviceName" className="block text-sm font-medium mb-2">
              {t.leadCapture.fields.serviceName} <span className="text-red-400">*</span>
            </label>
            <input
              id="serviceName"
              type="text"
              value={formData.serviceName || ""}
              onChange={(e) => updateField("serviceName", e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
              aria-required="true"
              aria-invalid={!!errors.serviceName}
              aria-describedby={errors.serviceName ? "serviceName-error" : undefined}
            />
            {errors.serviceName && (
              <p id="serviceName-error" className="mt-1 text-sm text-red-400" role="alert">
                {errors.serviceName}
              </p>
            )}
          </div>

          {/* 서비스 DAU */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t.leadCapture.fields.dau} <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DAU_RANGES.map((range) => (
                <label
                  key={range}
                  className="flex items-center p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer hover:border-white/20 hover:bg-white/10 transition-colors"
                >
                  <input
                    type="radio"
                    name="dau"
                    value={range}
                    checked={formData.dau === range}
                    onChange={(e) => updateField("dau", e.target.value as DAURange)}
                    className="mr-2"
                    aria-required="true"
                  />
                  <span>{range}</span>
                </label>
              ))}
            </div>
            {errors.dau && (
              <p className="mt-1 text-sm text-red-400" role="alert">
                {errors.dau}
              </p>
            )}
          </div>

          {/* 사용 목적 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t.leadCapture.fields.purpose} <span className="text-red-400">*</span>
            </label>
            <div className="space-y-2">
              {PURPOSE_OPTIONS.map((purpose) => (
                <label
                  key={purpose}
                  className="flex items-center p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer hover:border-white/20 hover:bg-white/10 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.purposes?.includes(purpose) || false}
                    onChange={() => togglePurpose(purpose)}
                    className="mr-2"
                  />
                  <span>{purpose}</span>
                </label>
              ))}
            </div>
            {errors.purposes && (
              <p className="mt-1 text-sm text-red-400" role="alert">
                {errors.purposes}
              </p>
            )}
          </div>

          {/* 지금 가장 답답한 점 */}
          <div>
            <label htmlFor="painPoint" className="block text-sm font-medium mb-2">
              {t.leadCapture.fields.painPoint} <span className="text-red-400">*</span>
            </label>
            <textarea
              id="painPoint"
              value={formData.painPoint || ""}
              onChange={(e) => updateField("painPoint", e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 resize-none"
              aria-required="true"
              aria-invalid={!!errors.painPoint}
              aria-describedby={errors.painPoint ? "painPoint-error" : undefined}
            />
            {errors.painPoint && (
              <p id="painPoint-error" className="mt-1 text-sm text-red-400" role="alert">
                {errors.painPoint}
              </p>
            )}
          </div>

          {/* 현재 사용 중인 분석 도구 */}
          <div>
            <label htmlFor="currentTool" className="block text-sm font-medium mb-2">
              {t.leadCapture.fields.currentTool} <span className="text-red-400">*</span>
            </label>
            <select
              id="currentTool"
              value={formData.currentTool || ""}
              onChange={(e) => updateField("currentTool", e.target.value as AnalyticsTool)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
              aria-required="true"
              aria-invalid={!!errors.currentTool}
              aria-describedby={errors.currentTool ? "currentTool-error" : undefined}
            >
              <option value="">{t.leadCapture.placeholders.select}</option>
              {ANALYTICS_TOOLS.map((tool) => (
                <option key={tool} value={tool}>
                  {tool}
                </option>
              ))}
            </select>
            {errors.currentTool && (
              <p id="currentTool-error" className="mt-1 text-sm text-red-400" role="alert">
                {errors.currentTool}
              </p>
            )}
          </div>

          {/* Early Access에서 가장 기대하는 기능 */}
          <div>
            <label htmlFor="expectedFeature" className="block text-sm font-medium mb-2">
              {t.leadCapture.fields.expectedFeature} <span className="text-red-400">*</span>
            </label>
            <select
              id="expectedFeature"
              value={formData.expectedFeature || ""}
              onChange={(e) => updateField("expectedFeature", e.target.value as ExpectedFeature)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
              aria-required="true"
              aria-invalid={!!errors.expectedFeature}
              aria-describedby={errors.expectedFeature ? "expectedFeature-error" : undefined}
            >
              <option value="">{t.leadCapture.placeholders.select}</option>
              {EXPECTED_FEATURES.map((feature) => (
                <option key={feature} value={feature}>
                  {feature}
                </option>
              ))}
            </select>
            {errors.expectedFeature && (
              <p id="expectedFeature-error" className="mt-1 text-sm text-red-400" role="alert">
                {errors.expectedFeature}
              </p>
            )}
          </div>

          {/* 제출 버튼 */}
          <div className="pt-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? t.leadCapture.submitting : t.leadCapture.submit}
            </Button>
          </div>
        </form>
      </Card>
    </Container>
  );
}

