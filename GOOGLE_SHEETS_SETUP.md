# Google Sheets 연동 설정 가이드 (Google Apps Script 방식)

서비스 계정 키 생성이 차단된 경우, Google Apps Script를 사용하는 방법입니다.

## 1. Google Sheets 문서 생성

1. 새 Google Sheets 문서 생성
2. 문서 이름 설정 (예: "Vibe Semantic Early Access Leads")
3. Sheets URL에서 Spreadsheet ID 추출
   - URL 예: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - `SPREADSHEET_ID` 부분을 복사

## 2. Google Apps Script 설정

### 2-1. Apps Script 에디터 열기
1. Google Sheets에서 "확장 프로그램" > "Apps Script" 클릭
2. 새 스크립트 에디터가 열립니다

### 2-2. 스크립트 작성
프로젝트 루트의 `google-apps-script-code.js` 파일을 열어서 전체 코드를 복사하거나, 아래 코드를 에디터에 붙여넣기:

**중요**: 기존 코드가 있다면 전체를 아래 코드로 교체하세요.

```javascript
// Google Apps Script 코드
// 이 코드를 Google Apps Script 에디터에 복사하여 붙여넣으세요

function doPost(e) {
  try {
    // 요청 데이터 파싱
    const data = JSON.parse(e.postData.contents);
    
    // Access Request인지 확인
    const isAccessRequest = data.type === 'access_request';
    
    if (isAccessRequest) {
      // 권한 요청 데이터 처리
      const accessSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Access Requests') || 
                          SpreadsheetApp.getActiveSpreadsheet().insertSheet('Access Requests');
      
      // 헤더가 없으면 추가
      if (accessSheet.getLastRow() === 0) {
        accessSheet.appendRow([
          '요청 시간',
          '사용자 이메일',
          '사용자 ID',
          '메시지'
        ]);
      }
      
      // 데이터 추가
      accessSheet.appendRow([
        data.requestedAt || new Date().toISOString(),
        data.userEmail || '',
        data.userId || '',
        data.message || ''
      ]);
      
      // 성공 응답
      return ContentService.createTextOutput(
        JSON.stringify({ success: true, message: '권한 요청이 저장되었습니다.' })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
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
```

**이 코드는 다음 3가지 타입의 데이터를 처리합니다:**
1. **Access Requests** (`type: 'access_request'`) → "Access Requests" 시트에 저장
2. **Pricing Forms** (`planType` 필드 있음) → "Pricing" 시트에 저장
3. **Early Access Forms** (기타) → "Sheet1" 시트에 저장

### 2-3. 스크립트 저장
1. 상단의 "프로젝트 이름 없음" 클릭하여 프로젝트 이름 변경 (예: "Vibe Semantic Leads")
2. 저장 아이콘 클릭 또는 `Cmd+S` (Mac) / `Ctrl+S` (Windows)

### 2-4. 웹 앱으로 배포

**기존 배포가 있는 경우:**
1. 상단 메뉴에서 "배포" > "배포 관리" 클릭
2. 기존 배포 옆의 "수정" (연필 아이콘) 클릭
3. "버전" 드롭다운에서 "새 버전" 선택
4. "배포" 버튼 클릭
5. **새 웹 앱 URL 확인** (변경되었을 수 있음)

**새로 배포하는 경우:**
1. 상단 메뉴에서 "배포" > "새 배포" 클릭
2. "유형 선택" 옆의 톱니바퀴 아이콘 클릭 > "웹 앱" 선택
3. 설정:
   - **설명**: "Vibe Semantic API" (선택사항)
   - **실행할 사용자**: "나" 선택
   - **액세스 권한**: "모든 사용자" 선택
4. "배포" 버튼 클릭
5. 권한 승인:
   - "권한 확인" 클릭
   - Google 계정 선택
   - "고급" > "안전하지 않은 페이지로 이동" 클릭 (경고 메시지가 나올 경우)
   - "허용" 클릭
6. **웹 앱 URL 복사** (중요!)
   - 예: `https://script.google.com/macros/s/AKfycby.../exec`
   - 이 URL을 `.env.local`에 저장해야 합니다

## 3. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일 생성:

```env
GOOGLE_SHEETS_WEB_APP_URL=여기에_웹_앱_URL_입력
```

## 4. 완료

이제 다음 데이터들이 Google Sheets에 자동으로 저장됩니다:
- **Early Access 폼** → "Sheet1" 시트
- **Pricing 폼** → "Pricing" 시트
- **권한 요청** → "Access Requests" 시트 (자동 생성됨)

## 5. Access Requests 시트 확인

1. Google Sheets 문서로 돌아가기
2. 하단 탭에서 "Access Requests" 시트 확인
   - 없으면 첫 권한 요청이 들어올 때 자동으로 생성됩니다
3. 시트에는 다음 컬럼이 있습니다:
   - 요청 시간
   - 사용자 이메일
   - 사용자 ID
   - 메시지

## 참고사항

- 웹 앱 URL은 절대 공개하지 마세요 (보안상 중요)
- 스크립트를 수정한 경우 "배포" > "배포 관리"에서 "새 버전"으로 업데이트해야 합니다
- 첫 실행 시 권한 승인이 필요할 수 있습니다
- "Access Requests" 시트는 첫 권한 요청이 들어올 때 자동으로 생성됩니다
- 권한 요청을 승인하려면 Supabase Dashboard에서 `user_profiles` 테이블의 `access_level`을 `approved`로 변경하세요
