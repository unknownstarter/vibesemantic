import { NextRequest, NextResponse } from "next/server";
import { PricingFormData } from "@/entities/pricing/types";
import { appendToSheet } from "@/lib/google-sheets";

export async function POST(request: NextRequest) {
  try {
    const body: PricingFormData = await request.json();

    // 데이터 검증
    if (body.planType === "basic") {
      if (!body.email) {
        return NextResponse.json(
          { error: "이메일을 입력해주세요." },
          { status: 400 }
        );
      }
    } else if (body.planType === "popular") {
      if (!body.phoneNumber) {
        return NextResponse.json(
          { error: "전화번호를 입력해주세요." },
          { status: 400 }
        );
      }
    } else if (body.planType === "premium") {
      if (!body.email || !body.phoneNumber || !body.contactName || !body.companyName) {
        return NextResponse.json(
          { error: "필수 필드가 누락되었습니다." },
          { status: 400 }
        );
      }
    }

    // Google Sheets에 저장할 데이터 포맷팅
    const sheetData = {
      planType: body.planType,
      email: "email" in body ? body.email : "",
      phoneNumber: "phoneNumber" in body ? body.phoneNumber : "",
      contactName: "contactName" in body ? body.contactName : "",
      companyName: "companyName" in body ? body.companyName : "",
      submittedAt: new Date().toISOString(),
    };

    // Google Sheets에 저장 시도
    try {
      await appendToSheet(sheetData as any);
      console.log("Pricing form saved to Google Sheets:", sheetData);
    } catch (sheetsError) {
      console.error("Google Sheets error:", sheetsError);
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
    console.error("Error processing pricing form:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

