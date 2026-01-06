"use client";

import { Section } from "@/shared/ui/Section";
import { Container } from "@/shared/ui/Container";
import { Card } from "@/shared/ui/Card";
import { useI18n } from "@/shared/lib/i18n/context";

export function HowItWorks() {
  const { t } = useI18n();

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: t.language === "ko" 
      ? "Vibe Semantic으로 데이터 분석 시작하기"
      : "Getting started with data analysis using Vibe Semantic",
    description: t.howItWorks.description,
    step: t.howItWorks.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: `${step.description}: ${step.detail}`,
    })),
    totalTime: "PT5M",
    tool: [
      {
        "@type": "HowToTool",
        name: "Vibe Semantic",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <Section id="how" className="bg-gray-950/30">
        <Container size="lg">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              {t.howItWorks.title}
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              {t.howItWorks.description}
            </p>
          </div>

          <div className="space-y-8">
            {t.howItWorks.steps.map((step, idx) => (
              <div key={idx} className="relative">
                {idx < t.howItWorks.steps.length - 1 && (
                  <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-white/10 hidden md:block"></div>
                )}
                <Card variant="bento" className="p-8 md:p-10">
                  <div className="flex gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-2xl font-bold text-white">
                        {step.number}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-semibold mb-2 text-white">
                        {step.title}
                      </h3>
                      <p className="text-gray-400 mb-4 font-medium">
                        {step.description}
                      </p>
                      <p className="text-gray-400 leading-relaxed">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
