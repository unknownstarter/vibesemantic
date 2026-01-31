# UI/UX 감사 및 디자인 시스템 적용 플랜 (2026-01-31)

**목적**: 백엔드 중심 작업 이후, 각 페이지 UI가 목표 UX 및 기존 디자인 시스템·컨셉 컬러에 맞게 구현되었는지 검토하고, 부족한 부분을 적용한다.

---

## 1. 디자인 시스템 요약

### 1.1 컬러·토큰 (globals.css, tailwind.config)

| 토큰 | 용도 |
|------|------|
| `--color-background` (10 10 10) | 페이지 배경 |
| `--color-foreground` (237 237 237) | 본문 텍스트 |
| `--color-primary` (34 197 94, green) | CTA, 강조, 성공 |
| `--color-accent` (96 165 250, blue) | 보조 CTA, 링크, 정보 |
| `--color-muted` / `--color-subtle` | 보조 텍스트 |
| `--color-surface` (24 24 24) | 카드·패널 배경 |
| `--color-surface-inset` (49 49 49) | 입력·중첩 영역 |
| `--color-border` (255 255 255 / 10) | 테두리 |
| `--color-success` / `--color-warning` / `--color-danger` | 상태 표시 |

### 1.2 패턴 (CLAUDE.md)

- **Card**: `border-white/10 bg-white/5 backdrop-blur-sm` → `border-border/10 bg-surface/5` 등
- **Input**: `bg-white/5 border border-white/10` → `bg-surface border border-border/10`
- **Responsive**: `md:`, `lg:`, `xl:` prefix
- **애니메이션**: `animate-fadeIn`, `animate-fade-in`, `animate-slide-up` (globals, tailwind)

### 1.3 공용 컴포넌트

- **Button**: variant `primary` | `secondary` | `ghost`, size `sm` | `md` | `lg`
- **Card**: variant `default` | `bento` | `glow`
- **Spinner**: size `sm` | `md` | `lg`, `text-primary` 등
- **ErrorMessage**: danger 스타일, onRetry
- **Container**: size `sm` | `md` | `lg` | `xl` | `full`

---

## 2. 페이지별 목표 UX 및 검토 결과

### 2.1 대시보드 (`/dashboard`)

| 목표 UX | 검토 | 조치 |
|---------|------|------|
| 프로젝트 목록·빈 상태 일관된 카드 스타일 | 빈 상태가 `div` + surface 스타일로만 구현됨 | `Card` 사용으로 통일 |
| 로딩 시 일관된 스피너 | 인라인 Spinner 컴포넌트 사용 | 공용 `Spinner` 사용 |
| 프로젝트 카드 호버·전환 | transition 있음 | 유지, 필요 시 `animate-fadeIn` 추가 |

### 2.2 프로젝트 상세 (`/projects/[pid]`)

| 목표 UX | 검토 | 조치 |
|---------|------|------|
| 설정 단계·워크스페이스 카드 | surface/border/primary·success 사용 일관 | 유지 |
| 빈 워크스페이스 | Card 스타일 div | `Card` 사용 권장 (선택) |
| 온보딩 BottomSheet | 디자인 시스템 색상 사용 | 유지 |

### 2.3 데이터 소스 (`/projects/[pid]/setup/sources`)

| 목표 UX | 검토 | 조치 |
|---------|------|------|
| GA4/CSV 섹션 카드 | surface, border, primary 아이콘 | 유지 |
| 입력 필드 | `bg-surface border-border/10` 등 사용 | 디자인 시스템과 일치, 유지 |
| 목적 선택 버튼 | primary/10, border-primary | 유지 |

### 2.4 AI 분석·에이전트 (`/projects/[pid]/workspaces/[wid]/agent`)

| 목표 UX | 검토 | 조치 |
|---------|------|------|
| 리포트/채팅 탭, 기간 토글 | surface-inset, primary 선택 | 유지 |
| 리포트 로딩 | Spinner + 문구 | 공용 `Spinner` 사용 확인 |
| **차트 → 채팅 CTA** | "이 숫자에 대해 물어보기" ghost 버튼으로 눈에 덜 띔 | `accent` 또는 `secondary` 스타일로 CTA 강조 |
| 빈 채팅 제안 | motion + gradient 아이콘 | 유지 |
| 에러 메시지 표시 | 인라인 텍스트 | 유지 (ErrorMessage 패턴 적용 가능, 선택) |

### 2.5 로그인 (`/login`)

| 목표 UX | 검토 | 조치 |
|---------|------|------|
| 카드·배경 블러 | Card 사용 | 유지 |
| 로딩/OTP 확인 중 스피너 | 인라인 Spinner 컴포넌트 | 공용 `Spinner` 사용 |
| 에러/경고 메시지 | danger/warning 배경·테두리 | 유지 |

### 2.6 콜백 에러 (`/callback/error`)

| 목표 UX | 검토 | 조치 |
|---------|------|------|
| 에러 카드·버튼 | Card, Button | 유지 |
| 로딩 폴백 스피너 | 인라인 div 스피너 | 공용 `Spinner` 사용 |

### 2.7 마케팅 랜딩·데모

| 목표 UX | 검토 | 조치 |
|---------|------|------|
| 위젯(Hero, Pricing 등) | 별도 디자인 | 이번 감사 범위 외 (필요 시 별도 플랜) |

---

## 3. 적용한 변경 사항 요약 (2026-01-31 구현 완료)

1. **스피너 일관화**: 대시보드, 로그인, 콜백 에러 페이지에서 인라인 스피너 제거 → `@/shared/ui/Spinner` 사용.
2. **빈 상태 카드**: 대시보드·프로젝트 상세(워크스페이스 없음) 빈 상태 영역을 `Card` 컴포넌트로 감싸고 `animate-fadeIn` 적용.
3. **차트→채팅 CTA**: ReportCharts 내 "이 숫자에 대해 물어보기" 버튼을 `variant="secondary"` 및 `text-accent border-accent/30 hover:border-accent/50 hover:bg-accent/10` 로 변경해 CTA 가시성 향상.
4. **플랜 문서화**: 본 플랜 문서에 디자인 시스템 요약, 페이지별 목표 UX, 검토 결과, 적용 사항 정리.

---

## 4. 추후 권장 사항

- **입력 필드 공통화**: `bg-surface border border-border/10 focus:ring-primary/40` 등을 공용 Input 컴포넌트 또는 유틸 클래스로 추출해 로그인·설정·폼 전반에 적용.
- **에러 상태**: API 실패 시 에이전트 페이지 등에서 `ErrorMessage` 컴포넌트 재사용 검토.
- **접근성**: 포커스 링(focus:ring), 버튼/링크 aria-label 등 점검.

---

## 5. 참조

- `src/shared/styles/globals.css` — 컬러 변수, 유틸 클래스
- `tailwind.config.ts` — chart, animation
- `CLAUDE.md` — 카드/입력 패턴
- `src/shared/ui/` — Button, Card, Spinner, ErrorMessage, Container
