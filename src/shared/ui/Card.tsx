import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/shared/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bento" | "glow";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const baseStyles = "rounded-2xl border transition-all duration-300";
    
    const variants = {
      default: "border-white/10 bg-white/5 backdrop-blur-sm",
      bento: "border-white/10 bg-white/5 backdrop-blur-sm hover:border-white/20 hover:bg-white/10",
      glow: "border-white/10 bg-white/5 backdrop-blur-sm hover:border-white/20",
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

