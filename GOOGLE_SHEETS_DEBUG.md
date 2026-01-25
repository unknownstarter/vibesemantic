# Google Sheets 연동 디버깅 가이드

## 문제: 권한 요청이 Google Sheets에 저장되지 않음

## 확인 사항

### 1. 환경 변수 확인

**로컬 개발:**
```bash
# .env.local 파일 확인
cat .env.local | grep GOOGLE_SHEETS_WEB_APP_URL
```

**프로덕션 (Vercel):**
1. Vercel Dashboard 접속
2. 프로젝트 선택 → **Settings** → **Environment Variables**
3. `GOOGLE_SHEETS_WEB_APP_URL` 확인

### 2. Google Apps Script 배포 확인

1. **Google Sheets 문서 열기**
2. **확장 프로그램** > **Apps Script** 클릭
3. **배포** > **배포 관리** 클릭
4. 배포가 **"웹 앱"**으로 되어 있는지 확인
5. **실행 사용자**: "나" 또는 "웹 앱에 액세스하는 사용자"
6. **액세스 권한**: "모든 사용자" 또는 "내가 액세스할 수 있는 사용자"

### 3. Google Apps Script 코드 확인

`doPost` 함수에 다음 코드가 있는지 확인:

```javascript
function doPost(e) {
  try {
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
    
    // ... 기존 코드
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
```

### 4. 테스트 방법

#### 방법 1: 브라우저에서 직접 테스트

```bash
# GET 요청 (기본 테스트)
curl "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"

# POST 요청 (실제 테스트)
curl -X POST "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "access_request",
    "userEmail": "test@example.com",
    "userId": "test-id",
    "requestedAt": "2026-01-25T12:00:00.000Z",
    "message": "테스트 메시지"
  }'
```

**예상 응답:**
```json
{
  "success": true,
  "message": "권한 요청이 저장되었습니다."
}
```

**에러 응답 (HTML 리다이렉트):**
```html
<HTML>
<HEAD>
<TITLE>Moved Temporarily</TITLE>
...
```

#### 방법 2: 앱에서 테스트

1. 개발 서버 실행: `npm run dev`
2. 브라우저 콘솔 열기 (F12)
3. 권한 요청하기 클릭
4. 콘솔에서 다음 로그 확인:
   - `[Access Request] Successfully sent to Google Sheets:` - 성공
   - `[Access Request] Failed to send to Google Sheets:` - 실패 (에러 상세 확인)

### 5. 일반적인 문제와 해결 방법

#### 문제 1: HTML 리다이렉트 응답

**증상:**
- curl 테스트 시 HTML 리다이렉트 페이지 반환
- `Invalid response format. Expected JSON but got text/html`

**해결:**
1. Google Apps Script 배포 재설정
   - **배포** > **배포 관리** > 기존 배포 삭제
   - **배포** > **새 배포** > **웹 앱** 선택
   - **실행 사용자**: "나"
   - **액세스 권한**: "모든 사용자"
   - 배포 후 **새 URL 복사**

2. 환경 변수 업데이트
   - `.env.local` (로컬)
   - Vercel Dashboard (프로덕션)

#### 문제 2: CORS 에러

**증상:**
- 브라우저 콘솔에 CORS 에러
- `Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**해결:**
- Google Apps Script는 CORS를 자동으로 처리하므로, 배포 설정 확인
- **액세스 권한**을 "모든 사용자"로 설정

#### 문제 3: 권한 오류

**증상:**
- `Script function not found: doPost`
- `Authorization required`

**해결:**
1. Apps Script 에디터에서 **실행** > **doPost** 선택
2. 권한 승인
3. 배포 재설정

#### 문제 4: 시트가 생성되지 않음

**증상:**
- 요청은 성공하지만 Google Sheets에 데이터가 없음

**해결:**
1. Google Sheets 문서 열기
2. "Access Requests" 시트가 있는지 확인
3. 없으면 수동으로 생성하거나, 다음 요청 시 자동 생성됨

### 6. 로그 확인

**로컬 개발:**
```bash
# 터미널에서 로그 확인
npm run dev
# 권한 요청 후 콘솔 로그 확인
```

**프로덕션 (Vercel):**
1. Vercel Dashboard 접속
2. 프로젝트 선택 → **Logs** 탭
3. `[Access Request]` 또는 `[Google Sheets]` 검색

**예상 로그:**
```
[Access Request] Successfully sent to Google Sheets: { userEmail: '...', userId: '...' }
[Google Sheets] Successfully appended: { dataType: 'access_request', result: '...' }
```

**에러 로그:**
```
[Access Request] Failed to send to Google Sheets: {
  error: '...',
  webAppUrl: 'SET' | 'NOT SET',
  ...
}
```

### 7. 수동 테스트 스크립트

다음 스크립트를 실행하여 Google Sheets 연동을 테스트할 수 있습니다:

```bash
# test-google-sheets.sh
#!/bin/bash

WEB_APP_URL="https://script.google.com/macros/s/AKfycbxTS2EuaKP8LMR3o-lnzw9FywEyLtvlOruBwQjJSpJH2Ui0mnBN2qAzImY6zHdH59q-Dg/exec"

echo "Testing Google Sheets API..."
echo "URL: $WEB_APP_URL"
echo ""

# POST 요청
curl -X POST "$WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "access_request",
    "userEmail": "test@example.com",
    "userId": "test-user-id",
    "requestedAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'",
    "message": "테스트 권한 요청"
  }' \
  -v

echo ""
echo "Test completed. Check Google Sheets for the new entry."
```

### 8. 체크리스트

- [ ] `GOOGLE_SHEETS_WEB_APP_URL` 환경 변수 설정됨
- [ ] Google Apps Script에 `doPost` 함수 있음
- [ ] `doPost` 함수에 `access_request` 처리 로직 있음
- [ ] Google Apps Script가 "웹 앱"으로 배포됨
- [ ] 배포 URL이 환경 변수와 일치함
- [ ] "Access Requests" 시트가 Google Sheets에 있음 (또는 자동 생성됨)
- [ ] 테스트 요청이 성공적으로 응답함 (JSON 반환)
- [ ] 앱에서 권한 요청 시 콘솔에 성공 로그가 나옴

### 9. 다음 단계

문제가 계속되면:
1. Vercel 로그에서 `[Access Request] Failed to send to Google Sheets:` 로그 확인
2. 에러 메시지와 스택 트레이스 확인
3. Google Apps Script 실행 로그 확인:
   - Apps Script 에디터 → **보기** → **실행 로그**
