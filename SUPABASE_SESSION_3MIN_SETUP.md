# Supabase 세션 만료 시간 3분 설정 가이드

사용자 세션 만료 시간을 3분으로 설정하는 방법입니다.

## 설정 위치

### 1. Settings → Project Settings → JWT Keys

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. 왼쪽 사이드바 하단에서 **Settings** (⚙️ 아이콘) 클릭
4. **Project Settings** 섹션으로 스크롤
5. **JWT Keys** 또는 **JWT Settings** 찾기
6. **Access token expiry time** 또는 **JWT Expiry** 설정 찾기
   - 기본값: `3600` (1시간)
   - **변경값: `180` (3분)** 입력
7. **Save** 클릭

### 2. Authentication → Sessions (Pro Plan 이상)

**Pro Plan 이상**을 사용 중이라면:

1. **Authentication** (왼쪽 사이드바) 클릭
2. **Sessions** 탭 클릭
   - 경로: `/auth/sessions`
3. **Time-box user sessions** 설정 찾기
   - **변경값: 180초 (3분)** 입력
4. **Save** 클릭

## 설정 확인

### 대시보드에서 확인
- JWT Expiry 또는 Access token expiry time이 **180초 (3분)**로 설정되었는지 확인
- 변경사항이 저장되었는지 확인

### 테스트
1. 로그인 후 세션 생성
2. 3분 후 페이지 새로고침 또는 다른 페이지 이동
3. 세션이 만료되어 로그인 페이지로 리다이렉트되는지 확인

## 중요 참고사항

1. **기존 세션**: 설정 변경 후 **새로운 세션**에만 적용됩니다. 기존에 로그인한 사용자는 다음 로그인 시부터 적용됩니다.

2. **OTP 토큰 vs 세션**:
   - **OTP 토큰 만료**: 1시간 (Supabase 서버 측 고정, 변경 불가)
   - **세션 만료 (JWT)**: 3분 (설정 가능, 변경 완료)

3. **사용자 경험**:
   - 사용자가 OTP 코드를 입력하면 세션이 생성됩니다
   - 이 세션은 3분 후 자동으로 만료됩니다
   - 세션이 만료되면 다시 로그인해야 합니다

4. **보안 고려사항**:
   - 짧은 세션 만료 시간은 보안을 강화합니다
   - 하지만 사용자가 자주 로그인해야 하므로 UX에 영향을 줄 수 있습니다
   - 3분은 보안과 사용성의 균형을 맞춘 적절한 시간입니다

## 문제 해결

### 설정이 보이지 않는다면:
1. **Free Plan**인 경우: Settings → Project Settings → JWT Keys에서만 설정 가능
2. **Pro Plan 이상**인 경우: Authentication → Sessions에서도 설정 가능
3. 브라우저 캐시 클리어 후 다시 시도

### 설정이 적용되지 않는다면:
1. 설정이 정확히 저장되었는지 확인
2. 새로운 세션으로 로그인 테스트
3. Supabase 로그에서 JWT 만료 시간 확인
