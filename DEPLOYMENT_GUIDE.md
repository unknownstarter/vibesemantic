# 배포 가이드

## 📋 배포 전 체크리스트

### 1. 변경사항 확인
- ✅ Slug 기반 URL 구현 및 리팩토링
- ✅ 에이전트 채팅 문제 수정 (Next.js API)
- ✅ Python Brain API 개선 (대화 컨텍스트, data_accessed)

### 2. 테스트
- [ ] 로컬에서 빌드 테스트 (`npm run build`)
- [ ] Python Brain API 로컬 테스트 (선택사항)

---

## 🚀 배포 프로세스

### Step 1: Git 커밋 및 푸시

```bash
# 1. 변경사항 확인
git status

# 2. 모든 변경사항 스테이징
git add .

# 3. 커밋 (의미있는 메시지로)
git commit -m "feat: slug 기반 URL 구현 및 에이전트 채팅 개선

- Slug 기반 URL로 UUID 대신 human-readable URL 사용
- 에이전트 채팅 에러 처리 개선 및 대화 컨텍스트 유지
- Python Brain API에 대화 히스토리 로드 기능 추가
- 코드 중복 제거 및 패턴 통일 (DRY 원칙)
- 타입 안정성 개선 (non-null assertion 제거)"

# 4. GitHub에 푸시
git push origin main
```

### Step 2: Vercel 자동 배포 (Next.js)

Vercel은 GitHub과 연동되어 있으면 **자동으로 배포**됩니다.

1. GitHub에 푸시하면 Vercel이 자동으로 감지
2. 빌드 시작
3. 배포 완료 후 알림

**확인 방법:**
- Vercel Dashboard에서 배포 상태 확인
- 빌드 로그 확인

### Step 3: Render 배포 (Python Brain API)

Render는 두 가지 방법으로 배포할 수 있습니다:

#### 방법 A: GitHub 연동 (자동 배포) - 권장

1. **Render Dashboard 접속**
   - https://dashboard.render.com
   - 해당 서비스 선택

2. **자동 배포 확인**
   - GitHub과 연동되어 있으면 자동으로 배포 시작
   - "Manual Deploy" → "Deploy latest commit" 클릭

3. **배포 상태 확인**
   - Build Log 확인
   - 배포 완료 대기

#### 방법 B: 수동 배포

```bash
# Render CLI 사용 (설치 필요)
npm install -g render-cli

# 로그인
render login

# 배포
render deploy
```

---

## 🔍 배포 후 확인 사항

### Next.js (Vercel)

1. **환경 변수 확인**
   - `BRAIN_API_URL`: Python Brain API URL
   - `BRAIN_API_KEY`: API 키
   - 기타 Supabase, GA4 환경 변수

2. **기능 테스트**
   - [ ] Slug 기반 URL로 프로젝트 접근
   - [ ] 에이전트 채팅 작동 확인
   - [ ] 에러 메시지 확인

### Python Brain API (Render)

1. **환경 변수 확인**
   - `API_KEY`: Next.js에서 사용하는 API 키
   - `OPENAI_API_KEY`: OpenAI API 키
   - `SUPABASE_URL`: Supabase URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key

2. **Health Check**
   ```bash
   curl https://vibesemantic.onrender.com/health
   # 응답: {"status": "ok"}
   ```

3. **기능 테스트**
   - [ ] `/api/v1/analyze` 엔드포인트 테스트
   - [ ] 대화 컨텍스트 로드 확인
   - [ ] `data_accessed` 필드 반환 확인

---

## ⚠️ 주의사항

### 환경 변수 동기화

**Vercel 환경 변수:**
- `BRAIN_API_URL`: Render 서비스 URL
- `BRAIN_API_KEY`: Render의 `API_KEY`와 동일해야 함

**Render 환경 변수:**
- `API_KEY`: Vercel의 `BRAIN_API_KEY`와 동일해야 함
- `OPENAI_API_KEY`: OpenAI API 키
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key

### 배포 순서

1. **Python Brain API 먼저 배포** (Render)
   - 환경 변수 확인
   - Health check 확인

2. **Next.js 배포** (Vercel)
   - `BRAIN_API_URL`이 올바른지 확인
   - 통합 테스트

---

## 🐛 문제 해결

### Vercel 빌드 실패
- TypeScript 에러 확인
- 환경 변수 확인
- 빌드 로그 확인

### Render 배포 실패
- Python 의존성 확인 (`requirements.txt`)
- 환경 변수 확인
- Build Log 확인

### API 연결 실패
- `BRAIN_API_URL` 확인
- `BRAIN_API_KEY` / `API_KEY` 일치 확인
- CORS 설정 확인

---

## 📝 배포 후 모니터링

1. **에러 로그 확인**
   - Vercel: Dashboard → Logs
   - Render: Dashboard → Logs

2. **사용자 피드백**
   - 에이전트 채팅 작동 여부
   - Slug URL 접근 여부

3. **성능 모니터링**
   - 응답 시간
   - 에러율
