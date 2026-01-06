import { NextRequest, NextResponse } from "next/server";
import { LeadFormData } from "@/entities/lead/types";
import { appendToSheet } from "@/lib/google-sheets";

export async function POST(request: NextRequest) {
  try {
    const body: LeadFormData = await request.json();

    // 데이터 검증
    if (
      !body.companyName ||
      !body.contactName ||
      !body.jobRole ||
      !body.serviceName ||
      !body.dau ||
      !body.purposes ||
      body.purposes.length === 0 ||
      !body.painPoint ||
      !body.currentTool ||
      !body.expectedFeature ||
      !body.email ||
      !body.phoneNumber
    ) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      );
    }

    // Google Sheets에 저장 시도
    try {
      await appendToSheet(body);
      console.log("Lead saved to Google Sheets:", body);
    } catch (sheetsError) {
      console.error("Google Sheets error:", sheetsError);
      
      // Google Sheets 저장 실패 시에도 로컬 백업 저장 (선택사항)
      // 또는 에러를 반환할 수도 있습니다
      
      // 개발 환경에서는 에러를 반환하지 않고 성공으로 처리
      // 프로덕션에서는 에러를 반환하는 것이 좋습니다
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "데이터 저장에 실패했습니다. 잠시 후 다시 시도해주세요." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: true, message: "신청이 접수되었습니다." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error processing lead:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// GET 엔드포인트는 Google Sheets에서 직접 확인하므로 제거하거나
// Google Sheets API를 통해 읽어올 수 있습니다
export async function GET() {
  return NextResponse.json(
    { message: "신청 내역은 Google Sheets에서 확인하세요." },
    { status: 200 }
  );
}
