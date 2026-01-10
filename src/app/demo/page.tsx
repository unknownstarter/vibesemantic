"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingDown, AlertCircle, CheckCircle, Sparkles, ArrowRight, MessageSquare } from "lucide-react";
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
          <Section className="bg-gray-950/30">
            <Container size="lg">
              <div className="max-w-2xl w-full mx-auto text-center space-y-8">
                <div className="space-y-4">
                  <Badge variant="info" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mb-4">
                    {t.demo.step0.badge}
                  </Badge>
                  <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                    {t.demo.step0.title}
                    <br />
                    <span className="text-emerald-400">{t.demo.step0.titleHighlight}</span>
                  </h1>
                  <p className="text-lg text-gray-400 max-w-xl mx-auto whitespace-pre-line">
                    {t.demo.step0.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                  {t.demo.step0.beforeItems.map((item, idx) => (
                    <Card key={idx} variant="bento" className="p-6">
                      <div className="text-red-400 font-semibold mb-2">{t.demo.step0.beforeTitle}</div>
                      <p className="text-gray-400 text-sm whitespace-pre-line">{item.text}</p>
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
          </Section>
        );

      case 1:
        return (
          <Section className="bg-gray-950/30">
            <Container size="lg">
              <div className="max-w-2xl mx-auto">
                <div className="mb-8 text-center">
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{t.demo.step1.title}</h2>
                  <p className="text-lg text-gray-400">{t.demo.step1.description}</p>
                </div>

                <Card variant="bento" className="p-6 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-semibold text-lg">Data Sources</h4>
                    <button className="px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                      + Add New
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                          SB
                        </div>
                        <div>
                          <div className="text-white font-medium text-sm">Production DB</div>
                          <div className="text-gray-400 text-xs">Supabase • Last sync 2m ago</div>
                        </div>
                      </div>
                      <div className="w-10 h-6 rounded-full bg-emerald-500/30 border border-emerald-500/50 relative">
                        <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-emerald-400"></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                          GA
                        </div>
                        <div>
                          <div className="text-white font-medium text-sm">Analytics Data</div>
                          <div className="text-gray-400 text-xs">GA4 • Syncing...</div>
                        </div>
                      </div>
                      <div className="w-5 h-5 border-2 border-emerald-500/50 border-t-emerald-400 rounded-full animate-spin"></div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
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
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50"
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
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50"
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
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50"
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
          </Section>
        );

      case 2:
        return (
          <Section className="bg-gray-950/30">
            <Container size="lg">
              <div className="max-w-3xl mx-auto">
                <div className="mb-8 text-center">
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{t.demo.step2.title}</h2>
                  <p className="text-lg text-gray-400">{t.demo.step2.description}</p>
                </div>

                <Card variant="bento" className="overflow-hidden">
                  <div className="p-6 bg-emerald-500/10 border-b border-emerald-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center">
                        <Sparkles className="text-emerald-400" size={20} />
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
                            className="w-full text-left p-4 bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 rounded-lg transition-all group"
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
                        <div className="w-8 h-8 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="text-emerald-400" size={16} />
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
          </Section>
        );

      case 3:
        return (
          <Section className="bg-gray-950/30">
            <Container size="xl">
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="mb-8 text-center">
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{t.demo.step3.title}</h2>
                  <p className="text-lg text-gray-400">{t.demo.step3.subtitle}</p>
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

                {/* Action Items - Success Case Style */}
                <Card variant="bento" className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="text-emerald-400" size={20} />
                    {t.demo.step3.actionItems}
                  </h3>
                  <div className="grid md:grid-cols-3 gap-6">
                    <Card variant="bento" className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <Badge variant="info" className="bg-red-500/10 text-red-400 border-red-500/20">
                          {t.demo.step3.action1.impact}
                        </Badge>
                      </div>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-xl font-semibold text-white mb-1">CVR</h3>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-white mb-1">+8%p</p>
                          <p className="text-sm text-green-400 font-medium">개선 예상</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 mb-4">{t.demo.step3.action1.title.replace("1. ", "")}</p>
                      <div className="h-24 bg-black/40 rounded-lg p-3 relative overflow-hidden border border-white/5">
                        <svg className="w-full h-full" viewBox="0 0 200 80" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="chart-action1" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
                            </linearGradient>
                          </defs>
                          <polygon
                            points="10,70 50,65 90,60 130,55 170,50 190,48 190,80 10,80"
                            fill="url(#chart-action1)"
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
                    </Card>

                    <Card variant="bento" className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <Badge variant="info" className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                          {t.demo.step3.action2.impact}
                        </Badge>
                      </div>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-xl font-semibold text-white mb-1">D7 리텐션</h3>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-white mb-1">+3%p</p>
                          <p className="text-sm text-green-400 font-medium">개선 예상</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 mb-4">{t.demo.step3.action2.title.replace("2. ", "")}</p>
                      <div className="h-24 bg-black/40 rounded-lg p-3 relative overflow-hidden border border-white/5">
                        <svg className="w-full h-full" viewBox="0 0 200 80" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="chart-action2" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
                            </linearGradient>
                          </defs>
                          <polygon
                            points="10,75 50,70 90,65 130,60 170,55 190,53 190,80 10,80"
                            fill="url(#chart-action2)"
                          />
                          <polyline
                            points="10,75 50,70 90,65 130,60 170,55 190,53"
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </Card>

                    <Card variant="bento" className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <Badge variant="info" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                          {t.demo.step3.action3.impact}
                        </Badge>
                      </div>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-xl font-semibold text-white mb-1">활성화율</h3>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-white mb-1">+5%p</p>
                          <p className="text-sm text-green-400 font-medium">개선 예상</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 mb-4">{t.demo.step3.action3.title.replace("3. ", "")}</p>
                      <div className="h-24 bg-black/40 rounded-lg p-3 relative overflow-hidden border border-white/5">
                        <svg className="w-full h-full" viewBox="0 0 200 80" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="chart-action3" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
                            </linearGradient>
                          </defs>
                          <polygon
                            points="10,72 50,68 90,64 130,58 170,52 190,50 190,80 10,80"
                            fill="url(#chart-action3)"
                          />
                          <polyline
                            points="10,72 50,68 90,64 130,58 170,52 190,50"
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </Card>
                  </div>
                </Card>

                {/* CTA */}
                <Card variant="bento" className="p-8 text-center bg-white/5 border-white/10">
                  <h3 className="text-2xl font-bold text-white mb-3">{t.demo.step3.ctaTitle}</h3>
                  <p className="text-gray-400 mb-6">{t.demo.step3.ctaDescription}</p>
                  <Button
                    variant="primary"
                    onClick={() => {
                      clickButton("demo_apply_early_access", "demo_page");
                      router.push("/#apply");
                    }}
                    className="inline-flex items-center gap-2"
                  >
                    {t.demo.step3.ctaButton}
                    <ArrowRight size={20} />
                  </Button>
                </Card>
              </div>
            </Container>
          </Section>
        );

      case 4:
        return (
          <Section className="bg-gray-950/30">
            <Container size="md">
              <Card variant="bento" className="p-8">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
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
                  className="w-full"
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
