# 개발자 가이드
## Vibe Semantic Landing Page

**작성일**: 2026-01-05  
**버전**: 1.0

---

## 1. 프로젝트 구조

### 1.1 클린 아키텍처 레이어링

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 라우트
│   │   ├── leads/         # Early Access 폼 API
│   │   └── pricing/       # Pricing 폼 API
│   ├── layout.tsx         # 루트 레이아웃
│   ├── page.tsx           # 메인 랜딩 페이지
│   └── icon.svg           # 파비콘
│
├── shared/                 # 공통 모듈
│   ├── ui/                # 재사용 UI 컴포넌트
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Section.tsx
│   │   ├── Container.tsx
│   │   ├── Accordion.tsx
│   │   └── Dialog.tsx
│   ├── lib/               # 유틸리티 함수
│   │   └── utils.ts       # cn 함수 (clsx + tailwind-merge)
│   └── styles/            # 글로벌 스타일
│       └── globals.css
│
├── entities/              # 도메인 엔티티
│   ├── lead/             # Lead 타입 정의
│   │   └── types.ts
│   └── pricing/          # Pricing 타입 정의
│       └── types.ts
│
├── features/             # 기능 모듈
│   └── lead-capture/     # Early Access 신청 폼
│       ├── model/
│       │   ├── useLeadCapture.ts
│       │   └── validation.ts
│       └── ui/
│           └── LeadCaptureForm.tsx
│
├── widgets/              # 복합 위젯
│   ├── header/
│   │   ├── Header.tsx
│   │   └── LogoIcon.tsx
│   ├── footer/
│   │   └── Footer.tsx
│   ├── hero/
│   │   └── Hero.tsx
│   ├── problem/
│   │   └── Problem.tsx
│   ├── bento/
│   │   └── Bento.tsx
│   ├── pricing/
│   │   └── Pricing.tsx
│   ├── success-case/
│   │   └── SuccessCase.tsx
│   ├── how-it-works/
│   │   └── HowItWorks.tsx
│   ├── security/
│   │   └── Security.tsx
│   ├── faq/
│   │   └── FAQ.tsx
│   └── dashboard/
│       └── Dashboard.tsx
│
└── lib/                  # 외부 라이브러리 연동
    └── google-sheets.ts  # Google Sheets API 연동
