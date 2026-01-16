import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/shared/lib/utils";

interface ActionChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
}

export const ActionChip = forwardRef<HTMLButtonElement, ActionChipProps>(
  ({ className, isActive = false, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
          isActive
            ? "bg-primary text-background border-primary/30 shadow-[0_8px_18px_-12px_rgba(34,197,94,0.9)]"
            : "bg-surface/5 text-muted border-border/20 hover:bg-surface/10 hover:text-foreground",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

ActionChip.displayName = "ActionChip";
