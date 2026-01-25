# Google OAuth 로그인 문제 해결 가이드

## 발견된 문제

Vercel에서 `vibesemantic.xyz`가 `www.vibesemantic.xyz`로 자동 리다이렉트되는데, Supabase와 Google Cloud Console 설정에 `www` 버전이 누락되어 있습니다.

## 즉시 수정해야 할 설정

### 1. Supabase 대시보드 설정

**Authentication → URL Configuration**에서:

1. **Site URL** 변경:
   ```
   https://www.vibesemantic.xyz
   ```
   (또는 `https://vibesemantic.xyz` 유지해도 됨, Redirect URLs에 www 추가하면 됨)

2. **Redirect URLs**에 다음 추가:
   ```
   https://www.vibesemantic.xyz/callback
   https://www.vibesemantic.xyz/callback?redirect=*
   ```
   
   **현재 목록에 추가해야 할 URL:**
   - ✅ `https://vibesemantic.vercel.app/callback` (이미 있음)
   - ✅ `https://vibesemantic.vercel.app/callback?redirect=*` (이미 있음)
   - ✅ `https://vibesemantic.xyz/callback` (이미 있음)
   - ✅ `https://vibesemantic.xyz/callback?redirect=*` (이미 있음)
   - ❌ **`https://www.vibesemantic.xyz/callback`** ← **추가 필요!**
   - ❌ **`https://www.vibesemantic.xyz/callback?redirect=*`** ← **추가 필요!**

### 2. Google Cloud Console 설정

**APIs & Services → Credentials → OAuth 2.0 클라이언트 ID**에서:

**승인된 리디렉션 URI**에 다음을 추가:

1. **Supabase OAuth 콜백** (가장 중요!):
   ```
   https://gvivweuqmipklxfymoxg.supabase.co/auth/v1/callback
   ```
   ⚠️ 이건 이미 있는 것 같은데, 확인 필요!

2. **www 버전 콜백 URL** (추가 필요):
   ```
   https://www.vibesemantic.xyz/callback
   ```

**현재 등록된 URI:**
- ✅ `http://localhost:3000/api/ga4/oauth/callback` (GA4 연결용)
- ✅ `https://gvivweuqmipklxfymoxg.supabase.co/auth/v1/callback` (Supabase OAuth용)
- ✅ `https://vibesemantic.xyz/api/ga4/oauth/callback` (GA4 연결용)
- ❌ **`https://www.vibesemantic.xyz/callback`** ← **추가 필요!**

### 3. Vercel 도메인 설정 확인

Vercel Dashboard → Settings → Domains에서:
- `vibesemantic.xyz` → `www.vibesemantic.xyz`로 307 리다이렉트 설정됨 (정상)
- `www.vibesemantic.xyz` → Production 환경 (정상)

## OAuth 흐름 설명

Google 로그인 시 흐름:

1. 사용자가 Google 로그인 버튼 클릭
2. `supabase.auth.signInWithOAuth()` 호출
3. Supabase가 Google OAuth URL 생성 (내부적으로 `https://gvivweuqmipklxfymoxg.supabase.co/auth/v1/callback` 사용)
4. Google로 리다이렉트
5. Google이 Supabase 콜백 URL로 리다이렉트 (코드 포함)
6. Supabase가 코드를 받아서 세션 생성
7. Supabase가 우리 앱의 `redirectTo` URL로 리다이렉트 (`/callback`)

**문제점:**
- 7단계에서 `www.vibesemantic.xyz/callback`로 리다이렉트되지만
- Supabase Redirect URLs에 `www` 버전이 없어서 차단됨

## 수정 체크리스트

### Supabase 설정
- [ ] Site URL: `https://www.vibesemantic.xyz` 또는 `https://vibesemantic.xyz` (둘 다 가능)
- [ ] Redirect URLs에 `https://www.vibesemantic.xyz/callback` 추가
- [ ] Redirect URLs에 `https://www.vibesemantic.xyz/callback?redirect=*` 추가

### Google Cloud Console 설정
- [ ] 승인된 리디렉션 URI에 `https://www.vibesemantic.xyz/callback` 추가
- [ ] `https://gvivweuqmipklxfymoxg.supabase.co/auth/v1/callback` 확인 (이미 있어야 함)

### 코드 수정
- [x] `src/app/(auth)/login/page.tsx`에서 origin을 www 버전으로 강제 변환

## 테스트 방법

1. 브라우저에서 `https://vibesemantic.xyz` 접속 (자동으로 `www`로 리다이렉트됨)
2. Google 로그인 버튼 클릭
3. Google 로그인 완료
4. `/callback`으로 정상 리다이렉트되는지 확인
5. 로그인 상태가 유지되는지 확인

## 참고

- Supabase OAuth는 **두 단계 리다이렉트**를 사용합니다:
  1. Google → Supabase (`*.supabase.co/auth/v1/callback`)
  2. Supabase → 우리 앱 (`/callback`)
- 따라서 Google Cloud Console에 **Supabase 콜백 URL**이 반드시 필요합니다.
- 우리 앱의 `/callback` URL은 Supabase Redirect URLs에만 등록하면 됩니다.