```

### 1.2 레이어별 역할

- **app/**: Next.js 라우팅 및 API 엔드포인트
- **shared/**: 프로젝트 전역에서 사용하는 공통 컴포넌트/유틸
- **entities/**: 도메인 엔티티 타입 정의
- **features/**: 비즈니스 로직이 포함된 기능 모듈
- **widgets/**: 여러 컴포넌트를 조합한 복합 위젯
- **lib/**: 외부 서비스 연동 로직

---

## 2. 코딩 컨벤션

### 2.1 TypeScript 규칙
- **strict 모드 활성화**
- **타입 명시**: 모든 함수 파라미터와 반환값에 타입 명시
- **인터페이스 사용**: 객체 타입은 interface 사용
- **타입 가드**: 타입 안전성을 위한 타입 가드 활용

### 2.2 React 규칙
- **서버 컴포넌트 우선**: 기본적으로 서버 컴포넌트 사용
- **클라이언트 컴포넌트**: 인터랙션이 필요한 경우만 "use client" 사용
- **컴포넌트 분리**: 작은 단위로 컴포넌트 분리
- **forwardRef 사용**: ref를 전달해야 하는 컴포넌트는 forwardRef 사용

### 2.3 네이밍 규칙
- **컴포넌트**: PascalCase (예: `Button`, `LeadCaptureForm`)
- **함수/변수**: camelCase (예: `handleSubmit`, `formData`)
- **타입/인터페이스**: PascalCase (예: `LeadFormData`, `ButtonProps`)
- **상수**: UPPER_SNAKE_CASE (예: `JOB_ROLES`, `DAU_RANGES`)
- **파일명**: 컴포넌트는 PascalCase, 유틸은 camelCase

### 2.4 파일 구조 규칙
- **한 파일에 하나의 주요 export**: 컴포넌트는 각각 별도 파일
- **index.ts 사용 금지**: 명시적 import 경로 사용
- **폴더 구조**: 기능별/도메인별로 그룹화

---

## 3. 스타일 가이드

### 3.1 TailwindCSS 사용 규칙
- **유틸리티 클래스 우선**: 커스텀 CSS 최소화
- **cn 함수 사용**: 조건부 클래스는 `cn()` 함수로 병합
- **반응형**: `md:`, `lg:` 등 반응형 프리픽스 사용
- **일관된 간격**: Tailwind의 spacing scale 사용 (4, 6, 8, 12, 16, 24, 32 등)

### 3.2 디자인 토큰
```typescript
// 색상
- 배경: bg-background (#0a0a0a)
- 텍스트: text-foreground (#ededed)
- 보더: border-white/10
- 배경 (카드): bg-white/5
- 호버 배경: bg-white/10

// 간격
- 섹션 패딩: py-24 md:py-32
- 카드 패딩: p-6, p-8
- 그리드 갭: gap-6

// 라운드
- 카드: rounded-2xl
- 버튼: rounded-lg
- 배지: rounded-full

// 타이포그래피
- H1: text-5xl md:text-7xl font-bold
- H2: text-4xl md:text-5xl font-bold
- Body: text-lg text-gray-400
```

### 3.3 컴포넌트 스타일 패턴
- **Card**: `border-white/10 bg-white/5 backdrop-blur-sm`
- **Button Primary**: `bg-white text-black hover:bg-gray-100`
- **Button Secondary**: `border border-white/20 text-foreground hover:border-white/30`
- **Input**: `bg-white/5 border border-white/10 focus:ring-2 focus:ring-white/20`

---

## 4. 컴포넌트 개발 가이드

### 4.1 공통 UI 컴포넌트
모든 공통 UI 컴포넌트는 `src/shared/ui/`에 위치하며, 다음 규칙을 따릅니다:

- **forwardRef 사용**: ref 전달 가능하도록 구현
- **className prop**: 외부에서 스타일 오버라이드 가능
- **variant prop**: 스타일 변형 지원
- **접근성**: aria 속성, 키보드 네비게이션 지원

### 4.2 위젯 컴포넌트
위젯은 `src/widgets/`에 위치하며:

- **독립적 동작**: 다른 위젯에 의존하지 않음
- **섹션 단위**: 각 위젯은 하나의 섹션을 담당
- **id 속성**: 앵커 링크를 위한 id 포함

### 4.3 기능 모듈
기능 모듈은 `src/features/`에 위치하며:

- **model/**: 비즈니스 로직, 상태 관리, 검증
- **ui/**: UI 컴포넌트
- **타입 정의**: entities에서 import

---

## 5. 상태 관리

### 5.1 로컬 상태
- **useState**: 컴포넌트 내부 상태
- **커스텀 훅**: 재사용 가능한 상태 로직은 커스텀 훅으로 분리

### 5.2 폼 상태
- **커스텀 훅 사용**: `useLeadCapture`, `usePricingForm` 등
- **검증 로직 분리**: `validation.ts`에 검증 함수 분리
- **에러 처리**: 사용자 친화적 에러 메시지 표시

---

## 6. API 개발 가이드

### 6.1 API 라우트 구조
```
src/app/api/
├── leads/
│   └── route.ts    # POST: Early Access 폼 저장
└── pricing/
    └── route.ts    # POST: Pricing 폼 저장
```

### 6.2 API 응답 형식
```typescript
// 성공
{
  success: true,
  message: "신청이 접수되었습니다."
}

// 에러
{
  error: "필수 필드가 누락되었습니다."
}
```

### 6.3 에러 처리
- **400**: 클라이언트 에러 (검증 실패 등)
- **500**: 서버 에러
- **에러 로깅**: console.error로 서버 로그 기록

---

## 7. Google Sheets 연동

### 7.1 연동 방식
- **Google Apps Script**: 서비스 계정 키 없이 웹 앱으로 연동
- **환경 변수**: `GOOGLE_SHEETS_WEB_APP_URL` 설정 필요

### 7.2 데이터 구조
- **Early Access**: Sheet1 시트에 저장
- **Pricing**: Pricing 시트에 저장
- **자동 헤더**: 첫 행에 자동으로 헤더 추가

### 7.3 설정 방법
자세한 내용은 `GOOGLE_SHEETS_SETUP.md` 참고

---

## 8. Git 워크플로우

### 8.1 브랜치 전략
- **main**: 프로덕션 배포 브랜치
- **feature/**: 기능 개발 브랜치
- **fix/**: 버그 수정 브랜치

### 8.2 커밋 메시지 규칙
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 스타일 변경 (포맷팅 등)
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 빌드 설정, 패키지 관리 등
```

### 8.3 .gitignore
다음 파일/폴더는 Git에 커밋하지 않음:
- `.env*.local` (환경 변수)
- `google-credentials.json` (인증 정보)
- `data/` (로컬 데이터)
- `node_modules/`
- `.next/` (빌드 파일)

---

## 9. 배포 가이드

### 9.1 로컬 개발
```bash
npm install
npm run dev
```

### 9.2 프로덕션 빌드
```bash
npm run build
npm start
```

### 9.3 GitHub 배포
자세한 내용은 `DEPLOY_TO_GITHUB.md` 참고

### 9.4 환경 변수 설정
프로덕션 환경에서 다음 환경 변수 설정 필요:
- `GOOGLE_SHEETS_WEB_APP_URL`: Google Apps Script 웹 앱 URL

---

## 10. 성능 최적화

### 10.1 이미지 최적화
- Next.js Image 컴포넌트 사용
- 적절한 크기와 포맷 선택

### 10.2 코드 스플리팅
- 동적 import 사용 (필요한 경우)
- 페이지별 자동 코드 스플리팅

### 10.3 번들 크기 최적화
- 불필요한 의존성 제거
- Tree shaking 활용

---

## 11. 접근성 (A11y)

### 11.1 필수 요구사항
- **키보드 네비게이션**: 모든 인터랙티브 요소 접근 가능
- **ARIA 속성**: 적절한 aria-label, aria-describedby 사용
- **색상 대비**: WCAG AA 기준 준수
- **포커스 표시**: 명확한 포커스 인디케이터

### 11.2 폼 접근성
- **label 연결**: 모든 input에 htmlFor/id 연결
- **에러 메시지**: aria-describedby로 에러 메시지 연결
- **required 표시**: 시각적 + aria-required

---

## 12. 테스트 전략

### 12.1 수동 테스트 체크리스트
- [ ] 모든 섹션 스크롤 확인
- [ ] 앵커 링크 동작 확인
- [ ] 모달 열기/닫기 확인
- [ ] 폼 제출 및 검증 확인
- [ ] Google Sheets 저장 확인
- [ ] 반응형 디자인 확인 (모바일/태블릿/데스크톱)
- [ ] 브라우저 호환성 확인

### 12.2 자동화 테스트 (향후)
- E2E 테스트 (Playwright 등)
- 컴포넌트 테스트 (React Testing Library)

---

## 13. 트러블슈팅

### 13.1 일반적인 문제

#### Google Sheets 저장 실패
- 환경 변수 확인: `GOOGLE_SHEETS_WEB_APP_URL` 설정 확인
- Google Apps Script 권한 확인
- 웹 앱 URL 유효성 확인

#### 스타일이 적용되지 않음
- TailwindCSS 빌드 확인
- 클래스명 오타 확인
- 캐시 클리어

#### 타입 에러
- `npm run build`로 타입 체크
- tsconfig.json 설정 확인

---

## 14. 참고 자료

### 14.1 문서
- PRD: `PRD.md`
- Google Sheets 설정: `GOOGLE_SHEETS_SETUP.md`
- 배포 가이드: `DEPLOY_TO_GITHUB.md`
- README: `README.md`

### 14.2 외부 리소스
- Next.js 문서: https://nextjs.org/docs
- TailwindCSS 문서: https://tailwindcss.com/docs
- Google Apps Script: https://script.google.com

---

## 15. 향후 개선 사항

### 15.1 기술 부채
- [ ] 테스트 코드 추가
- [ ] 에러 바운더리 추가
- [ ] 로딩 상태 개선
- [ ] SEO 최적화

### 15.2 기능 개선
- [ ] 실제 결제 시스템 연동
- [ ] 이메일 알림 시스템
- [ ] 관리자 대시보드
- [ ] A/B 테스트 기능

---

**문서 버전**: 1.0  
**최종 수정일**: 2026-01-05

