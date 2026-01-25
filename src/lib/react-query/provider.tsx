'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 캐시 시간: 5분
            staleTime: 5 * 60 * 1000,
            // 캐시 유지 시간: 10분
            gcTime: 10 * 60 * 1000,
            // 윈도우 포커스 시 자동 재조회 비활성화 (필요시 활성화)
            refetchOnWindowFocus: false,
            // 네트워크 재연결 시 자동 재조회
            refetchOnReconnect: true,
            // 재시도: 3회
            retry: 3,
            // 재시도 지연: 지수 백오프
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            // Mutation 재시도: 1회
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
