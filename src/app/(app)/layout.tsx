import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

// 로고 아이콘
function LogoIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="32" height="32" rx="6" className="fill-surface" />
      <g className="fill-primary">
        <rect x="4" y="8" width="20" height="2" rx="1" />
        <rect x="4" y="13" width="12" height="2" rx="1" />
        <rect x="4" y="18" width="20" height="2" rx="1" />
        <rect x="4" y="23" width="12" height="2" rx="1" />
      </g>
    </svg>
  )
}

// 로그아웃 아이콘
function LogoutIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="border-b border-border/10 bg-surface/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 gap-2">
            {/* 로고 영역 */}
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
              <LogoIcon className="w-6 h-6 sm:w-7 sm:h-7" />
              <span className="hidden sm:inline text-lg font-semibold text-foreground">
                Vibe Semantic
              </span>
            </Link>
            
            {/* 사용자 정보 영역 */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              {/* 이메일: 모바일에서 truncate, 태블릿 이상에서 전체 표시 */}
              <span 
                className="text-xs sm:text-sm text-muted truncate max-w-[120px] sm:max-w-[200px] md:max-w-none"
                title={user.email || ''}
              >
                {user.email}
              </span>
              
              {/* 로그아웃 버튼 */}
              <form action="/api/auth/signout" method="post" className="shrink-0">
                {/* 모바일: 아이콘만 */}
                <button
                  type="submit"
                  className="sm:hidden p-2 text-subtle hover:text-muted transition-colors rounded-lg hover:bg-white/5"
                  title="로그아웃"
                >
                  <LogoutIcon />
                </button>
                {/* 태블릿 이상: 텍스트 */}
                <button
                  type="submit"
                  className="hidden sm:block text-sm text-subtle hover:text-muted transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                >
                  로그아웃
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
    </div>
  )
}
