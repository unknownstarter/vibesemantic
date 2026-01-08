"use client";

import { Section } from "@/shared/ui/Section";
import { Container } from "@/shared/ui/Container";
import { useI18n } from "@/shared/lib/i18n/context";
import { useSectionView } from "@/shared/lib/useSectionView";
import { Badge } from "@/shared/ui/Badge";

export function HowItWorks() {
  const { t, language } = useI18n();
  const sectionRef = useSectionView("how_it_works");

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name:
      language === "ko"
        ? "Vibe Semantic으로 데이터 분석 시작하기"
        : "Getting started with data analysis using Vibe Semantic",
    description: t.howItWorks.description,
    step: t.howItWorks.steps.map((step, index) => ({
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
      <Section id="how" ref={sectionRef} className="bg-gray-950/30">
        <Container size="lg">
          <div className="text-center mb-20">
            <Badge
              variant="info"
              className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mb-6"
            >
              {t.howItWorks.badge}
            </Badge>
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              <span className="text-white">{t.howItWorks.title.split(" ").slice(0, -3).join(" ")}</span>{" "}
              <span className="text-emerald-400">
                {t.howItWorks.title.split(" ").slice(-3).join(" ")}
              </span>
            </h2>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto leading-relaxed">
              {t.howItWorks.description}
            </p>
          </div>

          <div className="space-y-24 relative">
            {/* Vertical connecting line */}
            <div className="absolute left-8 md:left-12 top-0 bottom-0 w-0.5 bg-emerald-500/30 hidden md:block"></div>

            {t.howItWorks.steps.map((step, idx) => (
              <div key={idx} className="relative">
                {/* Step number circle with icon */}
                <div className="absolute left-0 md:left-8 top-0 z-10 hidden md:flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-gray-900 border-2 border-emerald-500/50 flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-pulse"></div>
                    <span className="text-emerald-400 text-xl font-bold relative z-10">
                        {step.number}
                    </span>
                  </div>
                      </div>

                <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start md:pl-24">
                  {/* Left: Text content */}
                  <div className="space-y-4">
                    <div className="text-sm text-gray-500 font-medium">
                      STEP {step.number}
                    </div>
                    <h3 className="text-3xl md:text-4xl font-bold text-white">
                        {step.title}
                      </h3>
                    <p className="text-gray-400 leading-relaxed text-lg">
                        {step.description}
                      </p>
                    {/* Data source buttons for Step 01 */}
                    {"dataSources" in step && step.dataSources && (
                      <div className="flex flex-wrap gap-3 mt-6">
                        {step.dataSources.map((source, i) => (
                          <button
                            key={i}
                            className="px-4 py-2 rounded-full bg-gray-800/50 border border-gray-700 text-gray-300 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors text-sm font-medium"
                          >
                            {source}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: UI Example */}
                  <div className="relative">
                    {idx === 0 && (
                      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 space-y-4 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-white font-semibold text-lg">
                            {"title" in step.uiExample && step.uiExample.title}
                          </h4>
                          <button className="px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                            {"addButton" in step.uiExample && step.uiExample.addButton}
                          </button>
                        </div>
                        <div className="space-y-3">
                          {"sources" in step.uiExample && step.uiExample.sources.map((source, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
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
                                <div className="w-10 h-6 rounded-full bg-emerald-500/30 border border-emerald-500/50 relative">
                                  <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-emerald-400"></div>
                                </div>
                              )}
                              {source.status === "syncing" && (
                                <div className="w-5 h-5 border-2 border-emerald-500/50 border-t-emerald-400 rounded-full animate-spin"></div>
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
                        <div className="space-y-3">
                          {"prompts" in step.uiExample && step.uiExample.prompts.map((prompt, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-gray-400 text-sm"
                            >
                              <span className="text-emerald-400">+</span>
                              <span>{prompt}</span>
                            </div>
                          ))}
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                              <div className="w-4 h-4 rounded-full bg-emerald-400"></div>
                            </div>
                            <p className="text-white text-sm leading-relaxed">
                              {"userMessage" in step.uiExample && step.uiExample.userMessage}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                          <span className="text-emerald-400">+</span>
                          <span>{"prompts" in step.uiExample && step.uiExample.prompts[1]}</span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-800">
                          <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                            <span className="text-gray-500 text-sm flex-1">
                              {"inputPlaceholder" in step.uiExample && step.uiExample.inputPlaceholder}
                            </span>
                            <button className="text-emerald-400 hover:text-emerald-300 transition-colors">
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
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-white font-semibold text-lg">
                            {"title" in step.uiExample && step.uiExample.title}
                          </h4>
                          <span className="text-gray-400 text-sm">
                            {"period" in step.uiExample && step.uiExample.period}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-4 mb-6">
                          <div className="text-5xl font-bold text-white">
                            {"metric" in step.uiExample && step.uiExample.metric}
                          </div>
                          <div className="text-lg font-semibold text-red-400">
                            ↑ {"change" in step.uiExample && step.uiExample.change}
                          </div>
                        </div>
                        <div className="h-24 bg-gray-800/50 rounded-lg mb-4 flex items-end p-4 border border-gray-700/50">
                          <div className="w-full h-16 bg-emerald-500/30 rounded-t"></div>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="w-4 h-4 mt-1">
                              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-emerald-400"></div>
                            </div>
                            <div className="flex-1">
                              <div className="text-emerald-400 font-semibold text-sm mb-1">
                                Recommendation
                              </div>
                              <p className="text-gray-300 text-sm leading-relaxed">
                                {"recommendation" in step.uiExample && step.uiExample.recommendation}
                      </p>
                    </div>
                          </div>
                        </div>
                        <button className="w-full mt-4 px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 rounded-lg text-emerald-400 font-medium text-sm transition-colors">
                          {"buttonText" in step.uiExample && step.uiExample.buttonText}
                        </button>
                      </div>
                    )}
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
