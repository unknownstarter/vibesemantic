"use client";

import { Section } from "@/shared/ui/Section";
import { Container } from "@/shared/ui/Container";
import { Card } from "@/shared/ui/Card";
import { useI18n } from "@/shared/lib/i18n/context";
import { useSectionView } from "@/shared/lib/useSectionView";

export function Security() {
  const { t } = useI18n();
  const sectionRef = useSectionView("security");

  return (
    <Section id="security" ref={sectionRef}>
      <Container size="lg">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            {t.security.title}
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            {t.security.description}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {t.security.items.map((point, idx) => (
            <Card key={idx} variant="bento" className="p-8">
              <div className="flex items-start gap-4">
                <div className="text-3xl">{point.badge}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-3 text-foreground">
                    {point.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {point.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}

