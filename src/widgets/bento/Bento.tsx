"use client";

import { Section } from "@/shared/ui/Section";
import { Container } from "@/shared/ui/Container";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { cn } from "@/shared/lib/utils";
import { useI18n } from "@/shared/lib/i18n/context";
import { useSectionView } from "@/shared/lib/useSectionView";

const features = [
  {
    title: "Connect",
    subtitle: "Read-only",
    descriptionKo: "데이터베이스에 읽기 전용으로 안전하게 연결",
    descriptionEn: "Safely connect to your database in read-only mode",
    demo: "🔒 Read-only",
  },
  {
    title: "Metric Catalog",
    descriptionKo: "자동으로 지표를 인식하고 카탈로그화",
    descriptionEn: "Automatically recognize and catalog metrics",
    demo: "📊 24 metrics",
  },
  {
    title: "Ask in Natural Language",
    descriptionKo: "자연어로 질문하면 답을 찾아줍니다",
    descriptionEn: "Ask questions in natural language and get answers",
    demo: "💬 'Why did retention drop?'",
  },
  {
    title: "Explain the Why",
    descriptionKo: "지표 변화의 원인을 자동으로 분석",
    descriptionEn: "Automatically analyze causes of metric changes",
    demo: "🔍 3 causes found",
  },
  {
    title: "Next Actions",
    descriptionKo: "데이터 기반 다음 액션을 제안",
    descriptionEn: "Suggest data-driven next actions",
    demo: "✨ 5 suggestions",
  },
  {
    title: "Shareable Report",
    descriptionKo: "인사이트를 리포트로 공유",
    descriptionEn: "Share insights as reports",
    demo: "📄 Export PDF",
  },
  {
    title: "Security",
    descriptionKo: "엔터프라이즈급 보안과 권한 관리",
    descriptionEn: "Enterprise-grade security and permission management",
    demo: "🛡️ SOC 2",
  },
];

export function Bento() {
  const { t, language } = useI18n();
  const sectionRef = useSectionView("bento");

  return (
    <Section id="features" ref={sectionRef}>
      <Container size="xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            {t.bento.title}
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            {t.bento.description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <Card
              key={idx}
              variant="bento"
              className={cn(
                "p-6 hover:scale-[1.02] transition-transform",
                idx === 0 && "md:col-span-2",
                idx === 3 && "md:col-span-2"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-semibold text-foreground">
                  {feature.title}
                </h3>
                {feature.subtitle && (
                  <Badge variant="info">{feature.subtitle}</Badge>
                )}
              </div>
              <p className="text-gray-400 mb-4 text-sm leading-relaxed">
                {language === "ko" ? feature.descriptionKo : feature.descriptionEn}
              </p>
              <div className="text-sm text-gray-400 font-mono">
                {feature.demo}
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}

