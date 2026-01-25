"""
Supabase 클라이언트 설정
"""

from supabase import create_client, Client
import os

def get_supabase_client() -> Client:
    """Supabase 서비스 클라이언트 생성"""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
    
    return create_client(url, key)
