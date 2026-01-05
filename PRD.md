# Product Requirements Document (PRD)
## Vibe Semantic Landing Page

**작성일**: 2026-01-05  
**버전**: 1.0  
**상태**: Private Preview

---

## 1. 프로젝트 개요

### 1.1 목적
Vibe Semantic의 Fake Door 랜딩 페이지를 통해 Early Access 신청자를 모집하고, 제품에 대한 관심도를 측정합니다.

### 1.2 목표
- **주요 목표**: Early Access 신청자 확보 및 리드 수집
- **부수 목표**: 제품 가치 전달 및 사용자 관심도 측정
- **측정 지표**: 신청 폼 제출 수, Pricing 플랜별 선택 비율

### 1.3 타겟 사용자
- 서비스 운영자 (PO/PM, Founder/CEO, Marketer/Growth, Developer)
- DAU 0-100부터 10K+까지 다양한 규모의 서비스
- 데이터 분석 도구를 사용하거나 필요로 하는 팀

---

## 2. 기능 요구사항

### 2.1 페이지 구조

#### 2.1.1 헤더 (Sticky)
- **위치**: 상단 고정
- **좌측**: 로고 아이콘 + "Vibe Semantic" 텍스트
- **중앙**: 네비게이션 링크 (Product, How it works, Security, FAQ)
- **우측**: "Early Access" CTA 버튼 (#apply로 스크롤)

#### 2.1.2 Hero 섹션
- **Eyebrow**: "Private Preview · Jan 2026"
- **H1**: "Vibe Semantic"
- **Sub headline**: "Your Product's Personal Data Analyst & BI"
- **Body copy**: "SQL 없이도, 지금 봐야 할 지표와 다음 액션을 제안합니다."
- **CTA 버튼**: 
  - Primary: "Early Access 신청하기" (#apply)
  - Secondary: "How it works" (#how)
- **우측**: 인터랙티브 대시보드
  - 클릭 가능한 메트릭 카드 (DAU, CTR, CVR, Add to Cart)
  - 추천 액션 버튼 (전환율 올리기, 리텐션 개선, 참여도 증가)
  - 액션 클릭 시 인사이트 표시
  - 실시간 차트 (상승 추세)

#### 2.1.3 Problem 섹션
- **제목**: "이런 고민 있으신가요?"
- **3개 카드**:
  1. "지표는 보이는데 해석이 없다"
  2. "SQL/쿼리 비용이 너무 크다"
  3. "데이터팀이 없거나 기다려야 한다"

#### 2.1.4 Features 섹션 (#product)
- **제목**: "Features"
- **Bento Grid 레이아웃** (7개 카드):
  1. Connect (Read-only) - 2칸
  2. Metric Catalog
  3. Ask in Natural Language
  4. Explain the Why - 2칸
  5. Next Actions
  6. Shareable Report
  7. Security

#### 2.1.5 Pricing 섹션 (#pricing)
- **제목**: "Pricing"
- **3개 플랜 카드**:
  1. **기본** - 출시 알림
     - 가격: 무료
     - 기능: 출시 시 알림 받기, 특별 혜택 없음
     - 버튼: "이메일 남기기" (이메일 입력 모달)
   
  2. **인기** - 우선 초대
     - 가격: 무료
     - 기능: 출시 즉시 우선 초대, 프리미엄 1개월 무료, 프로필 우선 노출
     - 버튼: "전화번호 등록" (전화번호 입력 모달)
   
  3. **추천** - 평생 프리미엄
     - 가격: 평생 ₩29,000 (원가: 연 ₩118,800 취소선)
     - 할인 배너: "75% 할인 100명 한정"
     - 기능: 출시 즉시 사용, 모든 프리미엄 기능 평생 무료, 무제한 Interested, 고급 필터, 프로필 부스트, 창립 멤버 배지
     - 버튼: "지금 결제하기" (이메일, 전화번호, 담당자 이름, 회사명 입력 모달)
     - 모달 안내: "남겨주신 이메일로 별도 결제 안내를 드리겠습니다"

- **모달 기능**:
  - 각 버튼 클릭 시 팝업 모달 표시
  - 플랜별 필수 입력 필드
  - 제출 후 성공 메시지 표시
  - Google Sheets로 자동 저장

#### 2.1.6 Success Case 섹션 (#success)
- **제목**: "Success Cases"
- **3개 케이스 스터디 카드** (클릭 가능):
  1. **이커머스**: CVR +0.5% (Add to Cart 버튼 최적화)
  2. **모바일 앱**: DAU +10.3% (푸시 알림 타이밍 개선)
  3. **콘텐츠 플랫폼**: CTR +0.8% (추천 알고리즘 개선)
- 각 카드 클릭 시 상세 인사이트 표시
- "n일 이내 데이터 변화" 및 "동기간 적용 기능" 설명 포함

#### 2.1.7 How it works 섹션 (#how)
- **제목**: "How it works"
- **3단계 타임라인**:
  1. Connect - Read-only 연결
  2. Understand - 서비스 목적/목표 입력
  3. Analyze & Suggest - 차트/인사이트/다음 액션

#### 2.1.8 Security 섹션 (#security)
- **제목**: "Security & Trust"
- **4개 보안 포인트**:
  1. Read-only access
  2. Allowlist (analytics schema/view only)
  3. Query limit/timeout
  4. PII 최소화 가이드

#### 2.1.9 FAQ 섹션 (#faq)
- **제목**: "FAQ"
- **아코디언 UI** (5개 질문):
  1. "정말 SQL 없이도 가능한가요?"
  2. "데이터를 저장하나요?"
  3. "Supabase/BigQuery 둘 다 되나요?"
  4. "오픈 일정은 어떻게 되나요?"
  5. "가격은 어떻게 되나요?"

#### 2.1.10 Early Access 신청 폼 (#apply)
- **위치**: 페이지 하단
- **상단 문구**: "Vibe Semantic은 소수의 서비스 운영자와 함께 만드는 Private Preview입니다."
- **입력 필드**:
  - 회사명 (필수)
  - 담당자 이름 (필수)
  - 직책/직무 (필수, select)
  - 서비스 이름 (필수)
  - 서비스 DAU (필수, radio)
  - 사용 목적 (필수, checkbox multiple)
  - 지금 가장 답답한 점 (필수, textarea)
  - 현재 사용 중인 분석 도구 (필수, select)
  - Early Access에서 가장 기대하는 기능 (필수, select)
- **제출 동작**: Google Sheets에 저장, 성공 메시지 표시

#### 2.1.11 Footer
- **Contact**: "Message us: hello@dropdown.xyz" (mailto 링크)
- **Company**: Dropdown
- **Copyright**: © 2026 Dropdown. All rights reserved.

---

## 3. 디자인 요구사항

### 3.1 디자인 시스템
- **레퍼런스**: getsabo.com 스타일
- **색상 팔레트**:
  - 배경: 다크 테마 (#0a0a0a)
  - 텍스트: 흰색/회색 계열
  - 보라색 그라데이션 제거
  - 미묘한 투명도 사용 (white/10, white/5)
- **타이포그래피**:
  - 큰 타이포, 넓은 여백
  - 섹션 간 여백 크게
- **컴포넌트 스타일**:
  - 카드: 큰 라운드 (rounded-2xl)
  - 보더: 미묘한 테두리 (border-white/10)
  - 호버 효과: 부드러운 전환
  - Magic UI 느낌이지만 과하지 않게

### 3.2 반응형 디자인
- 모바일, 태블릿, 데스크톱 대응
- 그리드 레이아웃 반응형 조정

### 3.3 인터랙션
- 스무스 스크롤 (앵커 링크)
- 모달 다이얼로그 (Pricing 버튼 클릭)
- 클릭 가능한 요소 (대시보드, Success Case)

---

## 4. 기술 요구사항

### 4.1 기술 스택
- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript
- **스타일링**: TailwindCSS
- **아키텍처**: 클린 아키텍처 (프론트엔드 레이어링)

### 4.2 데이터 저장
- **Early Access 폼**: Google Sheets (Sheet1)
- **Pricing 폼**: Google Sheets (Pricing 시트)
- **연동 방식**: Google Apps Script 웹 앱

### 4.3 성능 요구사항
- SSR 우선 (서버 컴포넌트 기본)
- 클라이언트 컴포넌트는 필요한 곳만 ("use client")
- 이미지 최적화
- 코드 스플리팅

---

## 5. 사용자 플로우

### 5.1 Early Access 신청 플로우
1. 사용자가 페이지 하단 #apply 섹션으로 스크롤
2. 폼 작성
3. 제출 버튼 클릭
4. 검증 후 Google Sheets에 저장
5. 성공 메시지 표시

### 5.2 Pricing 플랜 선택 플로우
1. 사용자가 #pricing 섹션으로 스크롤
2. 원하는 플랜 카드 확인
3. 버튼 클릭
4. 모달 팝업 표시
5. 필수 정보 입력
6. 제출 버튼 클릭
7. Google Sheets에 저장
8. 성공 메시지 표시 (Premium의 경우 결제 안내 메시지 포함)

---

## 6. 향후 계획

### 6.1 단기 (1-2개월)
- 실제 결제 시스템 연동 (Premium 플랜)
- 이메일 알림 시스템 구축
- 신청자 관리 대시보드

### 6.2 중기 (3-6개월)
- /about 페이지 추가
- 현재 랜딩 페이지를 /about으로 이동
- 새로운 Home 페이지 구현
- A/B 테스트 기능

### 6.3 장기 (6개월+)
- 실제 제품 출시
- 사용자 대시보드
- 인증 시스템

---

## 7. 성공 지표

### 7.1 정량 지표
- Early Access 신청자 수
- Pricing 플랜별 선택 비율
- 페이지 체류 시간
- 스크롤 깊이

### 7.2 정성 지표
- 사용자 피드백
- 신청 폼의 "지금 가장 답답한 점" 분석
- 기대하는 기능 우선순위

---

## 8. 제약사항

### 8.1 현재 제약
- 실제 결제 시스템 미구현 (Fake Door)
- 이메일 알림 시스템 미구현
- 데이터베이스 없이 Google Sheets만 사용

### 8.2 기술 제약
- Google Apps Script 웹 앱 URL 보안 관리 필요
- 환경 변수 관리 (.env.local)

---

## 9. 참고 자료

- 레퍼런스 사이트: https://getsabo.com/
- Google Sheets 연동 가이드: `GOOGLE_SHEETS_SETUP.md`
- 배포 가이드: `DEPLOY_TO_GITHUB.md`

---

**문서 버전**: 1.0  
**최종 수정일**: 2026-01-05

