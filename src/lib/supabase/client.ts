import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase 환경 변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 확인해주세요.'
    )
  }

  // createBrowserClient는 기본적으로 localStorage를 사용하지만,
  // 이메일 OTP는 서버 사이드 API Route를 통해 처리하므로
  // PKCE code verifier가 쿠키에 저장됨
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
