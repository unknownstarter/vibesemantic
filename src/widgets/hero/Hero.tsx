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
        <div className="grid md:grid-cols-2 gap-16 items-start">
          <div className="space-y-8 self-start">
            <Badge variant="info" className="bg-white/10 text-white/80 border-white/20">
              {t.hero.badge}
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
              <span className="text-white">{t.hero.title}</span>
            </h1>

            <h2 className="text-2xl md:text-3xl font-semibold text-gray-400">
              {t.hero.subtitle}
            </h2>

            <p className="text-lg text-gray-400 leading-relaxed max-w-lg">
              {t.hero.description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="secondary"
                size="lg"
                className="bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-500/20"
                onClick={() => {
                  window.location.href = "/demo";
                  clickButton("demo_try", "hero");
                }}
              >
                {t.hero.demoButton}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  scrollToSection("#how");
                  clickButton("how_it_works", "hero");
                }}
              >
                {t.hero.howItWorksButton}
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  scrollToSection("#apply");
                  clickButton("early_access", "hero");
                }}
              >
                {t.hero.earlyAccessButton}
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
