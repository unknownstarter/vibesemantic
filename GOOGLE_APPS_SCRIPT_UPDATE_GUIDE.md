# Google Apps Script 업데이트 가이드

기존 Google Apps Script에 Access Requests 기능을 추가하는 방법입니다.

## 방법 1: 기존 스크립트 업데이트 (권장)

### 1단계: Google Sheets 열기
1. Google Sheets 문서 열기
2. "확장 프로그램" > "Apps Script" 클릭

### 2단계: 코드 복사
1. 프로젝트 루트의 `google-apps-script-code.js` 파일 열기
2. **전체 코드** 복사 (Cmd+A / Ctrl+A → Cmd+C / Ctrl+C)

### 3단계: Apps Script 에디터에 붙여넣기
1. Apps Script 에디터에서 **기존 코드 전체 선택** (Cmd+A / Ctrl+A)
2. **삭제** (Delete 또는 Backspace)
3. 복사한 새 코드 **붙여넣기** (Cmd+V / Ctrl+V)

### 4단계: 저장
1. 저장 아이콘 클릭 또는 `Cmd+S` (Mac) / `Ctrl+S` (Windows)

### 5단계: 새 버전으로 배포
1. 상단 메뉴에서 "배포" > "배포 관리" 클릭
2. 기존 배포 옆의 **"수정"** (연필 아이콘) 클릭
3. "버전" 드롭다운에서 **"새 버전"** 선택
4. **"배포"** 버튼 클릭
5. 완료!

## 방법 2: 수동으로 코드 추가

기존 코드를 유지하면서 Access Requests 기능만 추가하려면:

### 1단계: doPost 함수 찾기
Apps Script 에디터에서 `function doPost(e)` 함수를 찾습니다.

### 2단계: 코드 추가
`doPost` 함수의 **가장 위쪽** (데이터 파싱 직후)에 다음 코드를 추가:

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // 👇 이 부분을 추가하세요
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
    // 👆 여기까지 추가
    
    // 기존 코드 계속...
```

### 3단계: 저장 및 배포
1. 저장 (Cmd+S / Ctrl+S)
2. "배포" > "배포 관리" > "수정" > "새 버전" > "배포"

## 테스트

### 방법 1: 브라우저에서 직접 테스트
웹 앱 URL로 GET 요청:
```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

성공하면 다음 응답이 나옵니다:
```json
{
  "success": true,
  "message": "Google Apps Script is working! Use POST to submit data.",
  "timestamp": "2026-01-25T10:00:00.000Z"
}
```

### 방법 2: 앱에서 테스트
1. 새 사용자로 가입
2. Dashboard에서 "새 프로젝트" 클릭
3. 권한 요청 팝업에서 "권한 요청하기" 클릭
4. Google Sheets의 "Access Requests" 시트 확인

## 문제 해결

### "Access Requests" 시트가 생성되지 않아요
- 첫 권한 요청이 들어올 때 자동으로 생성됩니다
- 수동으로 생성하려면 Google Sheets에서 "시트 추가" > "Access Requests" 이름으로 생성

### 권한 오류가 발생해요
1. "배포" > "배포 관리"에서 배포 삭제
2. "배포" > "새 배포"로 다시 배포
3. 권한 다시 승인

### 코드가 작동하지 않아요
1. Apps Script 에디터에서 "실행" > "doGet" 선택하여 테스트
2. "보기" > "실행 로그"에서 에러 확인
3. 코드 문법 오류 확인 (괄호, 따옴표 등)

## 완료 확인

✅ 코드 업데이트 완료
✅ 새 버전으로 배포 완료
✅ "Access Requests" 시트 자동 생성 확인
✅ 권한 요청 테스트 성공

이제 사용자가 권한을 요청하면 Google Sheets의 "Access Requests" 시트에 자동으로 저장됩니다!
