# 유저 권한 승인 가이드

사용자의 `access_level`을 `pending`에서 `approved`로 변경하는 방법입니다.

## 권한 상태 설명

`user_profiles` 테이블의 `access_level` 컬럼은 다음 3가지 값을 가집니다:

- **`pending`**: 승인 대기 중 (기본값, 프로젝트 생성/접근 불가)
- **`approved`**: 승인됨 (프로젝트 생성/접근 가능)
- **`rejected`**: 거부됨 (프로젝트 생성/접근 불가)

## 명시된 위치

### 1. 데이터베이스 마이그레이션 파일
**파일**: `supabase/migrations/20260125000004_add_user_access_control.sql`

```sql
access_level TEXT NOT NULL DEFAULT 'pending' CHECK (access_level IN ('pending', 'approved', 'rejected')),
```

**주석**:
```sql
COMMENT ON COLUMN user_profiles.access_level IS 'pending: waiting for approval, approved: can create/access projects, rejected: access denied';
```

### 2. TypeScript 타입 정의
**파일**: `src/lib/user-access.ts`

```typescript
export type AccessLevel = 'pending' | 'approved' | 'rejected'
```

### 3. 데이터베이스 타입
**파일**: `src/types/database.ts`

```typescript
access_level: "pending" | "approved" | "rejected"
```

## 권한 승인 방법

### 방법 1: Supabase 대시보드에서 직접 수정 (권장)

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. 왼쪽 사이드바에서 **Table Editor** 클릭
4. **`user_profiles`** 테이블 선택
5. 승인할 사용자의 행 찾기 (이메일 또는 user_id로 검색)
6. `access_level` 컬럼을 클릭하여 편집
7. `pending` → `approved`로 변경
8. `approved_at` 컬럼에 현재 시간 입력 (선택사항)
9. `approved_by` 컬럼에 관리자 user_id 입력 (선택사항)
10. **Save** 클릭

### 방법 2: SQL Editor에서 실행

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. 왼쪽 사이드바에서 **SQL Editor** 클릭
4. 다음 SQL 쿼리 실행:

```sql
-- 특정 이메일의 사용자 승인
UPDATE user_profiles
SET 
  access_level = 'approved',
  approved_at = now(),
  approved_by = (SELECT id FROM auth.users WHERE email = 'hello@dropdown.xyz' LIMIT 1)
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = '사용자이메일@example.com' LIMIT 1
);

-- 또는 user_id로 직접 승인
UPDATE user_profiles
SET 
  access_level = 'approved',
  approved_at = now(),
  approved_by = '관리자-user-id-here'
WHERE user_id = '승인할-사용자-user-id';
```

### 방법 3: 여러 사용자 일괄 승인

```sql
-- 모든 pending 사용자를 approved로 변경
UPDATE user_profiles
SET 
  access_level = 'approved',
  approved_at = now(),
  approved_by = (SELECT id FROM auth.users WHERE email = 'hello@dropdown.xyz' LIMIT 1)
WHERE access_level = 'pending';
```

### 방법 4: 특정 이메일 도메인 승인

```sql
-- 특정 도메인의 모든 사용자 승인 (예: @company.com)
UPDATE user_profiles
SET 
  access_level = 'approved',
  approved_at = now(),
  approved_by = (SELECT id FROM auth.users WHERE email = 'hello@dropdown.xyz' LIMIT 1)
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%@company.com'
);
```

## 확인 방법

### 승인 상태 확인

```sql
-- 승인된 사용자 목록
SELECT 
  up.user_id,
  u.email,
  up.access_level,
  up.approved_at,
  up.requested_at
FROM user_profiles up
JOIN auth.users u ON u.id = up.user_id
WHERE up.access_level = 'approved'
ORDER BY up.approved_at DESC;

-- 승인 대기 중인 사용자 목록
SELECT 
  up.user_id,
  u.email,
  up.access_level,
  up.requested_at
FROM user_profiles up
JOIN auth.users u ON u.id = up.user_id
WHERE up.access_level = 'pending'
ORDER BY up.requested_at DESC;
```

## 관리자 이메일 자동 승인 (선택사항)

관리자 이메일(`hello@dropdown.xyz`)이 회원가입 시 자동으로 승인되도록 설정하려면:

```sql
-- 관리자 이메일 자동 승인 트리거 함수
CREATE OR REPLACE FUNCTION auto_approve_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = NEW.user_id 
    AND email = 'hello@dropdown.xyz'
  ) THEN
    UPDATE user_profiles
    SET 
      access_level = 'approved',
      approved_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
DROP TRIGGER IF EXISTS auto_approve_admin_trigger ON user_profiles;
CREATE TRIGGER auto_approve_admin_trigger
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_admin();
```

## 중요 참고사항

1. **RLS (Row Level Security)**: 
   - 일반 사용자는 자신의 프로필만 읽고 수정할 수 있습니다
   - 관리자는 Supabase 대시보드에서 직접 수정하거나 Service Role Key를 사용해야 합니다

2. **승인 후 즉시 적용**:
   - `access_level`이 `approved`로 변경되면 즉시 적용됩니다
   - 사용자가 페이지를 새로고침하면 프로젝트 생성/접근이 가능해집니다

3. **승인 기록**:
   - `approved_at`: 승인 시간 기록
   - `approved_by`: 승인한 관리자의 user_id 기록 (선택사항)

4. **거부 처리**:
   - 사용자를 거부하려면 `access_level`을 `rejected`로 변경
   - 거부된 사용자는 다시 `pending`으로 변경하여 재요청 가능
