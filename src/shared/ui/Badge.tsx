import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/shared/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "info";
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border";
    
    const variants = {
      default: "bg-surface/10 text-muted border-border/20",
      success: "bg-success/10 text-success border-success/30",
      warning: "bg-warning/10 text-warning border-warning/30",
      info: "bg-info/10 text-info border-info/30",
    };

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

