"use client";

import { Button } from "@/shared/ui/Button";
import { Container } from "@/shared/ui/Container";
import { Badge } from "@/shared/ui/Badge";
import { Dashboard } from "@/widgets/dashboard/Dashboard";

export function Hero() {
  const scrollToSection = (id: string) => {
    const target = document.querySelector(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section className="relative pt-24 pb-32 md:pt-32 md:pb-40 overflow-hidden">
      <Container size="xl">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <Badge variant="info" className="bg-white/10 text-white/80 border-white/20">
              Private Preview · Jan 2026
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
              <span className="text-white">Vibe Semantic</span>
            </h1>

            <h2 className="text-2xl md:text-3xl font-semibold text-gray-400">
              Your Product's Personal Data Analyst & BI
            </h2>

            <p className="text-lg text-gray-400 leading-relaxed max-w-lg">
              SQL 없이도, 지금 봐야 할 지표와 다음 액션을 제안합니다. PO, 창업가, 마케터를 위한 AI 기반 데이터 분석 도구로 DAU, 리텐션, 전환율 등 핵심 지표를 자연어로 질문하고 인사이트를 얻으세요.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="primary"
                size="lg"
                onClick={() => scrollToSection("#apply")}
              >
                Early Access 신청하기
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => scrollToSection("#how")}
              >
                How it works
              </Button>
            </div>
          </div>

          <div>
            <Dashboard />
          </div>
        </div>
      </Container>
    </section>
  );
}
