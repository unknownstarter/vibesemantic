import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

// 로고 아이콘
function LogoIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="flex items-center gap-2">
                <LogoIcon />
                <span className="text-lg font-semibold text-foreground">Vibe Semantic</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted">{user.email}</span>
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-sm text-subtle hover:text-muted transition-colors"
                >
                  로그아웃
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
