"use client";

import { useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { StatCard } from "@/shared/ui/StatCard";
import { ActionChip } from "@/shared/ui/ActionChip";
import { SparklineArea } from "@/shared/ui/SparklineArea";
import { Surface } from "@/shared/ui/Surface";
import { useI18n } from "@/shared/lib/i18n/context";
import { clickButton } from "@/shared/lib/analytics";

export function Dashboard() {
  const { t } = useI18n();
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const metrics = [
    { id: "dau", label: "DAU", value: "12.4K", change: "+10.2%", type: "positive" as const },
    { id: "ctr", label: "CTR", value: "3.8%", change: "+0.5%", type: "positive" as const },
    { id: "cvr", label: "CVR", value: "2.1%", change: "+0.3%", type: "positive" as const },
    { id: "cart", label: "Add to Cart", value: "8.2K", change: "+15.1%", type: "positive" as const },
  ];

  const actions = [
    { id: "conversion", label: t.dashboard.actions.conversion },
    { id: "retention", label: t.dashboard.actions.retention },
    { id: "engagement", label: t.dashboard.actions.engagement },
  ];

  const handleMetricClick = (metricId: string) => {
    setSelectedMetric(selectedMetric === metricId ? null : metricId);
    clickButton(`dashboard_metric_${metricId}`, "dashboard");
  };

  const handleActionClick = (actionId: string) => {
    setSelectedAction(selectedAction === actionId ? null : actionId);
    clickButton(`dashboard_action_${actionId}`, "dashboard");
  };

  return (
    <Card variant="bento" className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">{t.dashboard.title}</h3>
          <p className="text-sm text-muted">{t.dashboard.subtitle}</p>
        </div>
        <Badge variant="success">{t.dashboard.live}</Badge>
      </div>

      {/* 메트릭 그리드 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {metrics.map((metric) => (
          <StatCard
            key={metric.id}
            label={metric.label}
            value={metric.value}
            change={metric.change}
            trend={metric.type}
            isInteractive
            onClick={() => handleMetricClick(metric.id)}
          />
        ))}
      </div>

      {/* 액션 버튼 */}
      <div className="mb-6">
        <p className="text-xs text-subtle mb-3 uppercase tracking-wide">
          {t.dashboard.recommendedActions}
        </p>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <ActionChip
              key={action.id}
              onClick={() => handleActionClick(action.id)}
              isActive={selectedAction === action.id}
            >
              {action.label}
            </ActionChip>
          ))}
        </div>
      </div>

      {/* 선택된 액션에 따른 인사이트 */}
      {selectedAction && (
        <Surface tone="base" className="mt-4 p-4">
          <p className="text-sm text-foreground/80 mb-2">
            <span className="font-medium text-foreground">
              {actions.find((a) => a.id === selectedAction)?.label}
            </span>
            {" "}{t.dashboard.insights.for}
          </p>
          <p className="text-xs text-muted leading-relaxed">
            {selectedAction === "conversion" && t.dashboard.insights.conversion}
            {selectedAction === "retention" && t.dashboard.insights.retention}
            {selectedAction === "engagement" && t.dashboard.insights.engagement}
            {" "}
            <span className="text-success font-medium">+12.3%</span>{" "}
            {t.dashboard.insights.increased}
          </p>
        </Surface>
      )}

      {/* 차트 영역 */}
      <div className="mt-6">
        <div className="relative">
          <SparklineArea
            values={[40, 44, 52, 60, 66, 70, 76, 80]}
            height={128}
            className="rounded-lg"
            strokeClassName="stroke-primary"
            fillClassName="fill-primary/15"
          />
          <div className="absolute bottom-2 left-4 right-4 flex justify-between text-xs text-subtle">
            <span>{t.dashboard.chart.daysAgo7}</span>
            <span>{t.dashboard.chart.daysAgo5}</span>
            <span>{t.dashboard.chart.daysAgo3}</span>
            <span>{t.dashboard.chart.today}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

