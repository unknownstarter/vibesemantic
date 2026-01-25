import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/shared/styles/globals.css'
import { ReactQueryProvider } from '@/lib/react-query/provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Vibe Semantic - 나만의 데이터 분석 AI 에이전트',
  description: '나만의 데이터 분석 AI 에이전트. 프로젝트별 데이터 마트와 목적별 에이전트 분석을 제공합니다.',
  openGraph: {
    title: 'Vibe Semantic - 나만의 데이터 분석 AI 에이전트',
    description: '나만의 데이터 분석 AI 에이전트. 프로젝트별 데이터 마트와 목적별 에이전트 분석을 제공합니다.',
    type: 'website',
    locale: 'ko_KR',
    siteName: 'Vibe Semantic',
    url: 'https://vibesemantic.xyz',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vibe Semantic - 나만의 데이터 분석 AI 에이전트',
    description: '나만의 데이터 분석 AI 에이전트. 프로젝트별 데이터 마트와 목적별 에이전트 분석을 제공합니다.',
  },
  alternates: {
    canonical: 'https://vibesemantic.xyz',
  },
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
