# Supabase OTP 코드 이메일 설정 가이드

현재 이메일이 매직링크로 오는 문제를 해결하기 위해 Supabase 이메일 템플릿을 수정해야 합니다.

## 문제

`signInWithOtp`를 호출해도 이메일이 매직링크로 오는 이유는 **Supabase 이메일 템플릿이 매직링크 형식으로 설정되어 있기 때문**입니다.

## 해결 방법

### 1. Supabase 대시보드 접속

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택 (`gvivweuqmipklxfymoxg`)
3. **Authentication** → **Email Templates** 클릭

### 2. Magic Link 템플릿 수정

**Magic Link** 템플릿을 찾아서 다음으로 수정:

#### 기존 (매직링크):
```html
<h2>Magic Link</h2>
<p>Follow this link to login:</p>
<p><a href="{{ .ConfirmationURL }}">Log In</a></p>
```

#### 수정 (OTP 코드 - 6자리만 표시):
```html
<h2>로그인 코드</h2>
<p>아래 6자리 코드를 입력하세요:</p>
<p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #000;">{{ substr .Token 0 6 }}</p>
<p style="color: #666; font-size: 12px;">이 코드는 1시간 동안 유효합니다.</p>
```

**중요**: Supabase 템플릿에서 `{{ substr .Token 0 6 }}`를 사용하면 토큰의 앞 6자리만 표시됩니다. 
만약 이 함수가 작동하지 않으면, JavaScript로 처리하거나 템플릿에서 직접 6자리만 표시하도록 설정하세요.

### 3. 템플릿 변수 설명

- `{{ .Token }}`: 6자리 OTP 코드 (예: `123456`)
- `{{ .ConfirmationURL }}`: 매직링크 URL (OTP 코드 모드에서는 사용 안 함)
- `{{ .Email }}`: 사용자 이메일 주소

### 4. 저장 및 테스트

1. **Save** 버튼 클릭
2. 변경사항은 **즉시 적용**됨
3. 로그인 페이지에서 OTP 발송 테스트

## 전체 이메일 템플릿 예시

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Vibe Semantic</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">로그인 코드</h2>
    <p style="color: #666;">아래 6자리 코드를 로그인 페이지에 입력하세요:</p>
    
    <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; margin: 0; font-family: 'Courier New', monospace;">{{ substr .Token 0 6 }}</p>
    </div>
    
    <p style="color: #999; font-size: 11px; margin-top: 10px;">
      ⚠️ 코드가 8자리로 오는 경우, 앞 6자리만 입력하세요.
    </p>
    
    <p style="color: #999; font-size: 12px; margin-top: 20px;">
      이 코드는 1시간 동안 유효하며, 한 번만 사용할 수 있습니다.<br>
      이 요청을 하지 않았다면 이 이메일을 무시하세요.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
    <p style="color: #999; font-size: 12px;">
      © 2026 Dropdown. All rights reserved.
    </p>
  </div>
</body>
</html>
```

## 중요 사항

1. **템플릿 저장 후 즉시 적용**: 재배포나 재시작 불필요
2. **`{{ .Token }}` 변수 필수**: 이 변수가 없으면 OTP 코드가 표시되지 않음
3. **매직링크 URL 제거**: `{{ .ConfirmationURL }}` 링크는 제거하거나 주석 처리
4. **테스트**: 템플릿 저장 후 실제로 OTP 발송 테스트

## 문제 해결

### 여전히 매직링크가 온다면:
1. Supabase 대시보드에서 템플릿이 정확히 저장되었는지 확인
2. 브라우저 캐시 클리어 후 다시 시도
3. 다른 이메일 주소로 테스트

### OTP 코드가 표시되지 않는다면:
1. `{{ .Token }}` 변수가 템플릿에 정확히 입력되었는지 확인
2. 변수 이름이 대소문자 정확한지 확인 (`{{ .Token }}` 정확)
3. Supabase 로그에서 이메일 전송 상태 확인

## 참고

- Supabase는 기본적으로 매직링크 템플릿을 사용합니다
- OTP 코드 모드로 전환하려면 반드시 이메일 템플릿을 수정해야 합니다
- 코드 레벨에서만으로는 이메일 템플릿을 변경할 수 없습니다
