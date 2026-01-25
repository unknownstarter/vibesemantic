# 코드 리뷰: UX/UI 개선 구현
**Date: 2026-01-25**
**Reviewer: AI Code Reviewer**

## 🎯 리뷰 목표

클린 아키텍처 원칙 준수, 중복 제거, 의존성 최적화, 성능 개선, 그리고 **고객 만족도 향상**에 초점을 맞춘 코드 리뷰

---

## 🔴 Critical Issues (즉시 수정 필요)

### 1. **중복 코드: Spinner 컴포넌트**

**문제점:**
- `src/app/(app)/projects/[pid]/page.tsx`에 Spinner가 중복 정의됨
- `src/shared/ui/Spinner.tsx`가 이미 존재함
- 다른 페이지들도 동일한 패턴으로 중복 정의 가능성

**영향:**
- 유지보수 어려움 (스타일 변경 시 여러 곳 수정)
- 번들 크기 증가
- 일관성 부족

**해결책:**
```typescript
// ❌ 현재 (page.tsx)
function Spinner({ className = '' }: { className?: string }) {
  return <svg>...</svg>
}

// ✅ 수정
import { Spinner } from '@/shared/ui/Spinner'
```

---

### 2. **비즈니스 로직이 UI 레이어에 위치**

**문제점:**
- `page.tsx`에 직접 `fetch` 로직이 있음
- 데이터 페칭, 에러 처리, 상태 관리가 컴포넌트 내부에 혼재
- 클린 아키텍처의 레이어 분리 원칙 위반

**현재 구조:**
```
UI Layer (page.tsx)
  ├── fetch('/api/projects/...')  ❌ 비즈니스 로직
  ├── useState, useEffect          ❌ 상태 관리
  └── 에러 처리 없음                ❌ 사용자 경험 저하
```

**권장 구조:**
```
UI Layer (page.tsx)
  └── Custom Hook (useProjectData)
      └── API Client (lib/api/projects.ts)
          └── API Route (app/api/projects/...)
```

**해결책:**
1. Custom Hook 생성: `src/features/projects/model/useProjectData.ts`
2. API Client 생성: `src/lib/api/projects.ts`
3. 에러 처리 및 로딩 상태 통합

---

### 3. **AgentSlideOver와 AgentPage 로직 중복**

**문제점:**
- `AgentSlideOver.tsx`와 `workspaces/[wid]/agent/page.tsx`에 거의 동일한 로직
- 리포트 생성, 채팅, 상태 관리 로직이 중복
- 유지보수 시 두 곳 모두 수정 필요

**중복 코드:**
- `loadCachedReport` 함수
- `generateReport` 함수
- `sendMessage` 함수
- 상태 관리 (reportMarkdown, messages, loading 등)

**해결책:**
1. 공통 로직을 Custom Hook으로 추출: `useAgentChat.ts`
2. UI만 분리하여 재사용

---

### 4. **에러 처리 부재**

**문제점:**
- `fetch` 실패 시 `catch`만 있고 사용자에게 피드백 없음
- 네트워크 오류, API 오류 시 빈 화면 또는 무한 로딩 가능
- 사용자 경험 저하

**현재 코드:**
```typescript
.catch(() => setLoading(false))  // ❌ 에러 무시
```

**해결책:**
```typescript
const [error, setError] = useState<string | null>(null)

try {
  // ...
} catch (err) {
  setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
  setLoading(false)
}

// UI에서 에러 표시
{error && <ErrorMessage message={error} />}
```

---

## 🟡 Major Issues (우선순위 높음)

### 5. **과도한 Props Drilling**

**문제점:**
- `AgentSlideOver`가 `ga4Connected`, `csvConnected`, `csvDatasetCount`를 props로 받음
- 부모 컴포넌트에서 데이터 소스 상태를 계산하여 전달
- 컴포넌트 간 결합도 증가

**현재:**
```typescript
<AgentSlideOver
  ga4Connected={ga4.connected}
  csvConnected={csv?.ready || false}
  csvDatasetCount={csv?.datasets.length || 0}
  // ...
/>
```

**해결책:**
- `AgentSlideOver` 내부에서 `projectId`로 데이터 소스 상태 조회
- 또는 Context API 사용

---

### 6. **타입 정의가 컴포넌트 내부에 위치**

**문제점:**
- `ProjectData` 인터페이스가 `page.tsx` 내부에 정의됨
- 다른 컴포넌트에서 재사용 불가능
- 타입 일관성 보장 어려움

**해결책:**
- `src/entities/project/types.ts`로 이동
- 또는 `src/types/database.ts`에 확장 타입으로 추가

---

### 7. **불필요한 리렌더링 가능성**

**문제점:**
- `AgentSlideOver`가 열릴 때마다 `workspace` 데이터를 다시 페칭
- `useEffect` 의존성 배열이 불완전하여 불필요한 실행 가능
- `useCallback` 사용이 일관되지 않음

**현재:**
```typescript
useEffect(() => {
  if (isOpen && workspaceId) {
    fetch(`/api/workspaces/${workspaceId}`)  // 매번 실행
      .then(res => res.json())
      .then(data => setWorkspace(data.workspace))
  }
}, [isOpen, workspaceId])
```

**해결책:**
- React Query 또는 SWR 사용 고려
- 또는 메모이제이션 적용

---

### 8. **로컬 스토리지 직접 접근**

**문제점:**
- `localStorage`를 컴포넌트에서 직접 접근
- SSR 환경에서 에러 가능성
- 테스트 어려움

**해결책:**
- Custom Hook으로 추상화: `useLocalStorage.ts`
- 또는 Context API 사용

---

