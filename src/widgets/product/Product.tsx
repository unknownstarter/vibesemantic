"use client";

import { Section } from "@/shared/ui/Section";
import { Container } from "@/shared/ui/Container";
import { useI18n } from "@/shared/lib/i18n/context";
import { useSectionView } from "@/shared/lib/useSectionView";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { clickButton } from "@/shared/lib/analytics";

export function Product() {
  const { t, language } = useI18n();
  const sectionRef = useSectionView("product");

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name:
      language === "ko"
        ? "Vibe Semantic으로 데이터 분석 시작하기"
        : "Getting started with data analysis using Vibe Semantic",
    description: t.product.description,
    step: t.product.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.description,
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
      <Section id="product" ref={sectionRef} className="bg-gray-950/30">
        <Container size="lg">
          <div className="text-center mb-20">
            <Badge
              variant="info"
              className="bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30 mb-6"
            >
              {t.product.badge}
            </Badge>
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              {t.product.title}
            </h2>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto leading-relaxed">
              {t.product.description}
            </p>
            <div className="mt-8">
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  window.location.href = "/demo";
                  clickButton("demo_try", "product");
                }}
                className="text-black hover:text-black text-sm sm:text-base"
              >
                {t.product.demoButton}
              </Button>
            </div>
          </div>

          <div className="relative space-y-24">
            <div className="absolute left-9 top-8 bottom-8 w-px bg-[#22c55e]/30 hidden md:block"></div>

            {t.product.steps.map((step, idx) => (
              <div key={idx} className="relative">
                <div className="grid gap-6 md:grid-cols-[72px_1fr] md:gap-12 items-start">
                  <div className="flex items-center gap-4 md:justify-center md:items-start md:pt-1">
                    <div className="relative flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-900 border-2 border-[#22c55e]/50">
                      <div className="absolute inset-0 rounded-full bg-[#22c55e]/20 animate-pulse"></div>
                      <span className="text-[#22c55e] text-base md:text-xl font-bold relative z-10">
                        {step.number}
                      </span>
                    </div>
                    <div className="md:hidden text-sm text-gray-500 font-medium">
                      STEP {step.number}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start min-w-0">
                    <div className="space-y-4">
                      <div className="hidden md:block text-sm text-gray-500 font-medium">
                        STEP {step.number}
                      </div>
                      <h3 className="text-3xl md:text-4xl font-bold text-white">
                        {step.title}
                      </h3>
                      <p className="text-gray-400 leading-relaxed text-lg">
                        {step.description}
                      </p>
                      {"dataSources" in step && step.dataSources && (
                        <div className="flex flex-wrap gap-3 mt-6">
                          {step.dataSources.map((source, i) => (
                            <button
                              key={i}
                              className="px-4 py-2 rounded-full bg-gray-800/50 border border-gray-700 text-gray-300 hover:border-[#22c55e]/50 hover:text-[#22c55e] transition-colors text-sm font-medium"
                            >
                              {source}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      {idx === 0 && (
                        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 space-y-4 backdrop-blur-sm">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-white font-semibold text-lg">
                              {"title" in step.uiExample && step.uiExample.title}
                            </h4>
                            <button className="px-3 py-1.5 text-xs font-medium text-[#22c55e] hover:text-[#16a34a] transition-colors">
                              {"addButton" in step.uiExample && step.uiExample.addButton}
                            </button>
                          </div>
                          <div className="space-y-3">
                            {"sources" in step.uiExample &&
                              step.uiExample.sources.map((source, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#22c55e]/20 border border-[#22c55e]/30 flex items-center justify-center text-[#22c55e] font-bold text-sm">
                                      {source.type === "Supabase"
                                        ? "SB"
                                        : source.type === "GA4"
                                        ? "GA"
                                        : "GS"}
                                    </div>
                                    <div>
                                      <div className="text-white font-medium text-sm">
                                        {source.name}
                                      </div>
                                      <div className="text-gray-400 text-xs">
                                        {source.type} • {source.lastSync}
                                      </div>
                                    </div>
                                  </div>
                                  {source.status === "active" && (
                                    <div className="w-10 h-6 rounded-full bg-[#22c55e]/30 border border-[#22c55e]/50 relative">
                                      <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-[#22c55e]"></div>
                                    </div>
                                  )}
                                  {source.status === "syncing" && (
                                    <div className="w-5 h-5 border-2 border-[#22c55e]/50 border-t-[#22c55e] rounded-full animate-spin"></div>
                                  )}
                                  {source.status === "paused" && (
                                    <div className="w-10 h-6 rounded-full bg-gray-700 border border-gray-600 relative">
                                      <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-gray-500"></div>
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {idx === 1 && (
                        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 space-y-4 backdrop-blur-sm">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#22c55e]/20 border border-[#22c55e]/30 flex items-center justify-center flex-shrink-0">
                              <svg
                                className="w-4 h-4 text-[#22c55e]"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                              </svg>
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed">
                              {"prompts" in step.uiExample && step.uiExample.prompts[0]}
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                                <div className="w-4 h-4 rounded-full bg-gray-500"></div>
                              </div>
                            </div>
                            <div className="bg-[#22c55e]/20 border border-[#22c55e]/30 rounded-lg px-4 py-3 max-w-[85%]">
                              <p className="text-[#22c55e]/90 text-sm leading-relaxed">
                                {"userMessage" in step.uiExample &&
                                  step.uiExample.userMessage}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#22c55e]/20 border border-[#22c55e]/30 flex items-center justify-center flex-shrink-0">
                              <svg
                                className="w-4 h-4 text-[#22c55e]"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                              </svg>
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed">
                              {"prompts" in step.uiExample && step.uiExample.prompts[1]}
                            </p>
                          </div>
                          <div className="mt-4 pt-4 border-t border-gray-800">
                            <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                              <span className="text-gray-400 text-sm flex-1">
                                {"inputPlaceholder" in step.uiExample &&
                                  step.uiExample.inputPlaceholder}
                              </span>
                              <button className="text-[#22c55e] hover:text-[#16a34a] transition-colors">
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {idx === 2 && (
                        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 space-y-4 backdrop-blur-sm">
                          <div className="flex items-center justify-between mb-6">
                            <h4 className="text-white font-semibold text-lg tracking-wide">
                              {"title" in step.uiExample && step.uiExample.title}
                            </h4>
                            <button className="px-3 py-1.5 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm font-medium transition-colors">
                              {"period" in step.uiExample && step.uiExample.period}
                            </button>
                          </div>
                          <div className="flex items-baseline gap-4 mb-6">
                            <div className="text-6xl font-bold text-white">
                              {"metric" in step.uiExample && step.uiExample.metric}
                            </div>
                            <div className="text-xl font-semibold text-red-400">
                              ↑ {"change" in step.uiExample && step.uiExample.change}
                            </div>
                          </div>
                          <div className="h-32 bg-gray-800/50 rounded-lg mb-6 flex items-end justify-between gap-2 p-4 border border-gray-700/50">
                            <div className="flex-1 h-20 bg-gray-700/50 rounded-t"></div>
                            <div className="flex-1 h-16 bg-gray-700/50 rounded-t"></div>
                            <div className="flex-1 h-24 bg-[#22c55e]/40 rounded-t relative">
                              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-400"></div>
                            </div>
                          </div>
                          <div className="bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-lg p-4 mb-4">
                            <div className="flex items-start gap-3">
                              <div className="w-5 h-5 mt-0.5 flex items-center justify-center">
                                <svg
                                  className="w-5 h-5 text-[#22c55e]"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.5 1-1v-1H9v1zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .5.4 1 1 1h6c.6 0 1-.5 1-1v-2.3c1.8-1.3 3-3.4 3-5.7 0-3.9-3.1-7-7-7z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="text-[#22c55e] font-semibold text-sm mb-1">
                                  Recommendation
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                  {"recommendation" in step.uiExample &&
                                    step.uiExample.recommendation}
                                </p>
                              </div>
                            </div>
                            <button className="w-full mt-4 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm rounded-lg transition-colors">
                              {"buttonText" in step.uiExample && step.uiExample.buttonText}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
