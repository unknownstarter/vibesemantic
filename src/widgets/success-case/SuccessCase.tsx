"use client";

import { useState } from "react";
import { Section } from "@/shared/ui/Section";
import { Container } from "@/shared/ui/Container";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { SparklineArea } from "@/shared/ui/SparklineArea";
import { cn } from "@/shared/lib/utils";
import { useI18n } from "@/shared/lib/i18n/context";
import { useSectionView } from "@/shared/lib/useSectionView";

interface CaseStudy {
  id: string;
  industry: string;
  metric: string;
  value: string;
  change: string;
  period: string;
  action: string;
  result: string;
  chartData: Array<{ day: number; value: number }>;
}

const chartDataMap: Record<string, Array<{ day: number; value: number }>> = {
  ecommerce: [
    { day: 0, value: 2.3 },
    { day: 2, value: 2.35 },
    { day: 4, value: 2.4 },
    { day: 6, value: 2.5 },
    { day: 8, value: 2.6 },
    { day: 10, value: 2.7 },
    { day: 12, value: 2.75 },
    { day: 14, value: 2.8 },
  ],
  dau: [
    { day: 0, value: 13.8 },
    { day: 1, value: 14.0 },
    { day: 2, value: 14.2 },
    { day: 3, value: 14.5 },
    { day: 4, value: 14.8 },
    { day: 5, value: 15.0 },
    { day: 6, value: 15.1 },
    { day: 7, value: 15.2 },
  ],
  ctr: [
    { day: 0, value: 3.4 },
    { day: 2, value: 3.5 },
    { day: 4, value: 3.7 },
    { day: 6, value: 3.9 },
    { day: 8, value: 4.0 },
    { day: 10, value: 4.2 },
  ],
};

function CaseCard({ caseStudy, isActive, onClick }: { caseStudy: CaseStudy; isActive: boolean; onClick: () => void }) {
  return (
    <Card
      variant="bento"
      className={cn(
        "p-6 cursor-pointer transition-all hover:border-border/30 h-full flex flex-col",
        isActive && "border-border/40 bg-surface/10"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4 min-h-[116px]">
        <div className="min-w-0">
          <Badge variant="info" className="mb-3">
            {caseStudy.industry}
          </Badge>
          <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
            {caseStudy.metric}
          </h3>
          <p className="text-sm text-muted leading-relaxed">{caseStudy.action}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-foreground mb-1">{caseStudy.value}</p>
          <p className="text-sm text-success font-medium">{caseStudy.change}</p>
          <p className="text-xs text-subtle mt-1">{caseStudy.period}</p>
        </div>
      </div>

      <SparklineArea
        values={caseStudy.chartData.map((point) => point.value)}
        height={112}
        className="mt-5"
        strokeClassName="stroke-primary"
        fillClassName="fill-primary/15"
      />

      <div
        className={cn(
          "mt-5 rounded-lg border p-4 text-sm leading-relaxed min-h-[96px]",
          isActive
            ? "bg-surface/10 border-border/30 text-foreground/90"
            : "bg-surface/5 border-border/20 text-muted"
        )}
      >
        {caseStudy.result}
      </div>
    </Card>
  );
}

export function SuccessCase() {
  const { t } = useI18n();
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const sectionRef = useSectionView("success_case");

  const caseStudies: CaseStudy[] = t.successCase.cases.map((caseData) => ({
    ...caseData,
    chartData: chartDataMap[caseData.id] || [],
  }));

  return (
    <Section id="success" ref={sectionRef} className="bg-gray-950/30">
      <Container size="xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            {t.successCase.title}
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            {t.successCase.description}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
          {caseStudies.map((caseStudy) => (
            <CaseCard
              key={caseStudy.id}
              caseStudy={caseStudy}
              isActive={selectedCase === caseStudy.id}
              onClick={() =>
                setSelectedCase(selectedCase === caseStudy.id ? null : caseStudy.id)
              }
            />
          ))}
        </div>

      </Container>
    </Section>
  );
}

