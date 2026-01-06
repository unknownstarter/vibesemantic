// Google Apps Script 코드
// 이 코드를 Google Apps Script 에디터에 복사하여 붙여넣으세요

function doPost(e) {
  try {
    // 요청 데이터 파싱
    const data = JSON.parse(e.postData.contents);
    
    // Early Access 폼인지 Pricing 폼인지 확인
    const isPricingForm = data.planType !== undefined;
    
    if (isPricingForm) {
      // Pricing 폼 데이터 처리
      const pricingSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pricing') || 
                          SpreadsheetApp.getActiveSpreadsheet().insertSheet('Pricing');
      
      // 헤더가 없으면 추가
      if (pricingSheet.getLastRow() === 0) {
        pricingSheet.appendRow([
          '제출 시간',
          '플랜 타입',
          '이메일',
          '전화번호',
          '담당자 이름',
          '회사명'
        ]);
      }
      
      // 데이터 추가
      pricingSheet.appendRow([
        new Date().toISOString(),
        data.planType || '',
        data.email || '',
        data.phoneNumber || '',
        data.contactName || '',
        data.companyName || ''
      ]);
    } else {
      // Early Access 폼 데이터 처리
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1') || 
                    SpreadsheetApp.getActiveSpreadsheet().insertSheet('Sheet1');
      
      // 헤더가 없으면 추가
      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          '제출 시간',
          '회사명',
          '담당자 이름',
          '이메일',
          '전화번호',
          '직책/직무',
          '서비스 이름',
          '서비스 DAU',
          '사용 목적',
          '지금 가장 답답한 점',
          '현재 사용 중인 분석 도구',
          '가장 기대하는 기능'
        ]);
      }
      
      // 데이터 추가
      sheet.appendRow([
        new Date().toISOString(),
        data.companyName || '',
        data.contactName || '',
        data.email || '',
        data.phoneNumber || '',
        data.jobRole || '',
        data.serviceName || '',
        data.dau || '',
        Array.isArray(data.purposes) ? data.purposes.join(', ') : data.purposes || '',
        data.painPoint || '',
        data.currentTool || '',
        data.expectedFeature || ''
      ]);
    }
    
    // 성공 응답
    return ContentService.createTextOutput(
      JSON.stringify({ success: true, message: '데이터가 저장되었습니다.' })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // 에러 응답
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// GET 요청 처리 (테스트용)
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ 
      success: true, 
      message: 'Google Apps Script is working! Use POST to submit data.',
      timestamp: new Date().toISOString()
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

