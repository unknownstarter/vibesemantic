# Vibe Semantic Landing Page

Vibe Semantic의 Fake Door 랜딩 페이지입니다.

## 스택

- **Next.js 14** (App Router)
- **TypeScript**
- **TailwindCSS**
- **Server Components 우선** (필요한 곳만 Client Components)

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # 루트 레이아웃
│   └── page.tsx            # 메인 랜딩 페이지 (/)
├── shared/                 # 공통 모듈
│   ├── ui/                # 재사용 UI 컴포넌트
│   ├── lib/               # 유틸리티 함수
│   └── styles/            # 글로벌 스타일
├── entities/              # 도메인 엔티티
│   └── lead/             # Lead 타입 정의
├── features/             # 기능 모듈
│   └── lead-capture/     # Early Access 신청 폼
└── widgets/              # 복합 위젯
    ├── header/
    ├── footer/
    ├── hero/
    ├── problem/
    ├── bento/
    ├── how-it-works/
    ├── security/
    └── faq/
```

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

- **Hero 섹션**: 제품 소개 및 인터랙티브 대시보드
- **Problem 섹션**: 사용자 고민 공감
- **Feature 섹션**: Bento Grid 스타일의 기능 소개
- **Success Case 섹션**: 실제 데이터 기반 케이스 스터디
- **How it works**: 3단계 프로세스 설명
- **Security**: 보안 및 신뢰 포인트
- **FAQ**: 아코디언 형태의 자주 묻는 질문
- **Early Access 폼**: Google Sheets 연동 신청 폼

## 디자인 특징

- 다크 테마 (차콜/블랙 배경)
- Magic UI 스타일 (글로우, 그라데이션 텍스트, Bento Grid)
- 미니멀하고 제품스러운 디자인
- 넓은 여백과 큰 타이포그래피
- 반응형 디자인

## 라우팅

- `/` - 메인 랜딩 페이지
- `/about` - 현재 미구현 (추후 구현 예정)

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

## 참고사항

- 모든 섹션은 앵커 링크로 스무스 스크롤이 가능합니다.
- 대시보드와 Success Case 섹션은 클릭 가능한 인터랙티브 요소를 포함합니다.
- 민감한 정보(환경 변수, 인증 정보)는 `.gitignore`에 의해 제외됩니다.

