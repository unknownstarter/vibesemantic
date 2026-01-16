"use client";

import { Button } from "@/shared/ui/Button";
import { Container } from "@/shared/ui/Container";
import { Badge } from "@/shared/ui/Badge";
import { Dashboard } from "@/widgets/dashboard/Dashboard";
import { useI18n } from "@/shared/lib/i18n/context";
import { useEffect } from "react";
import { viewSection, clickButton } from "@/shared/lib/analytics";

export function Hero() {
  const { t } = useI18n();

  useEffect(() => {
    viewSection("hero");
  }, []);

  const scrollToSection = (id: string) => {
    const target = document.querySelector(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section className="relative pt-24 pb-32 md:pt-32 md:pb-40 overflow-hidden">
      <Container size="xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
          <div className="space-y-8 self-start min-w-0">
            <Badge variant="info" className="bg-white/10 text-white/80 border-white/20">
              {t.hero.badge}
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight tracking-tight">
              <span className="text-white">{t.hero.title}</span>
            </h1>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-400">
              {t.hero.subtitle}
            </h2>

            <p className="text-base sm:text-lg text-gray-400 leading-relaxed max-w-xl">
              {t.hero.description}
            </p>

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
              <Button
                variant="secondary"
                size="lg"
                className="whitespace-nowrap text-sm sm:text-base"
                onClick={() => {
                  scrollToSection("#product");
                  clickButton("product", "hero");
                }}
              >
                {t.hero.productButton}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="bg-[#22c55e] text-black hover:bg-[#16a34a] hover:text-black border-[#22c55e]/20 whitespace-nowrap text-sm sm:text-base"
                onClick={() => {
                  window.location.href = "/demo";
                  clickButton("demo_try", "hero");
                }}
              >
                {t.hero.demoButton}
              </Button>
              <Button
                variant="primary"
                size="lg"
                className="bg-white text-black hover:bg-gray-100 border border-white/10 whitespace-nowrap text-sm sm:text-base"
                onClick={() => {
                  scrollToSection("#apply");
                  clickButton("early_access", "hero");
                }}
              >
                {t.hero.earlyAccessButton}
              </Button>
            </div>
          </div>

          <div className="min-w-0 w-full max-w-[520px] lg:max-w-none lg:justify-self-end">
            <Dashboard />
          </div>
        </div>
      </Container>
    </section>
  );
}
