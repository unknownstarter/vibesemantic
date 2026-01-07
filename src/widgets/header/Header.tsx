"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/shared/ui/Button";
import { Container } from "@/shared/ui/Container";
import { LogoIcon } from "./LogoIcon";
import { cn } from "@/shared/lib/utils";
import { useI18n } from "@/shared/lib/i18n/context";
import { clickButton, changeLanguage } from "@/shared/lib/analytics";

function handleAnchorClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  e.preventDefault();
  const target = document.querySelector(href);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function Header() {
  const { t, language, setLanguage } = useI18n();
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { label: t.nav.product, href: "#product" },
    { label: t.nav.howItWorks, href: "#how" },
    { label: t.nav.security, href: "#security" },
    { label: t.nav.faq, href: "#faq" },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        languageMenuRef.current &&
        !languageMenuRef.current.contains(event.target as Node)
      ) {
        setIsLanguageMenuOpen(false);
      }
    }

    if (isLanguageMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isLanguageMenuOpen]);

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

          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  handleAnchorClick(e, item.href);
                  clickButton(`nav_${item.label}`, "header");
                }}
                className="text-sm text-gray-400 hover:text-foreground transition-colors"
                aria-label={`Navigate to ${item.label} section`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="relative" ref={languageMenuRef}>
              <button
                onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                className="text-sm text-gray-400 hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
                aria-label="Language selector"
              >
                {t.nav.language}
              </button>
              {isLanguageMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-gray-900 border border-white/10 rounded-lg shadow-lg overflow-hidden">
                  <button
                    onClick={() => {
                      setLanguage("ko");
                      setIsLanguageMenuOpen(false);
                      changeLanguage("ko");
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm transition-colors",
                      language === "ko"
                        ? "bg-white/10 text-white"
                        : "text-gray-400 hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    한국어
                  </button>
                  <button
                    onClick={() => {
                      setLanguage("en");
                      setIsLanguageMenuOpen(false);
                      changeLanguage("en");
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm transition-colors",
                      language === "en"
                        ? "bg-white/10 text-white"
                        : "text-gray-400 hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    English
                  </button>
                </div>
              )}
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const target = document.querySelector("#apply");
                if (target) {
                  target.scrollIntoView({ behavior: "smooth", block: "start" });
                }
                clickButton("early_access", "header");
              }}
            >
              {t.nav.earlyAccess}
            </Button>
          </div>
        </div>
      </Container>
    </header>
  );
}

