import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/shared/lib/utils";

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  tone?: "base" | "raised" | "inset";
}

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, tone = "base", children, ...props }, ref) => {
    const tones = {
      base: "bg-surface/5 border border-border/10",
      raised: "bg-surface/10 border border-border/20 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.6)]",
      inset: "bg-surface-inset/70 border border-border/5",
    };

    return (
      <div ref={ref} className={cn("rounded-2xl", tones[tone], className)} {...props}>
        {children}
      </div>
    );
  }
);

Surface.displayName = "Surface";
