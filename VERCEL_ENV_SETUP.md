# Vercel 환경 변수 설정 가이드

프로덕션에서 GA4 연동이 작동하려면 Vercel에 다음 환경 변수를 설정해야 합니다.

## 필수 환경 변수

### 1. Vercel 대시보드 접속
1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 선택 (`vibesemantic`)
3. **Settings** → **Environment Variables** 클릭

### 2. GA4 OAuth 환경 변수 추가

다음 3개의 환경 변수를 추가하세요:

#### `GOOGLE_CLIENT_ID`
```
YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
```
- **Environment**: Production, Preview, Development 모두 선택
- **Description**: Google OAuth 2.0 Client ID
- **찾는 방법**: `.env.local` 파일에서 `GOOGLE_CLIENT_ID` 값을 복사하거나, [Google Cloud Console](https://console.cloud.google.com/apis/credentials)에서 확인

#### `GOOGLE_CLIENT_SECRET`
```
YOUR_GOOGLE_CLIENT_SECRET
```
- **Environment**: Production, Preview, Development 모두 선택
- **Description**: Google OAuth 2.0 Client Secret
- **찾는 방법**: `.env.local` 파일에서 `GOOGLE_CLIENT_SECRET` 값을 복사하거나, [Google Cloud Console](https://console.cloud.google.com/apis/credentials)에서 확인

#### `GOOGLE_REDIRECT_URI`
```
https://www.vibesemantic.xyz/api/ga4/oauth/callback
```
- **Environment**: Production만 선택 (또는 Preview도 추가 가능)
- **Description**: GA4 OAuth 콜백 URL

### 3. 기타 필수 환경 변수 확인

다음 환경 변수들도 설정되어 있는지 확인하세요:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `BRAIN_API_URL`
- `BRAIN_API_KEY`
- `GOOGLE_SHEETS_WEB_APP_URL`
- `ENCRYPTION_MASTER_KEY` (또는 `TOKEN_ENCRYPTION_KEY`)

## 환경 변수 설정 후

1. **재배포 필요**: 환경 변수를 추가/수정한 후에는 자동으로 재배포되거나, 수동으로 재배포해야 합니다.
2. **Google Cloud Console 확인**: 
   - [Google Cloud Console](https://console.cloud.google.com/apis/credentials) 접속
   - OAuth 2.0 클라이언트 ID 선택
   - **승인된 리디렉션 URI**에 다음 추가:
     - `https://www.vibesemantic.xyz/api/ga4/oauth/callback`

## 문제 해결

### "Missing required parameter: client_id" 오류
- ✅ Vercel에 `GOOGLE_CLIENT_ID` 환경 변수가 설정되어 있는지 확인
- ✅ 환경 변수 이름이 정확한지 확인 (대소문자 구분)
- ✅ 재배포 후에도 문제가 있으면 Vercel 로그 확인

### "redirect_uri_mismatch" 오류

이 오류는 **Google Cloud Console에 등록된 리다이렉트 URI와 실제 요청 URI가 일치하지 않을 때** 발생합니다.

**즉시 확인해야 할 사항:**

1. **Vercel 환경 변수 확인**:
   - `GOOGLE_REDIRECT_URI`가 정확히 `https://www.vibesemantic.xyz/api/ga4/oauth/callback`로 설정되어 있는지 확인
   - **주의**: `http://`가 아닌 `https://`인지 확인
   - **주의**: `vibesemantic.xyz`가 아닌 `www.vibesemantic.xyz`인지 확인
   - **주의**: 마지막에 `/`가 없는지 확인

2. **Google Cloud Console 확인** (가장 중요!):
   - [Google Cloud Console](https://console.cloud.google.com/apis/credentials) 접속
   - OAuth 2.0 클라이언트 ID 선택
   - **승인된 리디렉션 URI** 섹션에서 다음 URI가 **정확히** 등록되어 있는지 확인:
     ```
     https://www.vibesemantic.xyz/api/ga4/oauth/callback
     ```
   - 만약 `https://vibesemantic.xyz/api/ga4/oauth/callback`만 있다면, **`www` 버전도 추가**해야 합니다
   - 두 개 모두 등록해도 됩니다:
     - `https://vibesemantic.xyz/api/ga4/oauth/callback` (기존)
     - `https://www.vibesemantic.xyz/api/ga4/oauth/callback` (추가 필요)

3. **재배포**:
   - 환경 변수를 수정했다면 Vercel에서 재배포 필요
   - Google Cloud Console만 수정했다면 재배포 불필요 (즉시 적용됨)

### 환경 변수 확인 방법
Vercel 대시보드에서:
1. **Settings** → **Environment Variables**
2. 각 환경 변수가 올바르게 설정되어 있는지 확인
3. **Production**, **Preview**, **Development** 환경별로 설정 가능

## 참고
- 로컬 개발 환경에서는 `.env.local` 파일에 환경 변수를 설정합니다.
- 프로덕션에서는 Vercel 대시보드에서만 환경 변수를 설정할 수 있습니다.
- 환경 변수는 빌드 시점에 주입되므로, 변경 후 재배포가 필요합니다.
