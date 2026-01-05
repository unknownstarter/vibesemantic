"use client";

import { useState, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface AccordionItemProps {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}

export function AccordionItem({ question, answer, defaultOpen = false }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-white/10">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-white/20 rounded-lg px-2 -mx-2"
        aria-expanded={isOpen}
      >
        <span className="text-lg font-medium text-white pr-8">{question}</span>
        <span
          className={cn(
            "text-2xl text-gray-400 transition-transform duration-200 flex-shrink-0",
            isOpen && "rotate-45"
          )}
        >
          +
        </span>
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="pb-6 text-gray-400 leading-relaxed">{answer}</div>
      </div>
    </div>
  );
}

interface AccordionProps extends HTMLAttributes<HTMLDivElement> {
  items: Array<{ question: string; answer: string }>;
}

export function Accordion({ items, className, ...props }: AccordionProps) {
  return (
    <div className={cn("space-y-0", className)} {...props}>
      {items.map((item, index) => (
        <AccordionItem key={index} question={item.question} answer={item.answer} />
      ))}
    </div>
  );
}

