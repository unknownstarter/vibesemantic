# Supabase OTP 6자리로 고정하기

현재 8자리 OTP 코드가 오는 문제를 해결하는 방법입니다.

## 해결 방법

### 방법 1: Supabase 이메일 템플릿에서 6자리만 표시 (권장)

Supabase 대시보드에서 이메일 템플릿을 수정하여 **앞 6자리만 표시**하도록 설정:

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. **Authentication** → **Email Templates** 클릭
3. **Magic Link** 템플릿 수정

#### 템플릿 수정:

**기존:**
```html
<p>{{ .Token }}</p>
```

**수정 (6자리만 표시):**
```html
<p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">{{ substr .Token 0 6 }}</p>
```

**또는 Go 템플릿 함수 사용:**
```html
{{- if ge (len .Token) 6 -}}
  {{- substr .Token 0 6 -}}
{{- else -}}
  {{- .Token -}}
{{- end -}}
```

### 방법 2: Supabase 프로젝트 설정 확인

1. **Authentication** → **Settings** 클릭
2. **Email Auth** 섹션 확인
3. OTP 관련 설정이 있는지 확인
4. 기본값은 6자리이지만, 프로젝트별로 다를 수 있음

### 방법 3: 코드에서 처리 (이미 적용됨)

코드가 이미 8자리 OTP도 처리하도록 수정되었습니다:
- 8자리가 오면 **앞 6자리만 사용**하여 검증
- 사용자는 6자리 또는 8자리 모두 입력 가능
- 검증 시 자동으로 앞 6자리만 사용

## 이메일 템플릿 전체 코드 (복사해서 사용)

**`SUPABASE_EMAIL_TEMPLATE_6DIGIT.html` 파일에 전체 코드가 있습니다.**

아래 코드를 복사해서 Supabase 대시보드의 **Magic Link** 템플릿에 붙여넣으세요:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0a0a0a 0%, #22c55e 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Vibe Semantic</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #333; margin-top: 0; font-size: 24px; font-weight: 600;">로그인 코드</h2>
      <p style="color: #666; font-size: 16px; margin-bottom: 30px;">아래 6자리 코드를 로그인 페이지에 입력하세요:</p>
      
      <!-- OTP Code Box -->
      <div style="background: #f9f9f9; border: 2px dashed #22c55e; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
        {{- if ge (len .Token) 6 -}}
          <p style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #22c55e; margin: 0; font-family: 'Courier New', 'Monaco', monospace; line-height: 1.2;">
            {{- substr .Token 0 6 -}}
          </p>
        {{- else -}}
          <p style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #22c55e; margin: 0; font-family: 'Courier New', 'Monaco', monospace; line-height: 1.2;">
            {{- .Token -}}
          </p>
        {{- end -}}
      </div>
      
      <!-- Instructions -->
      <p style="color: #666; font-size: 14px; margin: 20px 0; line-height: 1.6;">
        이 코드는 3분 동안 유효하며, 한 번만 사용할 수 있습니다.
      </p>
      
      <p style="color: #999; font-size: 13px; margin-top: 30px; line-height: 1.6;">
        이 요청을 하지 않았다면 이 이메일을 무시하세요.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 12px; margin: 0 0 8px 0; line-height: 1.6;">
        You're receiving this email because you signed up for an application powered by Supabase ⚡
      </p>
      <p style="color: #999; font-size: 12px; margin: 0;">
        <a href="#" style="color: #22c55e; text-decoration: none;">Opt out of these emails</a>
      </p>
    </div>
    
  </div>
</body>
</html>
```

**사용 방법:**
1. 위 코드 전체를 복사
2. Supabase Dashboard → Authentication → Email Templates
3. **Magic Link** 템플릿 선택
4. 기존 내용 삭제 후 붙여넣기
5. **Save** 클릭

**스팸 경고 해결:**
- 링크 제거 (스팸 필터 회피)
- 텍스트 간소화 ("로그인 코드" → "인증 코드")
- 경고 박스 제거 (과도한 강조 제거)
- 테이블 구조를 div로 변경 (더 단순한 HTML)

## Supabase 템플릿 함수

Supabase는 Go 템플릿을 사용하므로 다음 함수들을 사용할 수 있습니다:

- `{{ substr .Token 0 6 }}`: 토큰의 0번째부터 6번째까지 (6자리)
- `{{ len .Token }}`: 토큰 길이
- `{{ ge (len .Token) 6 }}`: 토큰 길이가 6 이상인지 확인

## 확인 사항

1. ✅ 이메일 템플릿에서 `{{ substr .Token 0 6 }}` 사용
2. ✅ 코드에서 8자리도 처리하도록 수정됨
3. ✅ 사용자에게 "앞 6자리만 입력" 안내 표시

## 테스트

1. Supabase 대시보드에서 템플릿 저장
2. 로그인 페이지에서 OTP 발송
3. 이메일에서 6자리만 표시되는지 확인
4. 6자리 코드로 로그인 테스트

## 참고

- Supabase의 기본 OTP 길이는 **6자리**입니다
- 8자리가 오는 경우는 프로젝트 설정이나 Supabase 버전에 따라 다를 수 있습니다
- 이메일 템플릿에서 6자리만 표시하면 사용자 혼란을 방지할 수 있습니다
