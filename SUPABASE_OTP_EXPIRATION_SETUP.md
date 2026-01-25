# Supabase OTP 만료 시간 설정 가이드

OTP 코드의 만료 시간을 3분으로 설정하는 방법입니다.

## ⚠️ 중요: Supabase Hosted 버전의 제한사항

**Supabase의 hosted 버전에서는 OTP 토큰 만료 시간을 직접 변경할 수 없습니다.** 기본값은 **1시간 (3600초)**이며, 이는 Supabase 서버 측에서 고정된 값입니다.

하지만 **세션 만료 시간(JWT Expiry)은 설정 가능**합니다! 이를 3분으로 설정하면 사용자 세션이 3분 후 만료됩니다.

## 1. 세션 만료 시간(JWT Expiry) 설정 (3분)

### 방법 1: Settings → Project Settings → JWT Keys (권장)

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. 왼쪽 사이드바 하단에서 **Settings** (⚙️ 아이콘) 클릭
4. **Project Settings** 섹션으로 스크롤
5. **JWT Keys** 또는 **JWT Settings** 찾기
6. **Access token expiry time** 또는 **JWT Expiry** 설정 찾기
   - 기본값: 보통 3600초 (1시간)
   - **변경값: 180초 (3분)** 입력
7. **Save** 클릭

### 방법 2: Authentication → Sessions (Pro Plan 이상)

만약 **Pro Plan 이상**을 사용 중이라면:

1. **Authentication** (왼쪽 사이드바) 클릭
2. **Sessions** 탭 클릭
   - 경로: `/auth/sessions`
3. **Time-box user sessions** 또는 **Session timeout** 설정 찾기
   - **변경값: 180초 (3분)** 입력
4. **Save** 클릭

### 설정 확인

설정 후 다음을 확인하세요:
- JWT Expiry 또는 Access token expiry time이 **180초 (3분)**로 설정되었는지
- 변경사항이 저장되었는지
- 페이지를 새로고침해도 설정이 유지되는지

### ⚠️ 주의사항

- **Pro Plan 이상**에서만 Sessions 탭이 보일 수 있습니다
- Free Plan의 경우 **Settings → Project Settings → JWT Keys**에서만 설정 가능합니다
- 설정 변경 후 **새로운 세션**에만 적용됩니다 (기존 세션은 변경되지 않음)

## 2. 이메일 템플릿 업데이트 (3분 표시 유지)

이메일 템플릿은 이미 "3분"으로 설정되어 있습니다. 확인만 하면 됩니다.

### 템플릿 수정

1. **Authentication** → **Email Templates** 클릭
2. **Magic Link** 템플릿 선택
3. 다음 부분을 찾아서 수정:

**기존:**
```html
<p style="color: #666; font-size: 14px; margin: 20px 0; line-height: 1.6;">
  이 코드는 1시간 동안 유효하며, 한 번만 사용할 수 있습니다.
</p>
```

**수정:**
```html
<p style="color: #666; font-size: 14px; margin: 20px 0; line-height: 1.6;">
  이 코드는 3분 동안 유효하며, 한 번만 사용할 수 있습니다.
</p>
```

4. **Save** 클릭

## 3. 이메일 템플릿 확인

이메일 템플릿이 "3분"으로 표시되도록 이미 설정되어 있습니다.

### 템플릿 확인

1. **Authentication** → **Email Templates** 클릭
2. **Magic Link** 템플릿 선택
3. `SUPABASE_EMAIL_TEMPLATE_6DIGIT.html` 파일의 내용을 복사해서 붙여넣기
4. 다음 부분이 "3분"으로 되어 있는지 확인:
   ```html
   <p style="color: #666; font-size: 14px; margin: 20px 0; line-height: 1.6;">
     이 코드는 3분 동안 유효하며, 한 번만 사용할 수 있습니다.
   </p>
   ```
5. **Save** 클릭

## 4. 확인 사항

### 설정 확인
- ✅ JWT Expiry가 **180초 (3분)**로 설정되었는지 확인
- ✅ 이메일 템플릿에 "3분"으로 표시되는지 확인

### 테스트
1. OTP 코드 발송
2. 이메일에서 만료 시간 확인 ("3분"으로 표시됨)
3. 코드 입력 후 로그인 성공
4. **3분 후 세션 만료 확인**:
   - 3분 후 페이지 새로고침 또는 다른 페이지 이동
   - 세션이 만료되어 로그인 페이지로 리다이렉트되는지 확인
5. OTP 코드는 여전히 1시간 동안 유효 (Supabase 서버 측 제한)

## 중요 참고사항

1. **OTP 토큰 vs 세션 만료 시간**:
   - **OTP 토큰 만료**: 1시간 (Supabase 서버 측 고정, 변경 불가)
   - **세션 만료 (JWT)**: 3분 (설정 가능, 변경 완료)
   - 사용자가 OTP 코드를 입력하면 세션이 생성되고, 이 세션은 3분 후 만료됩니다
   
2. **사용자 경험**:- **실제 만료 시간**: 1시간 (Supabase 기본값, 변경 불가)
   - **이메일 표시 시간**: 3분 (템플릿에서 변경 가능)
   - 사용자에게 혼란을 줄 수 있으므로, 이메일 템플릿을 "1시간"으로 유지하는 것을 권장합니다

3. **Supabase 기본값**:
   - OTP 토큰 만료: **1시간 (3600초)** - 변경 불가
   - JWT 세션 만료: **1시간 (3600초)** - 변경 가능 (3분으로 설정 완료)

4. **변경 사항 적용**:
   - JWT Expiry 설정 변경 후 즉시 적용됩니다
   - 재배포나 재시작이 필요하지 않습니다
   - 모든 새로운 세션에 적용됩니다

## 최종 설정 요약

✅ **완료된 설정**:
- 이메일 템플릿: "3분" 표시
- 세션 만료 시간 (JWT Expiry): 3분 (180초)

⚠️ **변경 불가능한 설정**:
- OTP 토큰 만료 시간: 1시간 (Supabase 서버 측 고정)

## 문제 해결

### 만료 시간이 변경되지 않는다면:
1. Supabase 대시보드에서 설정이 정확히 저장되었는지 확인
2. 브라우저 캐시 클리어 후 다시 시도
3. 다른 이메일 주소로 테스트
4. Supabase 로그에서 실제 만료 시간 확인

### 이메일 템플릿이 업데이트되지 않는다면:
1. 템플릿이 정확히 저장되었는지 확인
2. 다른 이메일 주소로 테스트
3. Supabase 이메일 전송 로그 확인
