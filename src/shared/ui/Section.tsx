import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/shared/lib/utils";

interface SectionProps extends HTMLAttributes<HTMLElement> {
  id?: string;
}

export const Section = forwardRef<HTMLElement, SectionProps>(
  ({ className, children, id, ...props }, ref) => {
    return (
      <section
        ref={ref}
        id={id}
        className={cn("py-24 md:py-32", className)}
        {...props}
      >
        {children}
      </section>
    );
  }
);

Section.displayName = "Section";

