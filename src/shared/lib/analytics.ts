"use client";

declare global {
  interface Window {
    gtag?: (
      command: "config" | "event" | "js" | "set",
      targetId: string | Date,
      config?: Record<string, any>
    ) => void;
    dataLayer?: any[];
  }
}

export const GA_MEASUREMENT_ID = "G-HEGK4EYKF1";

export const pageview = (url: string) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("config", GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
};

export const event = ({
  action,
  category,
  label,
  value,
}: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

export const viewSection = (sectionName: string) => {
  event({
    action: "view_section",
    category: "engagement",
    label: sectionName,
  });
};

export const clickButton = (buttonName: string, location?: string) => {
  event({
    action: "click",
    category: "button",
    label: buttonName,
    value: location ? 1 : undefined,
  });
};

export const submitForm = (formName: string, success: boolean) => {
  event({
    action: success ? "form_submit_success" : "form_submit_error",
    category: "form",
    label: formName,
  });
};

export const changeLanguage = (language: string) => {
  event({
    action: "change_language",
    category: "settings",
    label: language,
  });
};

