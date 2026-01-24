'use client'

import { I18nProvider } from '@/shared/lib/i18n/context'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <I18nProvider>
      {children}
    </I18nProvider>
  )
}
