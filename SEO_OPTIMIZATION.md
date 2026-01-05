# SEO 최적화 가이드

**작성일**: 2026-01-05  
**대상**: 데이터 분석가를 찾는 사람들 (PO, 초기 창업가, 마케터)

---

## 1. 구현된 SEO 최적화 항목

### 1.1 메타데이터 (Metadata)

#### 기본 메타 태그
- **Title**: "Vibe Semantic - SQL 없이 데이터 분석하는 AI BI 도구 | 제품 지표 분석"
- **Description**: 타겟 키워드 포함한 상세 설명
- **Keywords**: 데이터 분석, BI 도구, 제품 지표 분석, SQL 없이 데이터 분석 등 16개 키워드

#### Open Graph (소셜 미디어 공유)
- `og:title`, `og:description`, `og:image` 설정
- `og:type: website`, `og:locale: ko_KR`

#### Twitter Card
- `summary_large_image` 형식
- Twitter 공유 시 최적화된 미리보기

### 1.2 구조화된 데이터 (Schema.org)

#### SoftwareApplication
- 제품 정보, 카테고리, 가격 정보 포함
- 위치: `src/app/layout.tsx`

#### Organization
- 회사 정보 (Dropdown)
- 연락처 정보
- 위치: `src/app/layout.tsx`

#### FAQPage
- FAQ 섹션의 질문/답변 구조화
- 위치: `src/widgets/faq/FAQ.tsx`

#### Product
- 제품 정보 및 가격 플랜
- 위치: `src/app/page.tsx`

### 1.3 기술적 SEO

#### robots.txt
- 위치: `src/app/robots.ts`
- `/api/` 경로 차단
- sitemap.xml 위치 명시

#### sitemap.xml
- 위치: `src/app/sitemap.ts`
- 메인 페이지 등록
- 우선순위 및 업데이트 빈도 설정

#### Canonical URL
- 중복 콘텐츠 방지
- `https://vibesemantic.xyz` 설정

### 1.4 콘텐츠 최적화

#### 타겟 키워드 자연스럽게 포함
- "데이터 분석가 없어도"
- "SQL 없이 데이터 분석"
- "제품 지표 분석"
- "PO, 창업가, 마케터를 위한"
- "DAU, 리텐션, 전환율"

#### 헤딩 구조 (H1, H2, H3)
- H1: "Vibe Semantic" (Hero 섹션)
- H2: 각 섹션 제목 (Problem, Features, How it works 등)
- 적절한 계층 구조 유지

### 1.5 접근성 (A11y)

#### ARIA 레이블
- 네비게이션에 `aria-label` 추가
- 링크에 `aria-label` 추가

#### 시맨틱 HTML
- `<header>`, `<main>`, `<nav>`, `<section>` 사용
- 적절한 HTML5 시맨틱 태그 활용

---

## 2. 추가 권장 사항

### 2.1 Open Graph 이미지 생성

현재 `/og-image.png` 파일이 없습니다. 다음 크기로 생성하세요:
- **크기**: 1200 x 630px
- **내용**: Vibe Semantic 로고 + 주요 메시지
- **위치**: `public/og-image.png`

### 2.2 Google Search Console 등록

1. [Google Search Console](https://search.google.com/search-console) 접속
2. 속성 추가: `https://vibesemantic.xyz`
3. `layout.tsx`의 `verification.google` 필드에 인증 코드 추가

### 2.3 네이버 서치어드바이저 등록

한국 사용자 타겟팅을 위해:
1. [네이버 서치어드바이저](https://searchadvisor.naver.com/) 접속
2. 사이트 등록
3. 인증 코드 추가 (필요 시)

### 2.4 성능 최적화

#### 이미지 최적화
- Next.js `Image` 컴포넌트 사용
- WebP 형식 지원
- Lazy loading 적용

#### 폰트 최적화
- `next/font` 사용 고려
- 폰트 preload 설정

### 2.5 콘텐츠 확장

#### 블로그/리소스 섹션 추가
- "데이터 분석 가이드" 같은 콘텐츠
- "PO를 위한 데이터 분석" 같은 타겟팅 콘텐츠
- 내부 링크 구조 강화

#### 고객 사례 (Case Study)
- 실제 사용 사례 추가
- 구조화된 데이터로 Review/Testimonial 추가

---

## 3. 키워드 전략

### 3.1 주요 키워드

1. **데이터 분석** (높은 검색량)
2. **BI 도구** (경쟁력 있음)
3. **제품 지표 분석** (롱테일)
4. **SQL 없이 데이터 분석** (롱테일, 낮은 경쟁)
5. **데이터 분석가** (타겟 사용자)

### 3.2 롱테일 키워드

- "PO 데이터 분석"
- "창업가 데이터 분석"
- "스타트업 데이터 분석"
- "리텐션 분석 도구"
- "전환율 분석"
- "DAU 분석"

### 3.3 키워드 배치 전략

- **Title**: 주요 키워드 포함
- **H1**: 브랜드명 + 주요 키워드
- **H2**: 섹션별 관련 키워드
- **본문**: 자연스럽게 키워드 배치
- **Alt 텍스트**: 이미지 설명에 키워드 포함

---

## 4. 모니터링 및 측정

### 4.1 추적 도구

- Google Analytics 4 (GA4)
- Google Search Console
- 네이버 서치어드바이저

### 4.2 주요 지표

- **Organic Traffic**: 자연 검색 유입
- **Keyword Rankings**: 주요 키워드 순위
- **Click-Through Rate (CTR)**: 검색 결과 클릭률
- **Bounce Rate**: 이탈률
- **Conversion Rate**: Early Access 신청 전환율

---

## 5. 체크리스트

### 완료된 항목 ✅

- [x] 메타데이터 (title, description, keywords)
- [x] Open Graph 태그
- [x] Twitter Card
- [x] 구조화된 데이터 (Schema.org)
- [x] robots.txt
- [x] sitemap.xml
- [x] Canonical URL
- [x] 시맨틱 HTML
- [x] ARIA 레이블
- [x] 헤딩 구조 최적화
- [x] 타겟 키워드 콘텐츠 포함

### 추가 작업 필요 ⚠️

- [ ] Open Graph 이미지 생성 (`/public/og-image.png`)
- [ ] Google Search Console 등록
- [ ] 네이버 서치어드바이저 등록
- [ ] Google Analytics 설정
- [ ] 이미지 alt 텍스트 추가 (필요 시)
- [ ] 성능 최적화 (Lighthouse 점수 개선)

---

## 6. AI 검색 최적화

### 6.1 추가된 구조화된 데이터

- **HowTo 스키마**: 3단계 사용 방법을 구조화
- **DefinedTerm 스키마**: 주요 용어 정의 (DAU, 리텐션, 전환율, BI)
- **BreadcrumbList 스키마**: 페이지 구조 명확화
- **FAQPage 강화**: 5개 → 8개 질문으로 확장

### 6.2 AI 검색 엔진 최적화

자세한 내용은 `AI_SEARCH_OPTIMIZATION.md` 참고

---

## 7. 참고 자료

- [Next.js Metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Schema.org Documentation](https://schema.org/)
- [Google Search Central](https://developers.google.com/search)
- [네이버 서치어드바이저 가이드](https://searchadvisor.naver.com/guide)
- [AI_SEARCH_OPTIMIZATION.md](./AI_SEARCH_OPTIMIZATION.md) - AI 검색 최적화 상세 가이드

