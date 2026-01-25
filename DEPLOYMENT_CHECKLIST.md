# 배포 체크리스트

## 📋 배포 전 확인 사항

### 변경된 파일 목록

#### Next.js (Vercel 배포)
- ✅ `src/lib/supabase/auth-helpers.ts` - isUUID export, 타입 개선
- ✅ `src/app/api/workspaces/[workspaceId]/**/*.ts` - 패턴 통일, 에러 처리 개선
- ✅ `src/app/api/projects/[projectId]/**/*.ts` - 타입 가드 추가
- ✅ `src/app/api/workspaces/[workspaceId]/agent/route.ts` - 에이전트 채팅 에러 처리 개선
- ✅ `src/app/(app)/projects/[pid]/workspaces/[wid]/agent/page.tsx` - 에러 메시지 표시

#### Python Brain API (Render 배포)
- ✅ `python-brain/app/langgraph/nodes.py` - 대화 히스토리 로드 추가
- ✅ `python-brain/app/langgraph/graph.py` - LLM에 대화 전달
- ✅ `python-brain/app/main.py` - data_accessed 필드 추가
- ✅ `python-brain/app/langgraph/types.py` - conversationHistory 타입 추가

---

## 🚀 배포 프로세스

### Step 1: Git 커밋 및 푸시

```bash
# 1. 변경사항 확인
git status

# 2. 모든 변경사항 스테이징
git add .

# 3. 커밋
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

**자동 배포:**
- GitHub에 푸시하면 Vercel이 자동으로 감지하여 배포 시작
- Vercel Dashboard에서 배포 상태 확인

**확인 사항:**
- [ ] 빌드 성공 여부
- [ ] 환경 변수 확인 (`BRAIN_API_URL`, `BRAIN_API_KEY` 등)
- [ ] 배포 완료 후 기능 테스트

### Step 3: Render 배포 (Python Brain API)

**방법 1: GitHub 연동 (자동 배포) - 권장**

1. Render Dashboard 접속: https://dashboard.render.com
2. 해당 서비스 선택
3. "Manual Deploy" → "Deploy latest commit" 클릭
4. 배포 상태 확인 (Build Log)

**방법 2: 수동 배포**

Render CLI 사용:
```bash
render deploy
```

**확인 사항:**
- [ ] 환경 변수 확인:
  - `API_KEY`: Next.js의 `BRAIN_API_KEY`와 동일해야 함
  - `OPENAI_API_KEY`: OpenAI API 키
  - `SUPABASE_URL`: Supabase 프로젝트 URL
  - `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key
- [ ] Health Check: `curl https://vibesemantic.onrender.com/health`

---

## ⚠️ 중요: 배포 순서

### 권장 순서

1. **Python Brain API 먼저 배포** (Render)
   - 환경 변수 확인
   - Health check 확인
   - `/api/v1/analyze` 엔드포인트 테스트

2. **Next.js 배포** (Vercel)
   - `BRAIN_API_URL`이 올바른지 확인
   - 통합 테스트

### 이유
- Next.js가 Python Brain API를 호출하므로, Brain API가 먼저 준비되어야 함
- Brain API 배포 후 Health check로 정상 작동 확인

---

## 🔍 배포 후 테스트

### Next.js (Vercel)

1. **Slug 기반 URL 테스트**
   - [ ] 프로젝트 slug로 접근 가능한지 확인
   - [ ] 기존 UUID URL도 작동하는지 확인 (하위 호환성)

2. **에이전트 채팅 테스트**
   - [ ] 채팅 메시지 전송
   - [ ] 에러 발생 시 사용자 친화적 메시지 표시 확인
   - [ ] 대화 컨텍스트 유지 확인 (두 번째 메시지부터)

3. **에러 처리 테스트**
   - [ ] Brain API 연결 실패 시 적절한 에러 메시지
   - [ ] 네트워크 오류 시 적절한 처리

### Python Brain API (Render)

1. **Health Check**
   ```bash
   curl https://vibesemantic.onrender.com/health
   # 예상 응답: {"status": "ok"}
   ```

2. **대화 컨텍스트 테스트**
   - [ ] 채팅 모드에서 이전 메시지 로드 확인
   - [ ] 리포트 모드에서는 대화 히스토리 로드 안 함 확인

3. **data_accessed 필드 확인**
   - [ ] 응답에 `data_accessed` 필드 포함 확인

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
- `BRAIN_API_URL` 확인 (Vercel 환경 변수)
- `BRAIN_API_KEY` / `API_KEY` 일치 확인
- CORS 설정 확인 (이미 설정되어 있음)

---

## 📝 배포 후 모니터링

1. **에러 로그 확인**
   - Vercel: Dashboard → Logs
   - Render: Dashboard → Logs

2. **사용자 피드백**
   - 에이전트 채팅 작동 여부
   - 대화 컨텍스트 유지 여부
   - 에러 메시지 품질

---

## ✅ 체크리스트 요약

### 배포 전
- [ ] 모든 변경사항 커밋
- [ ] GitHub에 푸시
- [ ] 환경 변수 확인 (Vercel, Render)

### 배포 중
- [ ] Python Brain API 배포 (Render)
- [ ] Health check 확인
- [ ] Next.js 배포 (Vercel)
- [ ] 빌드 성공 확인

### 배포 후
- [ ] 기능 테스트
- [ ] 에러 로그 모니터링
- [ ] 사용자 피드백 수집
