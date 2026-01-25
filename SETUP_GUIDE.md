# 설정 가이드
**작성일**: 2026-01-26  
**버전**: 1.0

이 문서는 Vibe Semantic 프로젝트의 모든 설정 가이드를 통합한 문서입니다.

---

## 목차

1. [환경 변수 설정](#1-환경-변수-설정)
2. [Supabase 설정](#2-supabase-설정)
3. [Google Sheets 연동](#3-google-sheets-연동)
4. [도메인 설정](#4-도메인-설정)
5. [사용자 권한 관리](#5-사용자-권한-관리)
6. [배포 설정](#6-배포-설정)

---

## 1. 환경 변수 설정

### 1.1 로컬 개발 (.env.local)

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 환경 변수를 설정하세요:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Brain API
BRAIN_API_URL=https://your-api.onrender.com
BRAIN_API_KEY=your-api-key

# Google Sheets
GOOGLE_SHEETS_WEB_APP_URL=https://script.google.com/macros/s/...

# OpenAI (Brain API에서 사용)
OPENAI_API_KEY=sk-proj-...

# Google Analytics 4 (선택사항)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/ga4/oauth/callback
```

### 1.2 프로덕션 (Vercel)

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 선택 → **Settings** → **Environment Variables**
3. 위의 모든 환경 변수를 추가
4. **Environment** 선택: Production, Preview, Development 모두 선택

---

## 2. Supabase 설정

### 2.1 OTP 이메일 템플릿 설정

**목적**: 이메일 OTP 로그인 시 6자리 코드가 표시되도록 설정

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택 → **Authentication** → **Email Templates**
3. **Magic Link** 템플릿 선택
4. 프로젝트 루트의 `SUPABASE_EMAIL_TEMPLATE_6DIGIT.html` 파일 내용을 복사하여 붙여넣기
5. **Save** 클릭

**핵심 부분 (6자리만 표시):**
```html
{{- if ge (len .Token) 6 -}}
  {{- substr .Token 0 6 -}}
{{- else -}}
  {{- .Token -}}
{{- end -}}
```

### 2.2 세션 만료 시간 설정 (3분)

1. Supabase Dashboard → **Settings** → **Project Settings**
2. **JWT Keys** 또는 **JWT Settings** 찾기
3. **Access token expiry time** 또는 **JWT Expiry** 설정
   - 기본값: `3600` (1시간)
   - **변경값: `180` (3분)** 입력
4. **Save** 클릭

**참고:**
- OTP 토큰 만료 시간은 1시간 (Supabase 서버 측 고정, 변경 불가)
- 세션 만료 시간(JWT)만 3분으로 설정 가능
- 설정 변경 후 새로운 세션에만 적용됨

### 2.3 OAuth 리다이렉트 URL 설정

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Site URL** 설정:
   - 프로덕션: `https://your-domain.com`
   - 로컬 개발: `http://localhost:3000`
3. **Redirect URLs**에 다음 추가:
   ```
   https://your-domain.com/callback
   http://localhost:3000/callback
   ```

---

## 3. Google Sheets 연동

### 3.1 Google Sheets 문서 생성

1. 새 Google Sheets 문서 생성
2. 문서 이름 설정 (예: "Vibe Semantic Leads")
3. Sheets URL에서 Spreadsheet ID 추출
   - URL 예: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

### 3.2 Google Apps Script 설정

1. Google Sheets에서 **확장 프로그램** > **Apps Script** 클릭
2. 프로젝트 루트의 `google-apps-script-code.js` 파일 내용을 복사하여 붙여넣기
3. 프로젝트 이름 변경 (예: "Vibe Semantic Leads")
4. 저장 (Cmd+S / Ctrl+S)

### 3.3 웹 앱으로 배포

1. 상단 메뉴에서 **배포** > **새 배포** 클릭
2. 톱니바퀴 아이콘 클릭 > **웹 앱** 선택
3. 설정:
   - **설명**: "Vibe Semantic API" (선택사항)
   - **실행할 사용자**: "나" 선택
   - **액세스 권한**: "모든 사용자" 선택
4. **배포** 버튼 클릭
5. 권한 승인:
   - "권한 확인" 클릭
   - Google 계정 선택
   - "고급" > "안전하지 않은 페이지로 이동" 클릭 (경고 메시지가 나올 경우)
   - "허용" 클릭
6. **웹 앱 URL 복사** (중요!)
   - 예: `https://script.google.com/macros/s/AKfycby.../exec`
   - 이 URL을 `.env.local`의 `GOOGLE_SHEETS_WEB_APP_URL`에 저장

### 3.4 데이터 저장 구조

다음 3가지 타입의 데이터가 자동으로 저장됩니다:

1. **Early Access 폼** → "Sheet1" 시트
2. **Pricing 폼** → "Pricing" 시트
3. **권한 요청** → "Access Requests" 시트 (자동 생성됨)

### 3.5 문제 해결

**HTML 리다이렉트 응답이 오는 경우:**
1. Google Apps Script 배포 재설정
   - **배포** > **배포 관리** > 기존 배포 삭제
   - **배포** > **새 배포** > **웹 앱** 선택
   - **실행 사용자**: "나"
   - **액세스 권한**: "모든 사용자"
   - 배포 후 새 URL 복사

**권한 오류:**
1. Apps Script 에디터에서 **실행** > **doPost** 선택
2. 권한 승인
3. 배포 재설정

---

## 4. 도메인 설정

### 4.1 Vercel 도메인 설정

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 선택 → **Settings** → **Domains**
3. **Add Domain** 클릭하여 도메인 추가
4. DNS 설정 안내에 따라 도메인 등록 기관에서 DNS 레코드 설정:
   - **A 레코드**: Vercel이 제공하는 IP 주소로 설정
   - 또는 **CNAME 레코드**: `cname.vercel-dns.com`으로 설정

### 4.2 DNS 설정 (도메인 등록 기관)

도메인 등록 기관(예: Namecheap, GoDaddy, Cloudflare)에서:

1. DNS 관리 페이지 접속
2. 다음 레코드 추가/수정:
   - **A 레코드**: 
     - Name: `@` 또는 도메인 이름
     - Value: Vercel이 제공하는 IP 주소
   - 또는 **CNAME 레코드**:
     - Name: `@` 또는 도메인 이름
     - Value: `cname.vercel-dns.com`

3. DNS 전파 확인 (보통 5분~24시간 소요):
   ```bash
   nslookup your-domain.com
   dig your-domain.com
   ```

### 4.3 Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. **APIs & Services** → **Credentials**
3. OAuth 2.0 클라이언트 ID 선택
4. **승인된 리디렉션 URI**에 다음 추가:
   ```
   https://your-domain.com/api/ga4/oauth/callback
   https://your-domain.com/callback
   http://localhost:3000/api/ga4/oauth/callback
   ```
   ⚠️ **중요**: Supabase의 OAuth 콜백 URL도 추가:
   ```
   https://[your-project-ref].supabase.co/auth/v1/callback
   ```

---

## 5. 사용자 권한 관리

### 5.1 권한 상태

`user_profiles` 테이블의 `access_level` 컬럼은 다음 3가지 값을 가집니다:

- **`pending`**: 승인 대기 중 (기본값, 프로젝트 생성/접근 불가)
- **`approved`**: 승인됨 (프로젝트 생성/접근 가능)
- **`rejected`**: 거부됨 (프로젝트 생성/접근 불가)

### 5.2 사용자 승인 방법

#### 방법 1: Supabase 대시보드에서 직접 수정 (권장)

1. Supabase Dashboard → **Table Editor** → **`user_profiles`** 테이블
2. 승인할 사용자의 행 찾기 (이메일 또는 user_id로 검색)
3. `access_level` 컬럼을 `pending` → `approved`로 변경
4. `approved_at` 컬럼에 현재 시간 입력 (선택사항)
5. `approved_by` 컬럼에 관리자 user_id 입력 (선택사항)
6. **Save** 클릭

#### 방법 2: SQL Editor에서 실행

```sql
-- 특정 이메일의 사용자 승인
UPDATE user_profiles
SET 
  access_level = 'approved',
  approved_at = now(),
  approved_by = (SELECT id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1)
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'user@example.com' LIMIT 1
);

-- 모든 pending 사용자를 approved로 변경
UPDATE user_profiles
SET 
  access_level = 'approved',
  approved_at = now()
WHERE access_level = 'pending';
```

### 5.3 승인 상태 확인

```sql
-- 승인된 사용자 목록
SELECT 
  up.user_id,
  u.email,
  up.access_level,
  up.approved_at
FROM user_profiles up
JOIN auth.users u ON u.id = up.user_id
WHERE up.access_level = 'approved'
ORDER BY up.approved_at DESC;

-- 승인 대기 중인 사용자 목록
SELECT 
  up.user_id,
  u.email,
  up.access_level,
  up.requested_at
FROM user_profiles up
JOIN auth.users u ON u.id = up.user_id
WHERE up.access_level = 'pending'
ORDER BY up.requested_at DESC;
```

---

## 6. 배포 설정

### 6.1 Frontend 배포 (Vercel)

Vercel은 GitHub과 연동되어 있으면 **자동으로 배포**됩니다.

1. GitHub에 푸시하면 Vercel이 자동으로 감지
2. 빌드 시작
3. 배포 완료 후 알림

**확인 방법:**
- Vercel Dashboard에서 배포 상태 확인
- 빌드 로그 확인

### 6.2 Brain API 배포 (Render)

#### Step 1: Render 서비스 생성

1. [Render Dashboard](https://dashboard.render.com) 접속
2. **New +** → **Web Service** 클릭
3. **GitHub 저장소 연결**
4. 서비스 설정:
   - **Name**: `vibesemantic-brain` (또는 원하는 이름)
   - **Region**: 가장 가까운 지역 선택
   - **Branch**: `main`
   - **Root Directory**: `python-brain`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

5. 환경 변수 설정:
   ```
   API_KEY=your-secret-api-key
   OPENAI_API_KEY=sk-proj-...
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   ⚠️ **주의**: `API_KEY`는 Vercel의 `BRAIN_API_KEY`와 **동일한 값**이어야 함

6. **Create Web Service** 클릭

#### Step 2: 서비스 URL 확인

1. 서비스 대시보드에서 URL 확인 (예: `https://vibesemantic.onrender.com`)
2. Vercel 환경 변수 업데이트:
   - `BRAIN_API_URL`을 Render 서비스 URL로 업데이트

#### Step 3: Health Check

```bash
curl https://your-api.onrender.com/health
# 예상 응답: {"status": "ok"}
```

### 6.3 무료 플랜 제한사항 (Render)

**슬립 모드:**
- 15분 동안 요청이 없으면 서비스가 슬립 모드로 전환됨
- 첫 요청 시 깨어나는데 약 30초~1분 소요
- 이 시간 동안은 에이전트 응답이 느릴 수 있음

**해결 방법:**
1. 유료 플랜으로 업그레이드 (권장)
2. Keep-Alive 스크립트 사용 (무료 플랜)
3. 사용자에게 첫 요청 시 로딩 시간이 길 수 있음을 안내

### 6.4 배포 후 확인 사항

#### Frontend (Vercel)
- [ ] 환경 변수 확인
- [ ] 기능 테스트 (프로젝트 생성, 에이전트 채팅 등)
- [ ] 에러 로그 확인

#### Brain API (Render)
- [ ] 환경 변수 확인
- [ ] Health Check 통과
- [ ] `/api/v1/analyze` 엔드포인트 테스트

### 6.5 문제 해결

**Vercel 빌드 실패:**
- TypeScript 에러 확인
- 환경 변수 확인
- 빌드 로그 확인

**Render 배포 실패:**
- Python 의존성 확인 (`requirements.txt`)
- 환경 변수 확인
- Build Log 확인

**API 연결 실패:**
- `BRAIN_API_URL` 확인
- `BRAIN_API_KEY` / `API_KEY` 일치 확인
- CORS 설정 확인

---

## 7. 체크리스트

### 초기 설정
- [ ] `.env.local` 파일 생성 및 환경 변수 설정
- [ ] Supabase OTP 이메일 템플릿 설정
- [ ] Supabase 세션 만료 시간 설정 (3분)
- [ ] Google Sheets 연동 설정
- [ ] Google Apps Script 웹 앱 배포
- [ ] 도메인 설정 (Vercel, DNS)
- [ ] Google Cloud Console OAuth 설정

### 배포
- [ ] Vercel 환경 변수 설정
- [ ] Render 서비스 생성 및 환경 변수 설정
- [ ] Health Check 통과
- [ ] 기능 테스트

### 사용자 관리
- [ ] 첫 사용자 승인
- [ ] 권한 관리 프로세스 확인

---

**문서 버전**: 1.0  
**최종 수정일**: 2026-01-26
