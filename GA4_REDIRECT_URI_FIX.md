# GA4 OAuth redirect_uri_mismatch 오류 해결 가이드

## 오류 메시지
```
Error 400: redirect_uri_mismatch
Access blocked: This app's request is invalid
```

## 원인
Google Cloud Console에 등록된 리다이렉트 URI와 실제 OAuth 요청에서 사용하는 URI가 일치하지 않습니다.

## 해결 방법

### 1단계: Google Cloud Console에 리다이렉트 URI 추가

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) 접속
2. 프로젝트 선택
3. **APIs & Services** → **Credentials** 클릭
4. OAuth 2.0 클라이언트 ID 클릭 (GA4 연동에 사용하는 클라이언트)
5. **승인된 리디렉션 URI** 섹션 찾기
6. **URI 추가** 버튼 클릭
7. 다음 URI를 **정확히** 입력:
   ```
   https://www.vibesemantic.xyz/api/ga4/oauth/callback
   ```
8. **저장** 클릭

**중요 체크리스트:**
- ✅ `https://` (http가 아님)
- ✅ `www.vibesemantic.xyz` (www 포함)
- ✅ `/api/ga4/oauth/callback` (경로 정확)
- ✅ 마지막에 `/` 없음

### 2단계: Vercel 환경 변수 확인

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 선택 → **Settings** → **Environment Variables**
3. `GOOGLE_REDIRECT_URI` 찾기
4. 값이 정확히 다음인지 확인:
   ```
   https://www.vibesemantic.xyz/api/ga4/oauth/callback
   ```
5. 만약 다르다면:
   - **Edit** 클릭
   - 올바른 값으로 수정
   - **Save** 클릭
   - **재배포 필요** (자동 또는 수동)

### 3단계: 테스트

1. Google Cloud Console에서 URI 저장 후 **즉시 적용**됨 (재배포 불필요)
2. Vercel 환경 변수 수정 후에는 **재배포 필요**
3. 프로덕션 사이트에서 GA4 연동 다시 시도

## 현재 등록되어 있어야 할 URI 목록

Google Cloud Console의 **승인된 리디렉션 URI**에 다음이 모두 있어야 합니다:

### Supabase OAuth (사용자 로그인용)
```
https://gvivweuqmipklxfymoxg.supabase.co/auth/v1/callback
```

### GA4 OAuth (GA4 데이터 연결용)
```
http://localhost:3000/api/ga4/oauth/callback
https://vibesemantic.xyz/api/ga4/oauth/callback
https://www.vibesemantic.xyz/api/ga4/oauth/callback
```

### 사용자 로그인 콜백 (Supabase)
```
https://www.vibesemantic.xyz/callback
https://vibesemantic.xyz/callback
```

## 문제 해결 체크리스트

- [ ] Google Cloud Console에 `https://www.vibesemantic.xyz/api/ga4/oauth/callback` 추가됨
- [ ] Vercel에 `GOOGLE_REDIRECT_URI` 환경 변수가 `https://www.vibesemantic.xyz/api/ga4/oauth/callback`로 설정됨
- [ ] 환경 변수 수정 후 재배포 완료
- [ ] 프로덕션에서 GA4 연동 테스트 성공

## 추가 참고

- Google Cloud Console의 URI 변경은 **즉시 적용**됩니다 (재배포 불필요)
- Vercel 환경 변수 변경은 **재배포 필요**합니다
- URI는 대소문자를 구분하지 않지만, 경로는 정확해야 합니다
- `www`와 non-www는 **다른 URI로 취급**되므로 둘 다 등록하는 것이 안전합니다
