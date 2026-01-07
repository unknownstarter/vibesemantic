"use client";

import { Section } from "@/shared/ui/Section";
import { Container } from "@/shared/ui/Container";
import { Accordion } from "@/shared/ui/Accordion";
import { useI18n } from "@/shared/lib/i18n/context";
import { useSectionView } from "@/shared/lib/useSectionView";

export function FAQ() {
  const { t } = useI18n();
  const sectionRef = useSectionView("faq");

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: t.faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Section id="faq" ref={sectionRef} className="bg-gray-950/30">
        <Container size="md">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">{t.faq.title}</h2>
            <p className="text-lg text-gray-400">
              {t.faq.description}
            </p>
          </div>

          <Accordion items={[...t.faq.items]} />
        </Container>
      </Section>
    </>
  );
}
