# Python FastAPI 구현 가이드
**Date: 2026-01-25**
**Status: 기본 구조 생성 완료**

## ✅ 완료된 작업

### 1. 기본 프로젝트 구조 생성 ✅
- `python-brain/app/main.py` - FastAPI 앱 기본 구조
- `python-brain/requirements.txt` - Python 의존성
- `python-brain/Dockerfile` - Docker 이미지
- `python-brain/.env.example` - 환경 변수 예시
- `python-brain/README.md` - 프로젝트 설명

### 2. API 엔드포인트 정의 ✅
- `/api/v1/analyze` - LangGraph 엔진
- `/api/v1/collect/ga4` - GA4 데이터 수집
- `/api/v1/collect/csv` - CSV 데이터 수집
- `/api/v1/profiler/csv` - CSV 프로파일링
- `/health` - Health check

---

## 🔄 다음 단계

### Phase 1: LangGraph 엔진 포팅 (우선순위 1)

**작업 내용:**
1. `src/lib/langgraph/graph.ts` → `python-brain/app/langgraph/graph.py`
2. `src/lib/langgraph/nodes.ts` → `python-brain/app/langgraph/nodes.py`
3. `src/lib/langgraph/prompts.ts` → `python-brain/app/langgraph/prompts.py`
4. `src/lib/langgraph/types.ts` → `python-brain/app/langgraph/types.py`

**주요 변경사항:**
- TypeScript → Python 변환
- LangChain/LangGraph Python SDK 사용
- Supabase Python 클라이언트 사용

---

### Phase 2: 데이터 수집기 포팅

**GA4 수집기:**
- `src/lib/ga4/api.ts` → `python-brain/app/collectors/ga4_collector.py`
- Google APIs Python 클라이언트 사용

**CSV 수집기:**
- `src/lib/csv/ingest.ts` → `python-brain/app/collectors/csv_collector.py`
- Supabase Python 클라이언트 사용

---

### Phase 3: CSV 프로파일러 포팅

- `src/lib/csv/probe.ts` → `python-brain/app/profilers/csv_profiler.py`
- LangChain Python SDK 사용

---

## 📝 구현 우선순위

1. **LangGraph 엔진** (가장 중요)
   - 타임아웃 제약 해소
   - 가장 복잡한 로직
   - 구현 시간: 2-3일

2. **CSV 프로파일러**
   - LLM 호출로 인한 지연
   - 구현 시간: 1-2일

3. **데이터 수집기**
   - GA4, CSV 수집기
   - 구현 시간: 2-3일

---

## 🚀 배포 가이드

### GCP Cloud Run 배포

```bash
# Docker 이미지 빌드
docker build -t gcr.io/PROJECT_ID/brain-api .

# 이미지 푸시
docker push gcr.io/PROJECT_ID/brain-api

# Cloud Run 배포
gcloud run deploy brain-api \
  --image gcr.io/PROJECT_ID/brain-api \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 3600 \
  --max-instances 10
```

### AWS App Runner 배포

```bash
# App Runner 서비스 생성
aws apprunner create-service \
  --service-name brain-api \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "ECR_IMAGE_URI",
      "ImageConfiguration": {
        "Port": "8080"
      }
    }
  }' \
  --instance-configuration '{
    "Cpu": "2 vCPU",
    "Memory": "4 GB"
  }'
```

---

## 🔐 보안 설정

### API Key 관리
- 환경 변수로 관리
- Next.js에서만 접근 가능하도록 설정
- Cloud Run IAM 또는 App Runner 인증 사용

### Supabase 접근
- Service Role Key 사용 (RLS 우회)
- 환경 변수로 관리

---

## 📊 모니터링

### Cloud Run
- Cloud Logging
- Cloud Monitoring
- Error Reporting

### AWS App Runner
- CloudWatch Logs
- CloudWatch Metrics
- X-Ray Tracing

---

## ✅ 다음 단계

LangGraph 엔진 포팅부터 시작할까요?
