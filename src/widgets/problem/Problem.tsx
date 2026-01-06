"use client";

import { Section } from "@/shared/ui/Section";
import { Container } from "@/shared/ui/Container";
import { Card } from "@/shared/ui/Card";
import { useI18n } from "@/shared/lib/i18n/context";

export function Problem() {
  const { t } = useI18n();

  return (
    <Section id="problem" className="bg-gray-950/30">
      <Container size="lg">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            {t.problem.title}
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mt-4">
            {t.problem.description}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {t.problem.items.map((problem, idx) => (
            <Card key={idx} variant="bento" className="p-8">
              <h3 className="text-xl font-semibold mb-4 text-foreground">
                {problem.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {problem.description}
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}

