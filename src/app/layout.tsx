import type { Metadata } from "next";
import "@/shared/styles/globals.css";
import { I18nProvider } from "@/shared/lib/i18n/context";

export const metadata: Metadata = {
  metadataBase: new URL("https://vibesemantic.xyz"),
  title: {
    default: "Vibe Semantic - SQL 없이 데이터 분석하는 AI BI 도구 | 제품 지표 분석",
    template: "%s | Vibe Semantic",
  },
  description:
    "SQL 없이도 제품 지표를 분석하고 다음 액션을 제안받으세요. PO, 창업가, 마케터를 위한 AI 기반 데이터 분석 도구. DAU, 리텐션, 전환율 등 핵심 지표를 자연어로 질문하고 인사이트를 얻으세요.",
  keywords: [
    "데이터 분석",
    "BI 도구",
    "제품 지표 분석",
    "SQL 없이 데이터 분석",
    "데이터 분석가",
    "제품 분석 도구",
    "스타트업 데이터 분석",
    "리텐션 분석",
    "전환율 분석",
    "DAU 분석",
    "자연어 데이터 분석",
    "AI BI",
    "제품 지표 대시보드",
    "데이터 인사이트",
    "PO 데이터 분석",
    "창업가 데이터 분석",
  ],
  authors: [{ name: "Dropdown" }],
  creator: "Dropdown",
  publisher: "Dropdown",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://vibesemantic.xyz",
    siteName: "Vibe Semantic",
    title: "Vibe Semantic - SQL 없이 데이터 분석하는 AI BI 도구",
    description:
      "SQL 없이도 제품 지표를 분석하고 다음 액션을 제안받으세요. PO, 창업가, 마케터를 위한 AI 기반 데이터 분석 도구.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vibe Semantic - AI 기반 데이터 분석 도구",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vibe Semantic - SQL 없이 데이터 분석하는 AI BI 도구",
    description:
      "SQL 없이도 제품 지표를 분석하고 다음 액션을 제안받으세요. PO, 창업가, 마케터를 위한 AI 기반 데이터 분석 도구.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://vibesemantic.xyz",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  verification: {
    // Google Search Console, 네이버 서치어드바이저 등 추가 가능
    // google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* SoftwareApplication 스키마 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Vibe Semantic",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "KRW",
              },
              description:
                "SQL 없이도 제품 지표를 분석하고 다음 액션을 제안받는 AI 기반 데이터 분석 도구. PO, 창업가, 마케터를 위한 BI 솔루션으로, 자연어 질문을 통해 DAU, 리텐션, 전환율 등 핵심 지표를 분석할 수 있습니다.",
              featureList: [
                "자연어 질문으로 데이터 분석",
                "SQL 없이 지표 분석",
                "자동 원인 분석",
                "다음 액션 제안",
                "읽기 전용 데이터베이스 연결",
                "Supabase 및 BigQuery 지원",
              ],
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "5",
                ratingCount: "1",
              },
              applicationSubCategory: "Business Intelligence",
              screenshot: "https://vibesemantic.xyz/og-image.png",
            }),
          }}
        />
        {/* Organization 스키마 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Dropdown",
              url: "https://vibesemantic.xyz",
              logo: "https://vibesemantic.xyz/icon.svg",
              contactPoint: {
                "@type": "ContactPoint",
                email: "hello@dropdown.xyz",
                contactType: "customer service",
                availableLanguage: ["Korean", "English"],
              },
              sameAs: [],
            }),
          }}
        />
        {/* BreadcrumbList 스키마 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "홈",
                  item: "https://vibesemantic.xyz",
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "제품 소개",
                  item: "https://vibesemantic.xyz#product",
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: "사용 방법",
                  item: "https://vibesemantic.xyz#how",
                },
                {
                  "@type": "ListItem",
                  position: 4,
                  name: "FAQ",
                  item: "https://vibesemantic.xyz#faq",
                },
              ],
            }),
          }}
        />
        {/* DefinedTerm 스키마 - 주요 용어 정의 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "DefinedTermSet",
              name: "Vibe Semantic 용어집",
              description: "Vibe Semantic에서 사용하는 주요 데이터 분석 용어 정의",
              hasDefinedTerm: [
                {
                  "@type": "DefinedTerm",
                  name: "DAU",
                  description:
                    "Daily Active Users의 약자로, 일일 활성 사용자 수를 의미합니다. 제품의 일일 사용자 규모를 측정하는 핵심 지표입니다.",
                },
                {
                  "@type": "DefinedTerm",
                  name: "리텐션",
                  description:
                    "사용자가 제품을 얼마나 지속적으로 사용하는지를 측정하는 지표입니다. 7일 리텐션, 30일 리텐션 등으로 측정됩니다.",
                },
                {
                  "@type": "DefinedTerm",
                  name: "전환율",
                  description:
                    "특정 액션을 수행한 사용자의 비율을 의미합니다. 예: 가입 전환율, 구매 전환율, 클릭 전환율 등.",
                },
                {
                  "@type": "DefinedTerm",
                  name: "BI",
                  description:
                    "Business Intelligence의 약자로, 비즈니스 데이터를 분석하여 의사결정에 도움을 주는 도구와 프로세스를 의미합니다.",
                },
              ],
            }),
          }}
        />
      </head>
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
