# AI 검색 최적화 가이드

**작성일**: 2026-01-05  
**대상**: AI 검색 엔진 (ChatGPT 웹 검색, Perplexity, Google AI Overview 등)

---

## 1. AI 검색 엔진의 특징

AI 검색 엔진은 일반 검색 엔진과 달리:
- **구조화된 데이터를 선호**: JSON-LD 스키마를 통해 명확한 정보 추출
- **질문-답변 형식 선호**: FAQ, HowTo 등 구조화된 콘텐츠
- **맥락과 정의 중요**: 용어 정의, 관련 개념 연결
- **단계별 가이드 선호**: HowTo 스키마로 구조화된 프로세스
- **명확한 설명**: "무엇인가", "어떻게 사용하는가", "누구를 위한 것인가"

---

## 2. 구현된 AI 검색 최적화 항목

### 2.1 구조화된 데이터 (Schema.org) 강화

#### HowTo 스키마
- **위치**: `src/widgets/how-it-works/HowItWorks.tsx`
- **내용**: 3단계 데이터 분석 프로세스를 HowTo 스키마로 구조화
- **효과**: "Vibe Semantic 사용 방법" 같은 질문에 단계별 답변 제공

```json
{
  "@type": "HowTo",
  "name": "Vibe Semantic으로 데이터 분석 시작하기",
  "step": [
    {
      "@type": "HowToStep",
      "position": 1,
      "name": "Connect",
      "text": "Read-only 연결: 데이터베이스에 읽기 전용으로 연결합니다..."
    }
  ]
}
```

#### FAQPage 스키마 강화
- **위치**: `src/widgets/faq/FAQ.tsx`
- **내용**: 8개 FAQ 항목 (기존 5개에서 확장)
- **추가 질문**:
  - "데이터 분석가가 없어도 사용할 수 있나요?"
  - "어떤 지표를 분석할 수 있나요?"
  - "보안은 어떻게 보장되나요?"

#### DefinedTerm 스키마
- **위치**: `src/app/layout.tsx`
- **내용**: 주요 용어 정의 (DAU, 리텐션, 전환율, BI)
- **효과**: "DAU가 뭐야?" 같은 질문에 명확한 정의 제공

```json
{
  "@type": "DefinedTermSet",
  "hasDefinedTerm": [
    {
      "@type": "DefinedTerm",
      "name": "DAU",
      "description": "Daily Active Users의 약자로..."
    }
  ]
}
```

#### BreadcrumbList 스키마
- **위치**: `src/app/layout.tsx`
- **내용**: 페이지 구조 명확화
- **효과**: AI가 사이트 구조를 이해하고 맥락 제공

#### Product 스키마 강화
- **위치**: `src/app/page.tsx`
- **추가 정보**:
  - `brand`: 브랜드 정보
  - `featureList`: 주요 기능 목록
  - `availability`: 재고 상태
  - 더 상세한 `description`

#### SoftwareApplication 스키마 강화
- **위치**: `src/app/layout.tsx`
- **추가 정보**:
  - `featureList`: 기능 목록
  - `applicationSubCategory`: 하위 카테고리
  - `screenshot`: 스크린샷 URL
  - 더 상세한 `description`

---

## 3. 콘텐츠 최적화 전략

### 3.1 명확한 정의 제공

#### "무엇인가" (What)
- Hero 섹션: "SQL 없이도 제품 지표를 분석하고 다음 액션을 제안받는 AI 기반 데이터 분석 도구"
- Problem 섹션: "데이터 분석가가 없어도, SQL을 몰라도 제품 지표를 분석하고 의사결정할 수 있습니다"

#### "누구를 위한 것인가" (Who)
- "PO, 창업가, 마케터를 위한"
- "데이터 분석가가 없어도 사용 가능"
- "SQL 지식 없이도 사용 가능"

#### "어떻게 사용하는가" (How)
- HowTo 스키마로 3단계 프로세스 명시
- 각 단계별 상세 설명

### 3.2 질문-답변 구조 강화

#### FAQ 확장
- 기존 5개 → 8개로 확장
- 더 구체적이고 상세한 답변 제공
- 예시와 맥락 포함

#### 자연어 질문 패턴 포함
- "지난 7일 리텐션이 왜 떨어졌어?" (Hero 섹션)
- "정말 SQL 없이도 가능한가요?" (FAQ)

### 3.3 관련 개념 연결

#### 용어 정의
- DAU, 리텐션, 전환율, BI 등 주요 용어 정의
- DefinedTerm 스키마로 구조화

