"""
인증 및 권한 체크 헬퍼
"""

from app.services.supabase import get_supabase_client
from typing import Optional, Tuple

def verify_project_access(
    user_id: str,
    project_id: str,
    workspace_id: Optional[str] = None
) -> Tuple[bool, Optional[str]]:
    """
    프로젝트 접근 권한 확인
    
    Returns:
        (allowed: bool, error: Optional[str])
    """
    supabase = get_supabase_client()
    
    # 프로젝트 멤버십 확인
    membership = supabase.table("project_members") \
        .select("role, status") \
        .eq("project_id", project_id) \
        .eq("user_id", user_id) \
        .maybe_single() \
        .execute()
    
    if not membership.data or membership.data.get("status") != "active":
        return False, "Access denied: Not a project member"
    
    # 프로젝트 상태 확인
    project = supabase.table("projects") \
        .select("setup_status") \
        .eq("id", project_id) \
        .maybe_single() \
        .execute()
    
    # CSV 데이터셋 확인
    csv_datasets = supabase.table("csv_datasets") \
        .select("status") \
        .eq("project_id", project_id) \
        .in_("status", ["confirmed", "ingested"]) \
        .execute()
    
    has_ga4_ready = project.data and project.data.get("setup_status") in ["ready", "ga4_ready"]
    has_csv_ready = csv_datasets.data and len(csv_datasets.data) > 0
    
    if not has_ga4_ready and not has_csv_ready:
        return False, "Project not ready: Connect GA4 or upload CSV data first"
    
    # 워크스페이스 확인 (있는 경우)
    if workspace_id:
        workspace = supabase.table("workspaces") \
            .select("status") \
            .eq("id", workspace_id) \
            .maybe_single() \
            .execute()
        
        if not workspace.data:
            return False, "Workspace not found"
    
    return True, None
