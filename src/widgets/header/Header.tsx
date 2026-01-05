"use client";

import { Button } from "@/shared/ui/Button";
import { Container } from "@/shared/ui/Container";
import { LogoIcon } from "./LogoIcon";
import { cn } from "@/shared/lib/utils";

const navItems = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how" },
  { label: "Security", href: "#security" },
  { label: "FAQ", href: "#faq" },
];

function handleAnchorClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  e.preventDefault();
  const target = document.querySelector(href);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
      <Container size="xl">
        <div className="flex items-center justify-between h-16 md:h-20">
          <a
            href="/"
            className="flex items-center gap-3 text-xl md:text-2xl font-bold text-white"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <LogoIcon className="flex-shrink-0" />
            <span>Vibe Semantic</span>
          </a>

          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => handleAnchorClick(e, item.href)}
                className="text-sm text-gray-400 hover:text-foreground transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              const target = document.querySelector("#apply");
              if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
          >
            Early Access
          </Button>
        </div>
      </Container>
    </header>
  );
}

