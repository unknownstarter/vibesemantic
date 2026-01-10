"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingDown, AlertCircle, CheckCircle, Sparkles, ArrowRight, MessageSquare, X, ChevronDown, ChevronUp } from "lucide-react";
import { useI18n } from "@/shared/lib/i18n/context";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Container } from "@/shared/ui/Container";
import { Badge } from "@/shared/ui/Badge";
import { Section } from "@/shared/ui/Section";
import { Header } from "@/widgets/header/Header";
import { Footer } from "@/widgets/footer/Footer";
import { clickButton, submitForm } from "@/shared/lib/analytics";

export default function DemoPage() {
  const { t, language } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ type: string; text: string }>>([]);
  const [expandedAction, setExpandedAction] = useState<number | null>(null);
  const [serviceInfo, setServiceInfo] = useState({
    name: "",
    funnel: "",
    conversion: "",
  });

  // Mock data
  const retentionData = [
    { day: "D1", rate: 45, prev: 47 },
    { day: "D3", rate: 32, prev: 35 },
    { day: "D7", rate: 24, prev: 28 },
    { day: "D14", rate: 18, prev: 22 },
    { day: "D30", rate: 12, prev: 16 },
  ];

  const funnelData = [
    { step: "Visit", users: 10000, rate: 100 },
    { step: "Signup", users: 3200, rate: 32 },
    { step: "Onboarding", users: 2400, rate: 24 },
    { step: "First Action", users: 1800, rate: 18 },
    { step: "Activation", users: 1200, rate: 12 },
  ];

  // Scroll to top when step changes (except step 3 which needs scrolling)
  useEffect(() => {
    if (step !== 3) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setChatMessages([]);
    clickButton("demo_analyze", "demo_page");

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          type: "agent",
          text: t.demo.step2.analyzing,
        },
      ]);
    }, 500);

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          type: "agent",
          text: t.demo.step2.analyzing2,
        },
      ]);
    }, 1500);

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          type: "agent",
          text: t.demo.step2.analyzing3,
        },
      ]);
    }, 3000);

    setTimeout(() => {
      setIsAnalyzing(false);
      setShowResults(true);
    }, 4000);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <Section className="bg-gray-950/30 min-h-[calc(100vh-8rem)] flex items-center py-8 md:py-12 lg:py-16">
            <Container size="lg">
              <div className="w-full mx-auto text-center space-y-8 md:space-y-10 lg:space-y-12">
                <div className="space-y-4 md:space-y-5 px-4">
                  <Badge variant="info" className="bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30 mb-2 md:mb-4">
                    {t.demo.step0.badge}
                  </Badge>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight px-2">
                    {t.demo.step0.title}
                    <br />
                    <span className="text-[#22c55e]">{t.demo.step0.titleHighlight}</span>
                  </h1>
                  <p className="text-sm sm:text-base md:text-lg text-gray-400 max-w-2xl mx-auto whitespace-pre-line leading-relaxed px-4">
                    {t.demo.step0.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mt-6 md:mt-8 lg:mt-10 px-4 sm:px-6 max-w-6xl mx-auto">
                  {t.demo.step0.beforeItems.map((item, idx) => (
                    <Card key={idx} variant="bento" className="p-5 sm:p-6 md:p-7 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left">
                      <div className="flex items-center gap-2 mb-3 md:mb-4">
                        <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0"></div>
                        <X className="w-3 h-3 text-red-400 flex-shrink-0" />
                        <span className="text-red-400 text-xs sm:text-sm font-semibold uppercase tracking-wide">{t.demo.step0.beforeTitle.replace("❌ ", "")}</span>
                      </div>
                      <p className="text-gray-200 text-sm sm:text-base md:text-lg leading-relaxed whitespace-pre-line font-medium">{item.text}</p>
                    </Card>
                  ))}
                </div>

                <div className="mt-6 md:mt-8 lg:mt-10 px-4">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => {
                      setStep(1);
                      clickButton("demo_start", "demo_page");
                    }}
                    className="inline-flex items-center gap-2 text-sm sm:text-base md:text-lg px-6 md:px-8 py-3 md:py-4"
                  >
                    {t.demo.step0.startButton}
                    <ArrowRight size={20} className="flex-shrink-0" />
                  </Button>
                  <p className="text-xs sm:text-sm text-gray-500 mt-4 md:mt-5 max-w-xl mx-auto">{t.demo.step0.disclaimer}</p>
                </div>
              </div>
            </Container>
          </Section>
        );

      case 1:
        return (
          <Section className="bg-gray-950/30 min-h-[calc(100vh-8rem)] flex items-center py-12 md:py-16">
            <Container size="lg">
              <div className="max-w-2xl mx-auto w-full">
                <div className="mb-6 md:mb-8 text-center px-4">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 md:mb-4">{t.demo.step1.title}</h2>
                  <p className="text-base md:text-lg text-gray-400">{t.demo.step1.description}</p>
                </div>

                <Card variant="bento" className="p-4 md:p-6 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-semibold text-lg">Data Sources</h4>
                    <button className="px-3 py-1.5 text-xs font-medium text-[#22c55e] hover:text-[#16a34a] transition-colors">
                      + Add New
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#22c55e]/20 border border-[#22c55e]/30 flex items-center justify-center text-[#22c55e] font-bold text-sm">
                          SB
                        </div>
                        <div>
                          <div className="text-white font-medium text-sm">Production DB</div>
                          <div className="text-gray-400 text-xs">Supabase • Last sync 2m ago</div>
                        </div>
                      </div>
                      <div className="w-10 h-6 rounded-full bg-[#22c55e]/30 border border-[#22c55e]/50 relative">
                        <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-[#22c55e]"></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#22c55e]/20 border border-[#22c55e]/30 flex items-center justify-center text-[#22c55e] font-bold text-sm">
                          GA
                        </div>
                        <div>
                          <div className="text-white font-medium text-sm">Analytics Data</div>
                          <div className="text-gray-400 text-xs">GA4 • Syncing...</div>
                        </div>
                      </div>
                      <div className="w-5 h-5 border-2 border-[#22c55e]/50 border-t-[#22c55e] rounded-full animate-spin"></div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#22c55e]/20 border border-[#22c55e]/30 flex items-center justify-center text-[#22c55e] font-bold text-sm">
                          GS
                        </div>
                        <div>
                          <div className="text-white font-medium text-sm">Q3 Sales Sheet</div>
                          <div className="text-gray-400 text-xs">Google Sheets • Paused</div>
                        </div>
                      </div>
                      <div className="w-10 h-6 rounded-full bg-gray-700 border border-gray-600 relative">
                        <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-gray-500"></div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        {t.demo.step1.serviceName}
                      </label>
                      <input
                        type="text"
                        placeholder={t.demo.step1.serviceNamePlaceholder}
                        value={serviceInfo.name}
                        onChange={(e) => setServiceInfo({ ...serviceInfo, name: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#22c55e] focus:border-[#22c55e]/50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        {t.demo.step1.funnel}
                      </label>
                      <input
                        type="text"
                        placeholder={t.demo.step1.funnelPlaceholder}
                        value={serviceInfo.funnel}
                        onChange={(e) => setServiceInfo({ ...serviceInfo, funnel: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#22c55e] focus:border-[#22c55e]/50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        {t.demo.step1.conversion}
                      </label>
                      <input
                        type="text"
                        placeholder={t.demo.step1.conversionPlaceholder}
                        value={serviceInfo.conversion}
                        onChange={(e) => setServiceInfo({ ...serviceInfo, conversion: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#22c55e] focus:border-[#22c55e]/50"
                      />
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => {
                      setStep(2);
                      clickButton("demo_step1_next", "demo_page");
                    }}
                    disabled={!serviceInfo.name || !serviceInfo.funnel || !serviceInfo.conversion}
                    className="w-full mt-4 md:mt-6 text-sm sm:text-base"
                  >
                    {t.demo.step1.nextButton}
                  </Button>
                </Card>
              </div>
            </Container>
          </Section>
        );

      case 2:
        return (
          <Section className="bg-gray-950/30 min-h-[calc(100vh-8rem)] flex items-center py-12 md:py-16">
            <Container size="lg">
              <div className="max-w-2xl mx-auto w-full px-4">
                <div className="mb-6 md:mb-8 text-center">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 md:mb-4">{t.demo.step2.title}</h2>
                  <p className="text-base md:text-lg text-gray-400">{t.demo.step2.description}</p>
                </div>

                <Card variant="bento" className="overflow-hidden">
                  <div className="p-4 md:p-6 bg-[#22c55e]/10 border-b border-[#22c55e]/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-[#22c55e]/20 border border-[#22c55e]/30 rounded-full flex items-center justify-center flex-shrink-0">
                        <Sparkles className="text-[#22c55e]" size={18} />
                      </div>
                      <div>
                        <div className="font-semibold text-white text-sm md:text-base">{t.demo.step2.agentTitle}</div>
                        <div className="text-xs md:text-sm text-gray-400">{t.demo.step2.agentSubtitle}</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 md:p-6 space-y-4">
                    {!isAnalyzing && !showResults && (
                      <div className="space-y-3">
                        <div className="text-gray-500 text-sm mb-4">{t.demo.step2.suggestionTitle}</div>

                        {t.demo.step2.questions.map((question, idx) => (
                          <button
                            key={idx}
                            onClick={handleAnalyze}
                            className="w-full text-left p-4 bg-white/5 hover:bg-[#22c55e]/10 border border-white/10 hover:border-[#22c55e]/30 rounded-lg transition-all group"
                          >
                            <div className="font-medium text-gray-300 group-hover:text-[#22c55e]">
                              {question}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className="flex gap-3 animate-fade-in">
                        <div className="w-8 h-8 bg-[#22c55e]/20 border border-[#22c55e]/30 rounded-full flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="text-[#22c55e]" size={16} />
                        </div>
                        <div className="flex-1 p-3 bg-white/5 rounded-lg border border-white/10">
                          <p className="text-gray-300">{msg.text}</p>
                        </div>
                      </div>
                    ))}

                    {isAnalyzing && (
                      <div className="flex justify-center py-8">
                        <div className="flex gap-2">
                          <div
                            className="w-3 h-3 bg-[#22c55e] rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          ></div>
                          <div
                            className="w-3 h-3 bg-[#22c55e] rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          ></div>
                          <div
                            className="w-3 h-3 bg-[#22c55e] rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {showResults && (
                      <Button
                        variant="primary"
                        onClick={() => {
                          setStep(3);
                          clickButton("demo_view_results", "demo_page");
                        }}
                        className="w-full mt-4 text-sm sm:text-base"
                      >
                        {t.demo.step2.viewResults}
                      </Button>
                    )}
                  </div>
                </Card>
              </div>
            </Container>
          </Section>
        );

      case 3:
        return (
          <Section className="bg-gray-950/30 py-12 md:py-16">
            <Container size="xl">
              <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
                <div className="mb-6 md:mb-8 text-center px-4">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 md:mb-4">{t.demo.step3.title}</h2>
                  <p className="text-base md:text-lg text-gray-400">{t.demo.step3.subtitle}</p>
                </div>

                {/* Key Insights */}
                <Card variant="bento" className="p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-bold text-white mb-3 md:mb-4 flex items-center gap-2">
                    <AlertCircle className="text-orange-400" size={18} />
                    {t.demo.step3.keyIssues}
                  </h3>
                  <div className="space-y-2 md:space-y-3">
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <TrendingDown className="text-red-400 flex-shrink-0 mt-1" size={20} />
                        <div>
                          <div className="font-semibold text-red-400 mb-1">D7 리텐션 14% 하락</div>
                          <p className="text-sm text-gray-400">
                            지난주 대비 24% → 21%. 온보딩 완료 후 7일 내 이탈이 증가했습니다.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="text-yellow-400 flex-shrink-0 mt-1" size={20} />
                        <div>
                          <div className="font-semibold text-yellow-400 mb-1">온보딩 → 첫 액션 전환율 75%</div>
                          <p className="text-sm text-gray-400">
                            업계 평균(85%)보다 낮습니다. 온보딩 단계에서 이탈이 발생하고 있습니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <Card variant="bento" className="p-4 md:p-6">
                    <h3 className="text-base md:text-lg font-bold text-white mb-3 md:mb-4">{t.demo.step3.retentionTitle}</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={retentionData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="day" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            border: "1px solid #374151",
                            borderRadius: "8px",
                            color: "#f3f4f6",
                          }}
                        />
                        <Line type="monotone" dataKey="rate" stroke="#22c55e" strokeWidth={2} name="현재" />
                        <Line
                          type="monotone"
                          dataKey="prev"
                          stroke="#6b7280"
                          strokeWidth={2}
                          name="이전"
                          strokeDasharray="5 5"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card variant="bento" className="p-4 md:p-6">
                    <h3 className="text-base md:text-lg font-bold text-white mb-3 md:mb-4">{t.demo.step3.funnelTitle}</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={funnelData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="step" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            border: "1px solid #374151",
                            borderRadius: "8px",
                            color: "#f3f4f6",
                          }}
                          cursor={false}
                        />
                        <Bar 
                          dataKey="rate" 
                          fill="#22c55e"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    <style jsx global>{`
                      .recharts-bar-rectangle {
                        transition: transform 0.2s ease-in-out !important;
                        transform-origin: bottom !important;
                      }
                      .recharts-bar-rectangle:hover {
                        transform: scaleY(1.05) !important;
                      }
                      .recharts-tooltip-cursor {
                        display: none !important;
                      }
                      .recharts-active-bar {
                        background: transparent !important;
                      }
                      .recharts-bar {
                        background: transparent !important;
                      }
                    `}</style>
                  </Card>
                </div>

                {/* Action Items - Success Case Style */}
                <Card variant="bento" className="p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-bold text-white mb-3 md:mb-4 flex items-center gap-2">
                    <CheckCircle className="text-[#22c55e]" size={18} />
                    {t.demo.step3.actionItems}
                  </h3>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                    {[
                      { action: t.demo.step3.action1, metric: "CVR", value: "+8%p", color: "red", id: 1 },
                      { action: t.demo.step3.action2, metric: "D7 리텐션", value: "+3%p", color: "orange", id: 2 },
                      { action: t.demo.step3.action3, metric: "활성화율", value: "+5%p", color: "yellow", id: 3 },
                    ].map(({ action, metric, value, color, id }) => {
                      const isExpanded = expandedAction === id;
                      const colorClasses = {
                        red: "bg-red-500/10 text-red-400 border-red-500/20",
                        orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
                        yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
                      };

                      return (
                        <Card
                          key={id}
                          variant="bento"
                          className={`p-4 md:p-6 cursor-pointer transition-all hover:bg-white/10 hover:border-white/20 ${
                            isExpanded ? "bg-white/10 border-white/20" : ""
                          }`}
                          onClick={() => {
                            setExpandedAction(isExpanded ? null : id);
                            clickButton(`demo_action_${id}_${isExpanded ? "collapse" : "expand"}`, "demo_page");
                          }}
                        >
                          <div className="flex items-start justify-between mb-3 md:mb-4">
                            <Badge variant="info" className={colorClasses[color as keyof typeof colorClasses]}>
                              {action.impact}
                            </Badge>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedAction(isExpanded ? null : id);
                                clickButton(`demo_action_${id}_${isExpanded ? "collapse" : "expand"}`, "demo_page");
                              }}
                              className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
                              aria-label={isExpanded ? "Collapse" : "Expand"}
                            >
                              {isExpanded ? (
                                <ChevronUp size={20} />
                              ) : (
                                <ChevronDown size={20} />
                              )}
                            </button>
                          </div>
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg md:text-xl font-semibold text-white mb-1">{metric}</h3>
                            <div className="text-right">
                              <p className="text-xl md:text-2xl font-bold text-white mb-1">{value}</p>
                              <p className="text-xs md:text-sm text-[#22c55e] font-medium">
                                {language === "ko" ? "개선 예상" : "Expected"}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs md:text-sm text-gray-400 mb-3 md:mb-4">
                            {action.title.replace(/^\d+\.\s*/, "")}
                          </p>
                          <div className="h-20 md:h-24 bg-black/40 rounded-lg p-2 md:p-3 relative overflow-hidden border border-white/5">
                            <svg className="w-full h-full" viewBox="0 0 200 80" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id={`chart-action${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
                                </linearGradient>
                              </defs>
                              <polygon
                                points="10,70 50,65 90,60 130,55 170,50 190,48 190,80 10,80"
                                fill={`url(#chart-action${id})`}
                              />
                              <polyline
                                points="10,70 50,65 90,60 130,55 170,50 190,48"
                                fill="none"
                                stroke="#22c55e"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-white/10 animate-fade-in space-y-3">
                              <div className="space-y-2">
                                <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                                  {action.description}
                                </p>
                              </div>
                              <div className="space-y-1.5 pt-2">
                                <div className="flex items-start gap-2 text-xs md:text-sm text-gray-400">
                                  <span className="text-gray-500">•</span>
                                  <span>{action.testPeriod}</span>
                                </div>
                                <div className="flex items-start gap-2 text-xs md:text-sm text-gray-400">
                                  <span className="text-gray-500">•</span>
                                  <span>{action.resources}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Click hint when not expanded */}
                          {!isExpanded && (
                            <div className="mt-3 pt-3 border-t border-white/5">
                              <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
                                <span>{language === "ko" ? "클릭하여 상세 정보 보기" : "Click to view details"}</span>
                                <ChevronDown size={14} className="opacity-50" />
                              </p>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </Card>

                {/* CTA */}
                <Card variant="bento" className="p-6 md:p-8 text-center bg-white/5 border-white/10">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2 md:mb-3">{t.demo.step3.ctaTitle}</h3>
                  <p className="text-sm md:text-base text-gray-400 mb-4 md:mb-6">{t.demo.step3.ctaDescription}</p>
                  <Button
                    variant="primary"
                    onClick={() => {
                      clickButton("demo_apply_early_access", "demo_page");
                      router.push("/#apply");
                    }}
                    className="inline-flex items-center gap-2 text-sm sm:text-base"
                  >
                    {t.demo.step3.ctaButton}
                    <ArrowRight size={20} className="flex-shrink-0" />
                  </Button>
                </Card>
              </div>
            </Container>
          </Section>
        );

      case 4:
        return (
          <Section className="bg-gray-950/30 min-h-[calc(100vh-8rem)] flex items-center py-12 md:py-16">
            <Container size="md">
              <Card variant="bento" className="p-6 md:p-8">
                <div className="text-center mb-4 md:mb-6">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-[#22c55e]/20 border border-[#22c55e]/30 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                    <CheckCircle className="text-[#22c55e]" size={24} />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{t.demo.step4.title}</h2>
                  <p className="text-sm md:text-base text-gray-400">{t.demo.step4.description}</p>
                </div>

                <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
                  <div className="p-3 md:p-4 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg">
                    <p className="text-xs md:text-sm text-[#22c55e]/90 whitespace-pre-line">{t.demo.step4.disclaimer}</p>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder={t.demo.step4.companyName}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50"
                    />
                    <input
                      type="text"
                      placeholder={t.demo.step4.jobRole}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50"
                    />
                    <input
                      type="text"
                      placeholder={t.demo.step4.dau}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50"
                    />
                    <textarea
                      placeholder={t.demo.step4.painPoint}
                      rows={4}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 resize-none"
                    />
                  </div>
                </div>

                <Button
                  variant="primary"
                  onClick={() => {
                    submitForm("demo_early_access", true);
                    router.push("/#apply");
                  }}
                  className="w-full text-sm sm:text-base"
                >
                  {t.demo.step4.applyButton}
                </Button>

                <p className="text-xs text-gray-500 text-center mt-4">{t.demo.step4.applyNote}</p>
              </Card>
            </Container>
          </Section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-950">
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
      <Header />
      <main>{renderStep()}</main>
      <Footer />
    </div>
  );
}