#### 관련 도구 언급
- "Supabase, BigQuery 지원"
- "GA/Firebase, Metabase/Looker 대체"

---

## 4. 추가 권장 사항

### 4.1 Article/BlogPost 스키마 (향후)

블로그나 리소스 섹션 추가 시:
```json
{
  "@type": "Article",
  "headline": "PO를 위한 데이터 분석 가이드",
  "author": { "@type": "Organization", "name": "Dropdown" },
  "datePublished": "2026-01-05"
}
```

### 4.2 VideoObject 스키마 (향후)

데모 비디오 추가 시:
```json
{
  "@type": "VideoObject",
  "name": "Vibe Semantic 데모",
  "description": "Vibe Semantic 사용 방법 데모 비디오",
  "thumbnailUrl": "...",
  "uploadDate": "2026-01-05"
}
```

### 4.3 Review/Rating 스키마 (향후)

고객 후기 추가 시:
```json
{
  "@type": "Review",
  "author": { "@type": "Person", "name": "..." },
  "reviewRating": { "@type": "Rating", "ratingValue": "5" }
}
```

### 4.4 콘텐츠 확장

#### "비교" 섹션 추가
- "Vibe Semantic vs Metabase"
- "Vibe Semantic vs 직접 SQL"
- AI가 비교 질문에 답변할 수 있도록

#### "사용 사례" 섹션 강화
- 실제 사용 사례를 더 상세히
- 구조화된 데이터로 CaseStudy 스키마 추가

#### "시작하기" 가이드
- 단계별 튜토리얼
- HowTo 스키마로 구조화

---

## 5. AI 검색 엔진별 특화 전략

### 5.1 ChatGPT 웹 검색
- **강점**: 구조화된 데이터, FAQ, HowTo
- **추가 작업**: 더 많은 맥락과 설명 제공

### 5.2 Perplexity
- **강점**: 출처 명시, 관련 개념 연결
- **추가 작업**: 명확한 출처 정보, 관련 링크

### 5.3 Google AI Overview
- **강점**: 구조화된 데이터, 명확한 정의
- **추가 작업**: Google Search Console 등록, 구조화된 데이터 검증

---

## 6. 체크리스트

### 완료된 항목 ✅

- [x] HowTo 스키마 (3단계 프로세스)
- [x] FAQPage 스키마 강화 (8개 질문)
- [x] DefinedTerm 스키마 (용어 정의)
- [x] BreadcrumbList 스키마
- [x] Product 스키마 강화
- [x] SoftwareApplication 스키마 강화
- [x] 명확한 "무엇인가", "누구를 위한 것인가", "어떻게 사용하는가" 설명
- [x] 자연어 질문 패턴 포함
- [x] 관련 개념 연결 (용어 정의)

### 추가 작업 필요 ⚠️

- [ ] Article/BlogPost 스키마 (블로그 섹션 추가 시)
- [ ] VideoObject 스키마 (데모 비디오 추가 시)
- [ ] Review/Rating 스키마 (고객 후기 추가 시)
- [ ] 비교 섹션 추가
- [ ] 사용 사례 강화 (CaseStudy 스키마)
- [ ] 시작하기 가이드 (튜토리얼)

---

## 7. 테스트 방법

### 7.1 구조화된 데이터 검증

1. [Google Rich Results Test](https://search.google.com/test/rich-results)
   - 모든 스키마 검증
   - 오류 및 경고 확인

2. [Schema.org Validator](https://validator.schema.org/)
   - JSON-LD 문법 검증
   - 스키마 타입 검증

### 7.2 AI 검색 테스트

1. **ChatGPT 웹 검색**
   - "Vibe Semantic이 뭐야?"
   - "Vibe Semantic 사용 방법"
   - "SQL 없이 데이터 분석하는 도구"

2. **Perplexity**
   - "PO를 위한 데이터 분석 도구"
   - "데이터 분석가 없이 사용할 수 있는 BI 도구"

3. **Google AI Overview**
   - "Vibe Semantic"
   - "SQL 없이 데이터 분석"

---

## 8. 참고 자료

- [Schema.org Documentation](https://schema.org/)
- [Google AI Overview Guidelines](https://developers.google.com/search/docs/appearance/google-ai-overviews)
- [ChatGPT Web Search](https://openai.com/index/introducing-chatgpt-and-whisper-apis/)
- [Perplexity AI](https://www.perplexity.ai/)

