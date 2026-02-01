# Vibe Semantic

Vibe Semantic은 SQL 없이도 제품의 데이터를 분석하고 인사이트를 제공하는 AI 기반 데이터 분석 플랫폼입니다.

**Last Updated**: 2026-02-01

## 기술 스택

### Frontend
- **Next.js 14** (App Router)
- **TypeScript** (Strict Mode)
- **TailwindCSS**
- **React Query** (서버 상태 관리)
- **Supabase Client** (인증)

### Backend
- **Python FastAPI** (Brain API)
- **LangGraph + LangChain** (AI 엔진)
- **Supabase** (PostgreSQL, Auth, RLS)

### Infrastructure
- **Vercel** (Frontend 배포)
- **Render / Cloud Run** (Brain API 배포)
- **Supabase Cloud** (Database, Auth)

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/             # 인증이 필요한 애플리케이션 라우트
│   ├── (marketing)/       # 공개 마케팅 페이지
│   ├── (auth)/            # 인증 관련 페이지
│   └── api/               # API 엔드포인트
├── shared/                 # 공통 모듈
│   ├── ui/                # 재사용 UI 컴포넌트
│   └── lib/               # 유틸리티 함수
├── entities/              # 도메인 엔티티 타입 정의
├── features/              # 기능 모듈 (model/ + ui/)
├── widgets/               # 복합 위젯
├── lib/                   # 외부 서비스 연동
│   ├── supabase/          # Supabase 클라이언트
│   ├── ga4/               # Google Analytics 4
│   ├── csv/               # CSV·Excel 파싱·프로파일링·ingest
│   ├── cache/             # 메트릭 캐시 (feature-flags 연동)
│   └── react-query/       # React Query
└── types/                 # 데이터베이스 타입

python-brain/              # Python FastAPI 서버
├── app/
│   ├── main.py            # FastAPI 앱
│   ├── langgraph/         # LangGraph 엔진 (report/chat, prompts, MartSummary)
│   ├── services/          # CSV/Excel ingest, GA4 연동
│   └── (collectors 등)    # 데이터 수집·변환
└── requirements.txt
```

자세한 아키텍처는 `ARCHITECTURE.md`를 참고하세요.

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 3. 프로덕션 빌드

```bash
npm run build
```

### 4. 프로덕션 서버 실행

```bash
npm start
```

## 주요 기능

### 마케팅 페이지
- **Hero 섹션**: 제품 소개 및 인터랙티브 대시보드
- **Problem 섹션**: 사용자 고민 공감
- **Feature 섹션**: Bento Grid 스타일의 기능 소개
- **Success Case 섹션**: 실제 데이터 기반 케이스 스터디
- **How it works**: 3단계 프로세스 설명
- **Security**: 보안 및 신뢰 포인트
- **FAQ**: 아코디언 형태의 자주 묻는 질문
- **Early Access 폼**: Google Sheets 연동 신청 폼

### 애플리케이션
- **인증 시스템**: Email OTP, Google OAuth
- **프로젝트 관리**: 프로젝트 생성 및 프로필 설정
- **데이터 소스 연결**: GA4, CSV 및 Excel(.xlsx, .xls) 파일 업로드
- **AI 분석**: 리포트 생성 및 채팅 분석 (MartSummary 기반, 토큰 절감 적용)
- **Semantic Layer**: 메트릭 정의 자동 생성, semantic graph
- **워크스페이스**: 목적별(프로덕트·마케팅·비즈니스·세일즈) 데이터 분석 공간

### 데이터 플랫폼 (2026-02-01 기준 구현)

- **데이터 소스**: GA4(OAuth·Data API), CSV·Excel(업로드·프로파일링·컬럼 매핑 확인 후 ingest)
- **Staging 레이어**: 소스별 원시 적재, `schema_version` 기준 보존 (GA4/CSV 파이프라인)
- **Mart 레이어**: Staging → 결정론적 변환만 적용 (mart_events, mart_ga4_*, mart_csv_* 등), LLM 미참여
- **Semantic Layer**: `metric_definitions` 프로젝트별 메트릭 정의, semantic graph 노드 연동
- **에이전트 연동**: MartSummary 생성 → LLM 프롬프트(trim·compact JSON으로 토큰 절감) → 리포트/채팅 응답
- **상세**: `DATA_PIPELINE_DOCUMENTATION.md` 참고

## 디자인 특징

- 다크 테마 (차콜/블랙 배경)
- Magic UI 스타일 (글로우, 그라데이션 텍스트, Bento Grid)
- 미니멀하고 제품스러운 디자인
- 넓은 여백과 큰 타이포그래피
- 반응형 디자인

## 주요 문서

- **PRD.md**: 제품 요구사항 문서
- **DEVELOPER_GUIDE.md**: 개발자 가이드
- **ARCHITECTURE.md**: 아키텍처 및 주요 로직 설계
- **DATA_PIPELINE_DOCUMENTATION.md**: 데이터 파이프라인 (GA4·CSV/Excel, Staging·Mart·Semantic Layer·에이전트)
- **SETUP_GUIDE.md**: 설정 가이드 (환경 변수, Supabase, Google Sheets, 도메인, 배포 등)

## Google Sheets 연동

Early Access 신청 폼은 Google Sheets에 자동으로 저장됩니다.

### 설정 방법

1. `GOOGLE_SHEETS_SETUP.md` 파일 참고
2. Google Apps Script 설정 및 웹 앱 배포
3. `.env.local` 파일에 웹 앱 URL 설정:
   ```env
   GOOGLE_SHEETS_WEB_APP_URL=여기에_웹_앱_URL
   ```

자세한 설정은 `GOOGLE_SHEETS_SETUP.md`를 참고하세요.

## 환경 변수

`.env.local` 파일에 다음 환경 변수를 설정하세요:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Brain API
BRAIN_API_URL=https://your-api.onrender.com
BRAIN_API_KEY=your_api_key

# Google Sheets
GOOGLE_SHEETS_WEB_APP_URL=your_web_app_url

# OpenAI (Brain API에서 사용)
OPENAI_API_KEY=your_openai_key
```

자세한 설정은 `SETUP_GUIDE.md`를 참고하세요.

## 참고사항

- 모든 섹션은 앵커 링크로 스무스 스크롤이 가능합니다.
- 대시보드와 Success Case 섹션은 클릭 가능한 인터랙티브 요소를 포함합니다.
- 민감한 정보(환경 변수, 인증 정보)는 `.gitignore`에 의해 제외됩니다.

