import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/shared/styles/globals.css'
import { ReactQueryProvider } from '@/lib/react-query/provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Vibe Semantic - GA4 AI 분석 플랫폼',
  description: 'GA4 데이터 기반 AI 분석 플랫폼. 프로젝트별 데이터 마트와 목적별 에이전트 분석을 제공합니다.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </body>
    </html>
  )
}
