import { HTMLAttributes, useMemo } from "react";
import { cn } from "@/shared/lib/utils";

interface SparklineAreaProps extends HTMLAttributes<HTMLDivElement> {
  values: number[];
  height?: number;
  strokeClassName?: string;
  fillClassName?: string;
}

export function SparklineArea({
  values,
  height = 96,
  strokeClassName = "stroke-primary",
  fillClassName = "fill-primary/20",
  className,
  ...props
}: SparklineAreaProps) {
  const { polylinePoints, polygonPoints } = useMemo(() => {
    if (values.length < 2) {
      return { polylinePoints: "", polygonPoints: "" };
    }

    const width = 100;
    const chartHeight = 40;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = values.map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = chartHeight - ((value - min) / range) * chartHeight;
      return `${x},${y}`;
    });

    return {
      polylinePoints: points.join(" "),
      polygonPoints: `${points.join(" ")} ${width},${chartHeight} 0,${chartHeight}`,
    };
  }, [values]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-surface-inset/70 border border-border/5",
        className
      )}
      style={{ height }}
      {...props}
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 40" preserveAspectRatio="none">
        <polygon points={polygonPoints} className={fillClassName} />
        <polyline
          points={polylinePoints}
          className={cn("fill-none stroke-[1.8]", strokeClassName)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="absolute inset-0 opacity-10">
        <svg className="h-full w-full" viewBox="0 0 100 40" preserveAspectRatio="none">
          {[8, 16, 24, 32].map((y) => (
            <line
              key={y}
              x1="4"
              y1={y}
              x2="96"
              y2={y}
              className="stroke-border/40"
              strokeWidth="0.5"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
