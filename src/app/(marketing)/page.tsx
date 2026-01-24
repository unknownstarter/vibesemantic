import { Header } from "@/widgets/header/Header";
import { Footer } from "@/widgets/footer/Footer";
import { Hero } from "@/widgets/hero/Hero";
import { Problem } from "@/widgets/problem/Problem";
import { Bento } from "@/widgets/bento/Bento";
import { Pricing } from "@/widgets/pricing/Pricing";
import { SuccessCase } from "@/widgets/success-case/SuccessCase";
import { Product } from "@/widgets/product/Product";
import { Security } from "@/widgets/security/Security";
import { FAQ } from "@/widgets/faq/FAQ";
import { LeadCaptureForm } from "@/features/lead-capture/ui/LeadCaptureForm";
import { Section } from "@/shared/ui/Section";
import { PageViewTracker } from "@/shared/lib/PageViewTracker";

export default function LandingPage() {
  return (
    <>
      {/* 구조화된 데이터 - Product */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "Vibe Semantic",
            description:
              "SQL 없이도 제품 지표를 분석하고 다음 액션을 제안받는 AI 기반 데이터 분석 도구. PO, 창업가, 마케터를 위한 BI 솔루션으로, 자연어 질문을 통해 DAU, 리텐션, 전환율 등 핵심 지표를 분석할 수 있습니다.",
            category: "Business Intelligence Software",
            brand: {
              "@type": "Brand",
              name: "Dropdown",
            },
            offers: [
              {
                "@type": "Offer",
                name: "기본 플랜",
                price: "0",
                priceCurrency: "KRW",
                availability: "https://schema.org/InStock",
              },
              {
                "@type": "Offer",
                name: "인기 플랜",
                price: "0",
                priceCurrency: "KRW",
                availability: "https://schema.org/InStock",
              },
              {
                "@type": "Offer",
                name: "평생 프리미엄",
                price: "29000",
                priceCurrency: "KRW",
                availability: "https://schema.org/InStock",
              },
            ],
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: "5",
              bestRating: "5",
              worstRating: "1",
            },
            featureList: [
              "자연어 질문으로 데이터 분석",
              "SQL 없이 지표 분석",
              "자동 원인 분석",
              "다음 액션 제안",
              "읽기 전용 데이터베이스 연결",
              "Supabase 및 BigQuery 지원",
            ],
          }),
        }}
      />
      <PageViewTracker />
      <div className="relative min-h-screen">
        <Header />
        <main>
          <Hero />
          <Problem />
          <Product />
          <SuccessCase />
          <Bento />
          <Pricing />
          <Security />
          <FAQ />
          <Section id="apply" className="bg-gray-950/30">
            <LeadCaptureForm />
          </Section>
        </main>
        <Footer />
      </div>
    </>
  );
}
