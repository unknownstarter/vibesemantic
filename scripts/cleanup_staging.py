#!/usr/bin/env python3
"""
Staging 보존 기간 정책 실행: created_at 기준 N일 초과 행 삭제.
보존 기간: 30일 (기본). 실행 주기: 일 1회 권장 (cron 등).

사용법:
  python scripts/cleanup_staging.py [--days 30] [--dry-run]
환경변수: SUPABASE_URL (또는 NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_KEY (또는 SUPABASE_SERVICE_ROLE_KEY)
"""

import os
import sys
import argparse
from datetime import datetime, timedelta, timezone


def get_supabase_client():
    try:
        from supabase import create_client
    except ImportError:
        print("supabase 패키지 필요: pip install supabase", file=sys.stderr)
        sys.exit(1)
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("SUPABASE_URL(또는 NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_KEY(또는 SUPABASE_SERVICE_ROLE_KEY) 필요", file=sys.stderr)
        sys.exit(1)
    return create_client(url, key)


def cleanup_staging(supabase, older_than_days: int, dry_run: bool) -> tuple[int, int]:
    """
    staging_csv_raw, staging_ga4_raw에서 created_at이 (now - older_than_days) 이전인 행 삭제.
    반환: (삭제된 csv 행 수, 삭제된 ga4 행 수). dry_run이면 삭제하지 않고 대상 행 수만 조회(API 기본 limit 내).
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=older_than_days)).isoformat()
    deleted_csv = 0
    deleted_ga4 = 0

    if dry_run:
        r = supabase.table("staging_csv_raw").select("id").lt("created_at", cutoff).limit(10000).execute()
        deleted_csv = len(r.data) if r.data else 0
        print(f"[dry-run] staging_csv_raw: {deleted_csv} rows would be deleted (created_at < {cutoff})")
        r = supabase.table("staging_ga4_raw").select("id").lt("created_at", cutoff).limit(10000).execute()
        deleted_ga4 = len(r.data) if r.data else 0
        print(f"[dry-run] staging_ga4_raw: {deleted_ga4} rows would be deleted (created_at < {cutoff})")
        return deleted_csv, deleted_ga4

    r = supabase.table("staging_csv_raw").delete().lt("created_at", cutoff).execute()
    deleted_csv = len(r.data) if r.data else 0
    print(f"staging_csv_raw: deleted {deleted_csv} rows (created_at < {cutoff})")

    r = supabase.table("staging_ga4_raw").delete().lt("created_at", cutoff).execute()
    deleted_ga4 = len(r.data) if r.data else 0
    print(f"staging_ga4_raw: deleted {deleted_ga4} rows (created_at < {cutoff})")

    return deleted_csv, deleted_ga4


def main():
    parser = argparse.ArgumentParser(description="Staging 테이블 보존 기간 초과 행 삭제")
    parser.add_argument("--days", type=int, default=30, help="보존 기간(일). 이보다 오래된 행 삭제 (기본 30)")
    parser.add_argument("--dry-run", action="store_true", help="삭제하지 않고 대상 행 수만 출력")
    args = parser.parse_args()

    if args.days < 1:
        print("--days는 1 이상이어야 합니다.", file=sys.stderr)
        sys.exit(1)

    supabase = get_supabase_client()
    deleted_csv, deleted_ga4 = cleanup_staging(supabase, args.days, args.dry_run)
    total = deleted_csv + deleted_ga4
    if args.dry_run:
        print(f"[dry-run] Total: {total} rows would be deleted")
    else:
        print(f"Total deleted: {total} rows")
    return 0


if __name__ == "__main__":
    sys.exit(main())
