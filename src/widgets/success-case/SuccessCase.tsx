"use client";

import { useState } from "react";
import { Section } from "@/shared/ui/Section";
import { Container } from "@/shared/ui/Container";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { cn } from "@/shared/lib/utils";
import { useI18n } from "@/shared/lib/i18n/context";

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
  const maxValue = Math.max(...caseStudy.chartData.map((d) => d.value));
  const minValue = Math.min(...caseStudy.chartData.map((d) => d.value));
  const range = maxValue - minValue;

  return (
    <Card
      variant="bento"
      className={cn(
        "p-6 cursor-pointer transition-all hover:border-white/20",
        isActive && "border-white/30 bg-white/5"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <Badge variant="info" className="mb-2 bg-blue-500/10 text-blue-400 border-blue-500/20">
            {caseStudy.industry}
          </Badge>
          <h3 className="text-xl font-semibold text-white mb-1">{caseStudy.metric}</h3>
          <p className="text-sm text-gray-400">{caseStudy.action}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white mb-1">{caseStudy.value}</p>
          <p className="text-sm text-green-400 font-medium">{caseStudy.change}</p>
        </div>
      </div>

      {/* 미니 차트 */}
      <div className="h-24 bg-black/40 rounded-lg p-3 relative overflow-hidden border border-white/5">
        <svg
          className="w-full h-full"
          viewBox="0 0 200 80"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`chart-${caseStudy.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <polygon
            points={`${caseStudy.chartData
              .map((d, i) => {
                const x = 10 + (i * 180) / (caseStudy.chartData.length - 1);
                const y = 70 - ((d.value - minValue) / range) * 60;
                return `${x},${y}`;
              })
              .join(" ")} 190,80 10,80`}
            fill={`url(#chart-${caseStudy.id})`}
          />
          <polyline
            points={caseStudy.chartData
              .map((d, i) => {
                const x = 10 + (i * 180) / (caseStudy.chartData.length - 1);
                const y = 70 - ((d.value - minValue) / range) * 60;
                return `${x},${y}`;
              })
              .join(" ")}
            fill="none"
            stroke="#22c55e"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {isActive && (
        <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
          <p className="text-sm text-gray-300 leading-relaxed">{caseStudy.result}</p>
        </div>
      )}
    </Card>
  );
}

export function SuccessCase() {
  const { t } = useI18n();
  const [selectedCase, setSelectedCase] = useState<string | null>(null);

  const caseStudies: CaseStudy[] = t.successCase.cases.map((caseData) => ({
    ...caseData,
    chartData: chartDataMap[caseData.id] || [],
  }));

  return (
    <Section id="success" className="bg-gray-950/30">
      <Container size="xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            {t.successCase.title}
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            {t.successCase.description}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
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

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            {t.successCase.clickHint}
          </p>
        </div>
      </Container>
    </Section>
  );
}