## 🟢 Minor Issues (개선 권장)

### 9. **하드코딩된 문자열**

**문제점:**
- 한글 문자열이 컴포넌트에 하드코딩
- 다국어 지원 어려움
- 일관성 부족

**해결책:**
- i18n 시스템 활용 (이미 `src/shared/lib/i18n` 존재)

---

### 10. **매직 넘버/문자열**

**문제점:**
- `'7d'`, `'30d'` 같은 매직 문자열
- `100` (드래그 임계값) 같은 매직 넘버

**해결책:**
- 상수로 추출: `src/shared/lib/constants.ts`

---

### 11. **애니메이션 성능**

**문제점:**
- `BottomSheet`의 드래그 로직이 `mousemove` 이벤트에 의존
- 터치 이벤트 미지원 (모바일)
- 성능 최적화 부족

**해결책:**
- `touchstart`, `touchmove`, `touchend` 이벤트 추가
- `requestAnimationFrame` 사용 고려

---

## 📊 아키텍처 개선 제안

### 현재 구조 (문제점)

```
src/app/(app)/projects/[pid]/
├── page.tsx                    ❌ 비즈니스 로직 포함
│   ├── fetch()                 ❌ 직접 API 호출
│   ├── useState()              ❌ 상태 관리
│   └── ProjectData interface   ❌ 타입 정의
└── components/
    ├── AgentSlideOver.tsx      ❌ 중복 로직
    └── WorkspaceCard.tsx       ✅ OK
```

### 권장 구조 (클린 아키텍처)

```
src/
├── features/
│   └── projects/
│       ├── model/
│       │   ├── useProjectData.ts        ✅ Custom Hook
│       │   ├── useWorkspaces.ts         ✅ Custom Hook
│       │   └── useAgentChat.ts          ✅ Custom Hook (공통)
│       └── ui/
│           └── ProjectOverview.tsx      ✅ UI만
├── lib/
│   └── api/
│       ├── projects.ts                  ✅ API Client
│       └── workspaces.ts                ✅ API Client
└── entities/
    └── project/
        └── types.ts                     ✅ 타입 정의
```

---

## 🚀 성능 최적화 제안

### 1. **데이터 페칭 최적화**

**현재:**
- 페이지 로드 시 프로젝트 + 워크스페이스 동시 페칭
- 에러 시 전체 실패

**개선:**
- React Query 또는 SWR 도입
- 자동 캐싱, 재시도, 백그라운드 업데이트
- 부분 로딩 (프로젝트 먼저, 워크스페이스는 지연)

### 2. **컴포넌트 최적화**

**현재:**
- `AgentSlideOver`가 열릴 때마다 데이터 페칭
- 불필요한 리렌더링 가능

**개선:**
- `React.memo` 적용
- `useMemo`, `useCallback` 적절히 사용
- 데이터 캐싱

### 3. **번들 크기 최적화**

**현재:**
- 중복 코드로 인한 번들 크기 증가
- 불필요한 의존성

**개선:**
- 코드 스플리팅
- 동적 import (`next/dynamic`)
- Tree shaking 최적화

---

## 💡 사용자 경험 개선 제안

### 1. **에러 상태 표시**

**현재:**
- 에러 발생 시 빈 화면 또는 무한 로딩

**개선:**
- 명확한 에러 메시지
- 재시도 버튼
- 부분 실패 시 부분 UI 표시

### 2. **로딩 상태 개선**

**현재:**
- 단순 스피너만 표시

**개선:**
- 스켈레톤 UI
- 진행률 표시 (가능한 경우)
- 낙관적 업데이트

### 3. **오프라인 지원**

**현재:**
- 네트워크 오류 시 사용 불가

**개선:**
- Service Worker 도입
- 오프라인 캐시
- 오프라인 상태 표시

---

## 📋 우선순위별 수정 계획

### Phase 1: Critical (즉시 수정)
1. ✅ Spinner 중복 제거
2. ✅ 에러 처리 추가
3. ✅ Custom Hook으로 비즈니스 로직 분리

### Phase 2: Major (다음 스프린트)
4. ✅ AgentSlideOver/AgentPage 로직 통합
5. ✅ Props Drilling 개선
6. ✅ 타입 정의 이동

### Phase 3: Minor (점진적 개선)
7. ✅ i18n 적용
8. ✅ 상수 추출
9. ✅ 성능 최적화

---

## 🎯 핵심 메시지

> **"무거운 제품이 아니라 고객이 데이터를 연동했을 때 만족할 만한 결과와 에이전트 경험이 있어야 한다"**

### 현재 문제점:
- ❌ 에러 발생 시 사용자에게 피드백 없음
- ❌ 데이터 로딩이 느리면 사용자 경험 저하
- ❌ 코드 중복으로 인한 버그 가능성 증가

### 개선 방향:
- ✅ 안정적인 에러 처리 및 사용자 피드백
- ✅ 빠른 데이터 로딩 및 캐싱
- ✅ 재사용 가능한 코드로 유지보수성 향상
- ✅ 사용자가 데이터를 연동하면 **즉시 만족스러운 결과**를 볼 수 있도록

---

## 📝 체크리스트

### 즉시 수정
- [ ] Spinner 중복 제거
- [ ] 에러 상태 추가 및 표시
- [ ] fetch 에러 처리 개선

### 다음 단계
- [ ] Custom Hook 생성 (useProjectData, useWorkspaces)
- [ ] API Client 생성
- [ ] AgentSlideOver/AgentPage 로직 통합

### 장기 개선
- [ ] React Query/SWR 도입
- [ ] i18n 적용
- [ ] 성능 모니터링 도구 추가
