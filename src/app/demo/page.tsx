"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingDown, TrendingUp, AlertCircle, CheckCircle, Database, Sparkles, ArrowRight, MessageSquare } from "lucide-react";
import { useI18n } from "@/shared/lib/i18n/context";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Container } from "@/shared/ui/Container";
import { Badge } from "@/shared/ui/Badge";
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
          <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
            <Container size="lg">
              <div className="max-w-2xl w-full text-center space-y-8">
                <div className="space-y-4">
                  <Badge variant="info" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 mb-4">
                    <Sparkles size={16} className="mr-2" />
                    {t.demo.step0.badge}
                  </Badge>
                  <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
                    {t.demo.step0.title}
                    <br />
                    <span className="text-emerald-400">{t.demo.step0.titleHighlight}</span>
                  </h1>
                  <p className="text-xl text-gray-400 max-w-xl mx-auto whitespace-pre-line">
                    {t.demo.step0.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
                  {t.demo.step0.beforeItems.map((item, idx) => (
                    <Card key={idx} variant="bento" className="p-6">
                      <div className="text-red-400 font-semibold mb-2">{t.demo.step0.beforeTitle}</div>
                      <p className="text-gray-300 text-sm whitespace-pre-line">{item.text}</p>
                    </Card>
                  ))}
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    setStep(1);
                    clickButton("demo_start", "demo_page");
                  }}
                  className="mt-8 inline-flex items-center gap-2"
                >
                  {t.demo.step0.startButton}
                  <ArrowRight size={20} />
                </Button>

                <p className="text-sm text-gray-500 mt-4">{t.demo.step0.disclaimer}</p>
              </div>
            </Container>
          </div>
        );

      case 1:
        return (
          <div className="min-h-screen bg-gray-950 p-4 py-8">
            <Container size="lg">
              <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">{t.demo.step1.title}</h2>
                  <p className="text-gray-400">{t.demo.step1.description}</p>
                </div>

                <Card variant="bento" className="p-6 space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <CheckCircle className="text-emerald-400" size={24} />
                    <div>
                      <div className="font-semibold text-emerald-400">{t.demo.step1.connected}</div>
                      <div className="text-sm text-gray-400">my-app.supabase.co</div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {t.demo.step1.serviceName}
                      </label>
                      <input
                        type="text"
                        placeholder={t.demo.step1.serviceNamePlaceholder}
                        value={serviceInfo.name}
                        onChange={(e) => setServiceInfo({ ...serviceInfo, name: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {t.demo.step1.funnel}
                      </label>
                      <input
                        type="text"
                        placeholder={t.demo.step1.funnelPlaceholder}
                        value={serviceInfo.funnel}
                        onChange={(e) => setServiceInfo({ ...serviceInfo, funnel: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {t.demo.step1.conversion}
                      </label>
                      <input
                        type="text"
                        placeholder={t.demo.step1.conversionPlaceholder}
                        value={serviceInfo.conversion}
                        onChange={(e) => setServiceInfo({ ...serviceInfo, conversion: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                    className="w-full mt-6"
                  >
                    {t.demo.step1.nextButton}
                  </Button>
                </Card>
              </div>
            </Container>
          </div>
        );

      case 2:
        return (
          <div className="min-h-screen bg-gray-950 p-4 py-8">
            <Container size="lg">
              <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">{t.demo.step2.title}</h2>
                  <p className="text-gray-400">{t.demo.step2.description}</p>
                </div>

                <Card variant="bento" className="overflow-hidden">
                  <div className="p-6 bg-emerald-500/10 border-b border-emerald-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Sparkles className="text-white" size={20} />
                      </div>
                      <div>
                        <div className="font-semibold text-white">{t.demo.step2.agentTitle}</div>
                        <div className="text-sm text-gray-400">{t.demo.step2.agentSubtitle}</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-4 min-h-[300px]">
                    {!isAnalyzing && !showResults && (
                      <div className="space-y-3">
                        <div className="text-gray-500 text-sm mb-4">{t.demo.step2.suggestionTitle}</div>

                        {t.demo.step2.questions.map((question, idx) => (
                          <button
                            key={idx}
                            onClick={handleAnalyze}
                            className="w-full text-left p-4 bg-gray-900/50 hover:bg-emerald-500/10 border border-gray-700 hover:border-emerald-500/30 rounded-lg transition-all group"
                          >
                            <div className="font-medium text-gray-300 group-hover:text-emerald-400">
                              {question}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className="flex gap-3 animate-fade-in">
                        <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="text-emerald-400" size={16} />
                        </div>
                        <div className="flex-1 p-3 bg-gray-900/50 rounded-lg">
                          <p className="text-gray-300">{msg.text}</p>
                        </div>
                      </div>
                    ))}

                    {isAnalyzing && (
                      <div className="flex justify-center py-8">
                        <div className="flex gap-2">
                          <div
                            className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          ></div>
                          <div
                            className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          ></div>
                          <div
                            className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"
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
                        className="w-full mt-4"
                      >
                        {t.demo.step2.viewResults}
                      </Button>
                    )}
                  </div>
                </Card>
              </div>
            </Container>
          </div>
        );

      case 3:
        return (
          <div className="min-h-screen bg-gray-950 p-4 py-8">
            <Container size="xl">
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">{t.demo.step3.title}</h2>
                  <p className="text-gray-400">{t.demo.step3.subtitle}</p>
                </div>

                {/* Key Insights */}
                <Card variant="bento" className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <AlertCircle className="text-orange-400" size={20} />
                    {t.demo.step3.keyIssues}
                  </h3>
                  <div className="space-y-3">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card variant="bento" className="p-6">
                    <h3 className="text-lg font-bold text-white mb-4">{t.demo.step3.retentionTitle}</h3>
                    <ResponsiveContainer width="100%" height={250}>
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

                  <Card variant="bento" className="p-6">
                    <h3 className="text-lg font-bold text-white mb-4">{t.demo.step3.funnelTitle}</h3>
                    <ResponsiveContainer width="100%" height={250}>
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
                        />
                        <Bar dataKey="rate" fill="#22c55e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                {/* Action Items */}
                <Card variant="bento" className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="text-emerald-400" size={20} />
                    {t.demo.step3.actionItems}
                  </h3>
                  <div className="space-y-4">
                    <div className="p-5 border-l-4 border-emerald-500 bg-emerald-500/10">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-semibold text-white">{t.demo.step3.action1.title}</div>
                        <Badge variant="info" className="bg-red-500/10 text-red-400 border-red-500/20">
                          {t.demo.step3.action1.impact}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-300 mb-3">{t.demo.step3.action1.description}</p>
                      <div className="text-sm text-gray-400">
                        <div>• {t.demo.step3.action1.testPeriod}</div>
                        <div>• {t.demo.step3.action1.resources}</div>
                      </div>
                    </div>

                    <div className="p-5 border-l-4 border-purple-500 bg-purple-500/10">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-semibold text-white">{t.demo.step3.action2.title}</div>
                        <Badge variant="info" className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                          {t.demo.step3.action2.impact}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-300 mb-3">{t.demo.step3.action2.description}</p>
                      <div className="text-sm text-gray-400">
                        <div>• {t.demo.step3.action2.testPeriod}</div>
                        <div>• {t.demo.step3.action2.resources}</div>
                      </div>
                    </div>

                    <div className="p-5 border-l-4 border-green-500 bg-green-500/10">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-semibold text-white">{t.demo.step3.action3.title}</div>
                        <Badge variant="info" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                          {t.demo.step3.action3.impact}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-300 mb-3">{t.demo.step3.action3.description}</p>
                      <div className="text-sm text-gray-400">
                        <div>• {t.demo.step3.action3.testPeriod}</div>
                        <div>• {t.demo.step3.action3.resources}</div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* CTA */}
                <Card variant="glow" className="p-8 text-center bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border-emerald-500/30">
                  <h3 className="text-2xl font-bold text-white mb-3">{t.demo.step3.ctaTitle}</h3>
                  <p className="text-gray-300 mb-6">{t.demo.step3.ctaDescription}</p>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setStep(4);
                      clickButton("demo_apply_early_access", "demo_page");
                    }}
                    className="inline-flex items-center gap-2"
                  >
                    {t.demo.step3.ctaButton}
                    <ArrowRight size={20} />
                  </Button>
                </Card>
              </div>
            </Container>
          </div>
        );

      case 4:
        return (
          <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
            <Container size="md">
              <Card variant="bento" className="p-8">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="text-emerald-400" size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">{t.demo.step4.title}</h2>
                  <p className="text-gray-400">{t.demo.step4.description}</p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <p className="text-sm text-emerald-300 whitespace-pre-line">{t.demo.step4.disclaimer}</p>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder={t.demo.step4.companyName}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder={t.demo.step4.jobRole}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder={t.demo.step4.dau}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <textarea
                      placeholder={t.demo.step4.painPoint}
                      rows={4}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>

                <Button
                  variant="primary"
                  onClick={() => {
                    alert(
                      language === "ko"
                        ? "신청이 접수되었습니다! (데모용)\n\n실제 서비스 오픈 시 안내드리겠습니다."
                        : "Application received! (Demo)\n\nWe'll notify you when the service opens."
                    );
                    submitForm("demo_early_access", true);
                    router.push("/#apply");
                  }}
                  className="w-full"
                >
                  {t.demo.step4.applyButton}
                </Button>

                <p className="text-xs text-gray-500 text-center mt-4">{t.demo.step4.applyNote}</p>
              </Card>
            </Container>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="font-sans bg-gray-950 min-h-screen">
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
      {renderStep()}
      <Footer />
    </div>
  );
}
