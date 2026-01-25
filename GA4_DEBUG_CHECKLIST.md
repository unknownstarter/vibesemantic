# GA4 OAuth redirect_uri_mismatch 디버깅 체크리스트

Google Cloud Console에 모든 URI가 등록되어 있는데도 오류가 발생하는 경우, 다음을 확인하세요.

## 1. Vercel 환경 변수 확인 (가장 중요!)

### Vercel Dashboard에서 확인:
1. [Vercel Dashboard](https://vercel.com/dashboard) → 프로젝트 선택
2. **Settings** → **Environment Variables**
3. `GOOGLE_REDIRECT_URI` 찾기
4. 값이 **정확히** 다음인지 확인:
   ```
   https://www.vibesemantic.xyz/api/ga4/oauth/callback
   ```

### 확인 사항:
- ✅ `https://` (http가 아님)
- ✅ `www.vibesemantic.xyz` (www 포함, 정확한 도메인)
- ✅ `/api/ga4/oauth/callback` (경로 정확)
- ✅ 마지막에 `/` 없음
- ✅ 공백이나 특수문자 없음
- ✅ **Production 환경**에 설정되어 있음

### 환경 변수 수정 후:
1. **반드시 재배포** 필요
2. Vercel Dashboard → **Deployments** → 최신 배포 확인
3. 재배포 완료 후 다시 테스트

## 2. Vercel 로그 확인

실제로 어떤 리다이렉트 URI가 사용되고 있는지 확인:

1. Vercel Dashboard → **Deployments** → 최신 배포 클릭
2. **Functions** 탭 클릭
3. `/api/ga4/oauth/start` 함수 로그 확인
4. 다음 로그 메시지 찾기:
   ```
   [GA4 OAuth] Environment check: { redirectUri: '...' }
   [GA4 OAuth Start] Generated auth URL: { redirectUri: '...' }
   ```
5. 로그에 표시된 `redirectUri`가 Google Cloud Console에 등록된 URI와 **정확히 일치**하는지 확인

## 3. Google Cloud Console 재확인

이미지에서 보이는 URI들이 정확한지 다시 확인:

### 현재 등록된 URI (이미지 기준):
1. ✅ `http://localhost:3000/api/ga4/oauth/callback`
2. ✅ `https://gvivweuqmipklxfymoxg.supabase.co/auth/v1/callback`
3. ✅ `https://www.vibesemantic.xyz/api/ga4/oauth/callback`
4. ✅ `https://vibesemantic.xyz/api/ga4/oauth/callback`

### 확인 사항:
- 각 URI에 **공백이나 특수문자**가 없는지
- **대소문자**가 정확한지 (일반적으로 소문자)
- **마지막에 슬래시(`/`)**가 없는지
- **저장 버튼**을 눌렀는지

## 4. 설정 전파 대기

Google Cloud Console의 알림에 따르면:
> "설정이 적용되는 데 5분에서 몇 시간이 걸릴 수 있습니다."

### 해결 방법:
1. URI를 추가/수정한 후 **최소 5분 대기**
2. 브라우저 캐시 클리어 후 다시 시도
3. 시크릿 모드(Incognito)에서 테스트

## 5. 실제 요청 URI 확인

브라우저 개발자 도구에서 확인:

1. GA4 연동 버튼 클릭
2. 브라우저 개발자 도구 열기 (F12)
3. **Network** 탭 클릭
4. Google OAuth 페이지로 리다이렉트되는 요청 찾기
5. URL에서 `redirect_uri` 파라미터 확인
6. 이 값이 Google Cloud Console에 등록된 URI와 **정확히 일치**하는지 확인

예시:
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=...
  &redirect_uri=https://www.vibesemantic.xyz/api/ga4/oauth/callback
  &...
```

## 6. 일반적인 실수들

### ❌ 잘못된 예시:
- `https://vibesemantic.xyz/api/ga4/oauth/callback/` (마지막 슬래시)
- `https://www.vibesemantic.xyz/api/ga4/oauth/callback ` (공백)
- `http://www.vibesemantic.xyz/api/ga4/oauth/callback` (http)
- `https://Vibesemantic.xyz/api/ga4/oauth/callback` (대문자)

### ✅ 올바른 예시:
- `https://www.vibesemantic.xyz/api/ga4/oauth/callback`

## 7. 최종 해결 방법

위의 모든 것을 확인했는데도 안 되면:

1. **Vercel 환경 변수 삭제 후 다시 추가**
   - `GOOGLE_REDIRECT_URI` 삭제
   - 다시 추가: `https://www.vibesemantic.xyz/api/ga4/oauth/callback`
   - 재배포

2. **Google Cloud Console에서 URI 삭제 후 다시 추가**
   - 기존 URI 삭제
   - 다시 추가: `https://www.vibesemantic.xyz/api/ga4/oauth/callback`
   - 저장
   - 5분 대기

3. **Vercel 로그에서 실제 사용되는 URI 확인**
   - 로그에 표시된 URI를 Google Cloud Console에 정확히 추가

## 8. 임시 해결책 (동적 리다이렉트 URI)

만약 위의 방법들이 모두 실패한다면, 코드를 수정하여 동적으로 리다이렉트 URI를 생성할 수 있습니다. 하지만 이는 보안상 권장되지 않으므로, 가능하면 환경 변수로 해결하는 것이 좋습니다.
