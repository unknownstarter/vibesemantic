import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/shared/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "info";
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium";
    
    const variants = {
      default: "bg-white/10 text-gray-300 border border-white/10",
      success: "bg-green-500/10 text-green-400 border border-green-500/20",
      warning: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
      info: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
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

