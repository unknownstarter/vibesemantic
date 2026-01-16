import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/shared/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bento" | "glow";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const baseStyles = "rounded-2xl border border-border/10 transition-all duration-300";
    
    const variants = {
      default: "bg-surface/5 backdrop-blur-sm",
      bento: "bg-surface/5 backdrop-blur-sm hover:border-border/30 hover:bg-surface/10",
      glow: "bg-surface/5 backdrop-blur-sm hover:border-border/30",
    };

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

