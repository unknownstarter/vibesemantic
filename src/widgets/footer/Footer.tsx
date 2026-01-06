"use client";

import { Container } from "@/shared/ui/Container";
import { useI18n } from "@/shared/lib/i18n/context";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-white/10 py-12">
      <Container size="xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-gray-400 text-sm">
            <p>{t.footer.company}</p>
            <p className="mt-2">
              {t.footer.messageUs}{" "}
              <a
                href="mailto:hello@dropdown.xyz"
                className="text-foreground hover:text-white transition-colors underline"
              >
                hello@dropdown.xyz
              </a>
            </p>
          </div>
          <div className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Dropdown. {t.footer.copyright}
          </div>
        </div>
      </Container>
    </footer>
  );
}

