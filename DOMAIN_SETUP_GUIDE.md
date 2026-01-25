# 도메인 설정 가이드

## 문제 상황

Google 로그인 후 `vibesemantic.xyz/?code=...`로 리다이렉트되지만 DNS 오류(`DNS_PROBE_FINISHED_NXDOMAIN`)가 발생합니다.

## 원인

1. **Vercel 도메인 설정 미완료**: `vibesemantic.xyz` 도메인이 Vercel에 제대로 연결되지 않음
2. **Supabase Redirect URLs 설정**: Supabase 대시보드에서 올바른 리다이렉트 URL이 등록되지 않음

## 해결 방법

### 1. Vercel 도메인 설정 확인

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 선택 → **Settings** → **Domains**
3. `vibesemantic.xyz` 도메인이 추가되어 있는지 확인
4. 없다면 **Add Domain** 클릭하여 추가
5. DNS 설정 안내에 따라 도메인 등록 기관에서 DNS 레코드 설정:
   - **A 레코드**: Vercel이 제공하는 IP 주소로 설정
   - 또는 **CNAME 레코드**: `cname.vercel-dns.com`으로 설정

### 2. 임시 해결: Vercel 기본 도메인 사용

도메인 설정이 완료될 때까지 Vercel 기본 도메인을 사용할 수 있습니다:

1. Vercel Dashboard에서 프로젝트의 기본 도메인 확인 (예: `vibesemantic.vercel.app`)
2. Supabase 대시보드에서 Redirect URLs에 추가:
   ```
   https://vibesemantic.vercel.app/callback
   ```
3. Google Cloud Console에서도 동일한 리다이렉트 URI 추가

### 3. Supabase 대시보드 설정

1. [Supabase Dashboard](https://app.supabase.com) 접속
2. 프로젝트 선택 → **Authentication** → **URL Configuration**
3. **Site URL** 확인:
   - 프로덕션: `https://vibesemantic.xyz` (또는 Vercel 기본 도메인)
   - 로컬 개발: `http://localhost:3000`
4. **Redirect URLs**에 다음 추가:
   ```
   https://vibesemantic.xyz/callback
   https://vibesemantic.vercel.app/callback  (임시로 Vercel 기본 도메인도 추가)
   http://localhost:3000/callback  (로컬 개발용)
   ```

### 4. Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. **APIs & Services** → **Credentials**
3. OAuth 2.0 클라이언트 ID 선택
4. **승인된 리디렉션 URI**에 다음 추가:
   ```
   https://vibesemantic.xyz/callback
   https://vibesemantic.vercel.app/callback
   http://localhost:3000/callback
   ```
   ⚠️ **중요**: Supabase의 OAuth 콜백 URL도 추가해야 합니다:
   ```
   https://[your-project-ref].supabase.co/auth/v1/callback
   ```

### 5. DNS 설정 확인 (도메인 등록 기관)

도메인 등록 기관(예: Namecheap, GoDaddy, Cloudflare)에서:

1. DNS 관리 페이지 접속
2. 다음 레코드 추가/수정:
   - **A 레코드**: 
     - Name: `@` 또는 `vibesemantic.xyz`
     - Value: Vercel이 제공하는 IP 주소
   - 또는 **CNAME 레코드**:
     - Name: `@` 또는 `vibesemantic.xyz`
     - Value: `cname.vercel-dns.com`

3. DNS 전파 확인 (보통 5분~24시간 소요):
   ```bash
   # 터미널에서 확인
   nslookup vibesemantic.xyz
   dig vibesemantic.xyz
   ```

### 6. 테스트

1. 브라우저에서 `https://vibesemantic.xyz` 접속 확인
2. Google 로그인 버튼 클릭
3. 로그인 후 `/callback`으로 정상 리다이렉트되는지 확인

## 문제 해결 체크리스트

- [ ] Vercel에 도메인 추가됨
- [ ] DNS 레코드 설정 완료 (A 또는 CNAME)
- [ ] DNS 전파 완료 (nslookup/dig로 확인)
- [ ] Supabase Site URL 설정 확인
- [ ] Supabase Redirect URLs에 `/callback` 경로 추가
- [ ] Google Cloud Console에 리다이렉트 URI 추가
- [ ] 브라우저에서 도메인 접속 가능 확인
- [ ] Google 로그인 테스트

## 참고

- DNS 전파는 최대 24시간까지 걸릴 수 있습니다
- 임시로는 Vercel 기본 도메인(`*.vercel.app`)을 사용할 수 있습니다
- 로컬 개발 시에는 `http://localhost:3000` 사용
