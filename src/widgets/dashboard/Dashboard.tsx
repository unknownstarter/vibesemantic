"use client";

import { useState } from "react";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { cn } from "@/shared/lib/utils";
import { useI18n } from "@/shared/lib/i18n/context";
import { clickButton } from "@/shared/lib/analytics";

interface MetricCardProps {
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  onClick?: () => void;
}

function MetricCard({ label, value, change, changeType, onClick }: MetricCardProps) {
  const changeColors = {
    positive: "text-green-400",
    negative: "text-red-400",
    neutral: "text-gray-400",
  };

  return (
    <Card
      variant="bento"
      className={cn(
        "p-4 cursor-pointer hover:border-white/20 transition-all",
        onClick && "hover:scale-[1.02]"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <span className={cn("text-xs font-medium", changeColors[changeType])}>
          {change}
        </span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </Card>
  );
}

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  active?: boolean;
}

function ActionButton({ label, onClick, active }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-lg text-sm font-medium transition-all",
        active
          ? "bg-white text-black"
          : "bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10"
      )}
    >
      {label}
    </button>
  );
}

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
    <Card variant="bento" className="p-6 border-white/10">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">{t.dashboard.title}</h3>
          <p className="text-sm text-gray-400">{t.dashboard.subtitle}</p>
        </div>
        <Badge variant="info" className="bg-green-500/10 text-green-400 border-green-500/20">
          {t.dashboard.live}
        </Badge>
      </div>

      {/* 메트릭 그리드 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.id}
            label={metric.label}
            value={metric.value}
            change={metric.change}
            changeType={metric.type}
            onClick={() => handleMetricClick(metric.id)}
          />
        ))}
      </div>

      {/* 액션 버튼 */}
      <div className="mb-6">
        <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">{t.dashboard.recommendedActions}</p>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <ActionButton
              key={action.id}
              label={action.label}
              onClick={() => handleActionClick(action.id)}
              active={selectedAction === action.id}
            />
          ))}
        </div>
      </div>

      {/* 선택된 액션에 따른 인사이트 */}
      {selectedAction && (
        <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
          <p className="text-sm text-gray-300 mb-2">
            <span className="font-medium text-white">
              {actions.find((a) => a.id === selectedAction)?.label}
            </span>
            {" "}{t.dashboard.insights.for}
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">
            {selectedAction === "conversion" && t.dashboard.insights.conversion}
            {selectedAction === "retention" && t.dashboard.insights.retention}
            {selectedAction === "engagement" && t.dashboard.insights.engagement}
            {" "}
            <span className="text-green-400 font-medium">+12.3%</span>{" "}
            {t.dashboard.insights.increased}
          </p>
        </div>
      )}

      {/* 차트 영역 */}
      <div className="mt-6">
        <div className="h-32 bg-black/40 rounded-lg p-4 relative overflow-hidden border border-white/5">
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" viewBox="0 0 240 120" preserveAspectRatio="none">
              {[20, 50, 80, 110].map((y) => (
                <line
                  key={y}
                  x1="20"
                  y1={y}
                  x2="220"
                  y2={y}
                  stroke="white"
                  strokeWidth="0.5"
                />
              ))}
            </svg>
          </div>
          <svg
            className="w-full h-full"
            viewBox="0 0 240 120"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="dashboardChart" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <polygon
              points="20,90 50,85 80,75 110,65 140,55 170,50 200,45 220,42 220,120 20,120"
              fill="url(#dashboardChart)"
            />
            <polyline
              points="20,90 50,85 80,75 110,65 140,55 170,50 200,45 220,42"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {[
              { x: 20, y: 90 },
              { x: 110, y: 65 },
              { x: 220, y: 42 },
            ].map((point, idx) => (
              <circle
                key={idx}
                cx={point.x}
                cy={point.y}
                r="3"
                fill="#22c55e"
                stroke="#0a0a0a"
                strokeWidth="1.5"
              />
            ))}
          </svg>
          <div className="absolute bottom-2 left-4 right-4 flex justify-between text-xs text-gray-600">
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

