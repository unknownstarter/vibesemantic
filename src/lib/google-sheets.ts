import { LeadFormData } from "@/entities/lead/types";
import { PricingFormData } from "@/entities/pricing/types";

// Google Apps Script 웹 앱을 통해 Google Sheets에 데이터 추가
export async function appendToSheet(data: LeadFormData | PricingFormData | Record<string, any>) {
  const webAppUrl = process.env.GOOGLE_SHEETS_WEB_APP_URL;

  if (!webAppUrl) {
    throw new Error("GOOGLE_SHEETS_WEB_APP_URL 환경 변수가 설정되지 않았습니다.");
  }

  try {
    // Google Apps Script는 리다이렉트를 반환할 수 있으므로 redirect: 'follow' 사용
    const response = await fetch(webAppUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      redirect: 'follow', // 리다이렉트 자동 따라가기
    });

    // 응답이 HTML인 경우 (에러 페이지일 수 있음)
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const text = await response.text()
      console.error('[Google Sheets] Non-JSON response:', {
        status: response.status,
        statusText: response.statusText,
        contentType,
        responseText: text.substring(0, 500), // 처음 500자만
        url: webAppUrl,
        dataType: data.type,
      })
      throw new Error(`Invalid response format. Expected JSON but got ${contentType}. Status: ${response.status}`)
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Failed to read error response')
      console.error('[Google Sheets] HTTP error:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        url: webAppUrl,
        dataType: data.type,
      })
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      console.error('[Google Sheets] API returned error:', {
        result,
        dataType: data.type,
        url: webAppUrl,
      })
      throw new Error(result.error || "데이터 저장에 실패했습니다.");
    }

    console.log('[Google Sheets] Successfully appended:', {
      dataType: data.type,
      result: result.message,
    })

    return result;
  } catch (error) {
    console.error("[Google Sheets] Error appending to sheet:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      webAppUrl,
      dataType: data.type,
    });
    throw error;
  }
}
