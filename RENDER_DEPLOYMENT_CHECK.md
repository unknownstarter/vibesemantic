# Render 배포 확인 및 가이드

## 🔍 현재 상태 확인

### 1. Render 서비스 상태 확인

1. **Render Dashboard 접속**
   - https://dashboard.render.com
   - 로그인 후 서비스 목록 확인

2. **서비스 확인 사항**
   - [ ] `vibesemantic` 또는 Brain API 서비스가 존재하는지
   - [ ] 서비스 상태가 **"Live"** (실행 중)인지
   - [ ] 서비스가 **"Sleeping"** (슬립 모드)인지 확인
     - 무료 플랜은 15분 비활성 시 슬립 모드로 전환됨
     - 첫 요청 시 깨어나는데 약 30초~1분 소요

3. **Health Check**
   ```bash
   curl https://vibesemantic.onrender.com/health
   ```
   - 응답이 오면: Render에 배포되어 있음 ✅
   - 타임아웃/에러: 서비스가 없거나 슬립 모드일 수 있음

### 2. Vercel 환경 변수 확인

1. **Vercel Dashboard 접속**
   - https://vercel.com/dashboard
   - 프로젝트 선택 → **Settings** → **Environment Variables**

2. **확인할 환경 변수**
   - `BRAIN_API_URL`: `https://vibesemantic.onrender.com` (또는 실제 Render URL)
   - `BRAIN_API_KEY`: Render의 `API_KEY`와 동일한 값

---

## 🚀 Render에 Brain API 배포하기

### Step 1: Render 서비스 생성 (처음 배포하는 경우)

1. **Render Dashboard 접속**
   - https://dashboard.render.com
   - **New +** → **Web Service** 클릭

2. **GitHub 저장소 연결**
   - **Connect GitHub** 클릭
   - 저장소 선택: `vibesemantic` (또는 해당 저장소)

3. **서비스 설정**
   - **Name**: `vibesemantic-brain` (또는 원하는 이름)
   - **Region**: 가장 가까운 지역 선택
   - **Branch**: `main`
   - **Root Directory**: `python-brain`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

4. **환경 변수 설정**
   다음 환경 변수를 추가:
   ```
   API_KEY=vibesemantic-render-2026-secret-xyz123
   OPENAI_API_KEY=sk-proj-...
   SUPABASE_URL=https://gvivweuqmipklxfymoxg.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   - **주의**: `API_KEY`는 Vercel의 `BRAIN_API_KEY`와 **동일한 값**이어야 함

5. **서비스 생성**
   - **Create Web Service** 클릭
   - 배포 시작 (약 5-10분 소요)

### Step 2: 기존 서비스 재배포

1. **Render Dashboard 접속**
   - 서비스 선택

2. **수동 배포**
   - **Manual Deploy** → **Deploy latest commit** 클릭
   - 또는 GitHub에 푸시하면 자동 배포됨 (설정된 경우)

3. **배포 상태 확인**
   - **Logs** 탭에서 빌드 로그 확인
   - **Events** 탭에서 배포 이벤트 확인

### Step 3: 서비스 URL 확인

1. **서비스 대시보드에서 URL 확인**
   - 상단에 표시된 URL (예: `https://vibesemantic.onrender.com`)
   - 또는 **Settings** → **Service Details**에서 확인

2. **Vercel 환경 변수 업데이트**
   - Vercel Dashboard → **Settings** → **Environment Variables**
   - `BRAIN_API_URL`을 Render 서비스 URL로 업데이트
   - 재배포 필요

---

## ⚠️ 무료 플랜 제한사항

### 슬립 모드 (Sleep Mode)
- **15분 동안 요청이 없으면** 서비스가 슬립 모드로 전환됨
- **첫 요청 시 깨어나는데 약 30초~1분 소요**
- 이 시간 동안은 에이전트 응답이 느릴 수 있음

### 해결 방법

1. **유료 플랜으로 업그레이드** (권장)
   - 항상 실행 상태 유지
   - 빠른 응답 시간

2. **Keep-Alive 스크립트 사용** (무료 플랜)
   - 주기적으로 health check 요청
   - 서비스를 깨어있는 상태로 유지

3. **사용자에게 알림**
   - 첫 요청 시 로딩 시간이 길 수 있음을 안내

---

## 🔧 문제 해결

### 서비스가 응답하지 않음

1. **Render Dashboard 확인**
   - 서비스 상태가 "Live"인지 확인
   - "Sleeping"이면 첫 요청 시 깨어나는 시간 대기

2. **로그 확인**
   - Render Dashboard → **Logs** 탭
   - 에러 메시지 확인

3. **환경 변수 확인**
   - **Settings** → **Environment Variables**
   - 모든 필수 환경 변수가 설정되어 있는지 확인

### Vercel에서 Brain API 연결 실패

1. **환경 변수 확인**
   - `BRAIN_API_URL`이 올바른 Render URL인지
   - `BRAIN_API_KEY`가 Render의 `API_KEY`와 일치하는지

2. **CORS 설정 확인**
   - Render 서비스에서 CORS가 올바르게 설정되어 있는지
   - `python-brain/app/main.py`의 CORS 설정 확인

---

## ✅ 배포 완료 확인

1. **Health Check**
   ```bash
   curl https://vibesemantic.onrender.com/health
   # 예상 응답: {"status": "ok"}
   ```

2. **Vercel에서 테스트**
   - 에이전트 채팅 기능 테스트
   - 리포트 생성 테스트

3. **맥북을 끈 상태에서 테스트**
   - 다른 기기에서 접속하여 에이전트 작동 확인
   - Render에 제대로 배포되어 있으면 작동해야 함

---

## 📝 참고

- Render 무료 플랜은 **월 750시간** 무료 (약 31일)
- 슬립 모드로 전환되어도 시간은 차감됨
- 유료 플랜은 월 $7부터 시작 (항상 실행 상태)
