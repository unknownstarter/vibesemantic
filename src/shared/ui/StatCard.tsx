import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/shared/lib/utils";
import { Card } from "@/shared/ui/Card";

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string;
  change: string;
  trend?: "positive" | "negative" | "neutral";
  isInteractive?: boolean;
}

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, label, value, change, trend = "neutral", isInteractive, ...props }, ref) => {
    const trendColors = {
      positive: "text-success",
      negative: "text-danger",
      neutral: "text-muted",
    };

    return (
      <Card
        ref={ref}
        variant="bento"
        className={cn(
          "p-4 transition-all",
          isInteractive && "cursor-pointer hover:border-border/30 hover:scale-[1.02]",
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs text-subtle uppercase tracking-wide">{label}</p>
          <span className={cn("text-xs font-medium", trendColors[trend])}>{change}</span>
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </Card>
    );
  }
);

StatCard.displayName = "StatCard";
