# 코드 리뷰: Slug 기반 URL 구현

## 📋 개요

Slug 기반 URL 변경 작업에 대한 클린 아키텍처 및 의존성 관점의 코드 리뷰입니다.

---

## ✅ 잘 구현된 부분

### 1. **의존성 역전 원칙 (DIP) 준수**
- `auth-helpers.ts`에 핵심 로직이 중앙화되어 있음
- API 라우트들이 `lib/supabase/auth-helpers`에 의존하는 올바른 방향

### 2. **하위 호환성 유지**
- UUID와 slug 모두 지원하여 기존 링크가 계속 작동
- 점진적 마이그레이션 전략이 적절함

### 3. **타입 안정성**
- TypeScript를 활용한 타입 체크
- `AuthContext` 인터페이스로 일관된 반환 타입

---

## ⚠️ 개선이 필요한 부분

### 🔴 **Critical: 코드 중복 (DRY 위반)**

#### 문제 1: `isUUID` 함수 중복 정의

**현재 상태:**
- `src/lib/supabase/auth-helpers.ts` (1개)
- `src/app/api/workspaces/[workspaceId]/route.ts` (1개)
- `src/app/api/workspaces/[workspaceId]/agent/route.ts` (1개)
- `src/app/api/workspaces/[workspaceId]/chat/route.ts` (1개)
- `src/app/api/workspaces/[workspaceId]/report/route.ts` (1개)

**총 5개 파일에 동일한 함수가 중복 정의됨**

**개선 방안:**
```typescript
// src/lib/supabase/auth-helpers.ts
export function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}
```

모든 라우트에서 `import { isUUID } from '@/lib/supabase/auth-helpers'` 사용

---

#### 문제 2: `resolveWorkspaceBySlugOrId` 중복 구현

**현재 상태:**
- `src/lib/supabase/auth-helpers.ts`에 `resolveWorkspace()` 함수 존재
- `src/app/api/workspaces/[workspaceId]/route.ts`에 `resolveWorkspaceBySlugOrId()` 중복 구현

**개선 방안:**
`route.ts`의 중복 함수 제거하고 `auth-helpers.ts`의 `resolveWorkspace()` 사용

---

### 🟡 **Medium: 의존성 방향 및 일관성 문제**

#### 문제 3: 일관되지 않은 패턴 사용

**현재 상태:**

**패턴 A** (권장):
```typescript
// route.ts
const { context, error } = await getAuthContext(projectSlugOrId, workspaceSlugOrId)
if (error || !context) { ... }
// context.projectId, context.workspaceId 사용
```

**패턴 B** (비권장 - 중복 쿼리):
```typescript
// chat/route.ts, report/route.ts
const lookupField = isUUID(workspaceSlugOrId) ? 'id' : 'slug'
const { data: workspace } = await supabase
  .from('workspaces')
  .select('id, project_id')
  .eq(lookupField, workspaceSlugOrId)
  .single()

const { context, error } = await getAuthContext(workspace.project_id, workspace.id)
```

**문제점:**
1. Workspace를 먼저 조회한 후 `getAuthContext`를 호출하여 중복 쿼리 발생
2. `getAuthContext` 내부에서 이미 workspace를 조회하는데 외부에서도 조회
3. 패턴이 통일되지 않아 유지보수 어려움

**개선 방안:**
```typescript
// chat/route.ts, report/route.ts 개선
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { workspaceId: workspaceSlugOrId } = await params
  
  // getAuthContext는 projectId가 필요하므로, 먼저 workspace만 조회
  const { workspace, error: resolveError } = await resolveWorkspace(workspaceSlugOrId, '')
  
  // 하지만 resolveWorkspace는 projectId가 필요함...
  // 더 나은 방법: getAuthContext를 확장하거나, workspace-first 접근 지원
}
```

**더 나은 해결책:**
`getAuthContext`에 workspace-first 옵션 추가:
```typescript
// auth-helpers.ts
export async function getAuthContext(
  projectSlugOrId?: string,
  workspaceSlugOrId?: string,
  options?: { workspaceFirst?: boolean }
): Promise<{ context: AuthContext | null; error: string | null }> {
  // workspaceFirst가 true면 workspace를 먼저 조회하고 projectId 추출
}
```

---

### 🟡 **Medium: 성능 최적화**

#### 문제 4: 불필요한 중복 쿼리

**현재 상태:**
- `chat/route.ts`, `report/route.ts`에서 workspace를 먼저 조회
- 그 후 `getAuthContext` 내부에서 다시 workspace 조회 가능성

**개선 방안:**
`getAuthContext`에 workspace-first 모드 추가하여 한 번의 쿼리로 해결

---

### 🟢 **Low: 타입 안정성 개선**

#### 문제 5: Non-null assertion 과다 사용

**현재 상태:**
```typescript
.eq('project_id', context.projectId!)
.eq('project_id', context.projectId!)
```

**개선 방안:**
```typescript
if (!context.projectId) {
  return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
}
// 이후 context.projectId는 타입 가드로 안전하게 사용
```

---

## 📊 우선순위별 개선 계획

### Priority 1 (Critical) - 즉시 수정
1. ✅ `isUUID` 함수 중앙화 및 export
2. ✅ 중복된 `resolveWorkspaceBySlugOrId` 제거

### Priority 2 (High) - 다음 스프린트
3. ⚠️ `chat/route.ts`, `report/route.ts` 패턴 통일
4. ⚠️ `getAuthContext` workspace-first 옵션 추가

### Priority 3 (Medium) - 점진적 개선
5. 🔄 Non-null assertion 제거 및 타입 가드 추가
6. 🔄 쿼리 최적화 (중복 쿼리 제거)

---

## 🎯 권장 리팩토링 순서

### Step 1: 유틸리티 함수 중앙화
```typescript
// src/lib/supabase/auth-helpers.ts
export function isUUID(str: string): boolean { ... }
export async function resolveProject(...) { ... }
export async function resolveWorkspace(...) { ... }
```

### Step 2: 중복 코드 제거
- 모든 라우트에서 `isUUID` import 사용
- `route.ts`의 `resolveWorkspaceBySlugOrId` 제거

### Step 3: 패턴 통일
- 모든 workspace 라우트가 동일한 패턴 사용
- `getAuthContext` 활용 최대화

### Step 4: 성능 최적화
- 중복 쿼리 제거
- 필요한 경우에만 workspace 먼저 조회

---

## 📝 결론

### 현재 상태 평가
- **클린 아키텍처 준수도**: 7/10
  - ✅ 의존성 방향은 올바름
  - ⚠️ 코드 중복으로 인한 유지보수성 저하
  - ⚠️ 패턴 불일치로 인한 복잡도 증가

### 개선 후 예상 효과
- **코드 중복**: 5개 → 1개 (80% 감소)
- **쿼리 최적화**: 중복 쿼리 제거로 성능 향상
- **유지보수성**: 패턴 통일로 버그 감소 및 개발 속도 향상

---

## 🔧 즉시 적용 가능한 수정사항

다음 파일들을 수정하여 즉시 개선 가능:

1. `src/lib/supabase/auth-helpers.ts` - `isUUID` export 추가
2. `src/app/api/workspaces/[workspaceId]/*/route.ts` - 중복 함수 제거 및 import 사용
3. `src/app/api/workspaces/[workspaceId]/route.ts` - `resolveWorkspaceBySlugOrId` 제거

이 수정사항들은 **하위 호환성을 유지**하면서 즉시 적용 가능합니다.
