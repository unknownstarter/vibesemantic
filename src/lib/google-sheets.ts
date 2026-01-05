import { LeadFormData } from "@/entities/lead/types";
import { PricingFormData } from "@/entities/pricing/types";

// Google Apps Script 웹 앱을 통해 Google Sheets에 데이터 추가
export async function appendToSheet(data: LeadFormData | PricingFormData | Record<string, any>) {
  const webAppUrl = process.env.GOOGLE_SHEETS_WEB_APP_URL;

  if (!webAppUrl) {
    throw new Error("GOOGLE_SHEETS_WEB_APP_URL 환경 변수가 설정되지 않았습니다.");
  }

  try {
    const response = await fetch(webAppUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || "데이터 저장에 실패했습니다.");
    }

    return result;
  } catch (error) {
    console.error("Error appending to Google Sheets:", error);
    throw error;
  }
}
