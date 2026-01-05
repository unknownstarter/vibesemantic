import { Section } from "@/shared/ui/Section";
import { Container } from "@/shared/ui/Container";
import { Card } from "@/shared/ui/Card";

const steps = [
  {
    number: "01",
    title: "Connect",
    description: "Read-only 연결",
    detail:
      "데이터베이스에 읽기 전용으로 연결합니다. Supabase, BigQuery 등 주요 데이터베이스를 지원합니다.",
  },
  {
    number: "02",
    title: "Understand",
    description: "서비스 목적/목표 입력",
    detail:
      "서비스의 목적과 핵심 지표를 간단히 입력하면, Vibe Semantic이 자동으로 이해합니다.",
  },
  {
    number: "03",
    title: "Analyze & Suggest",
    description: "차트/인사이트/다음 액션",
    detail:
      "자연어로 질문하거나 자동 분석을 통해 지표 변화 원인과 다음 액션을 제안받습니다.",
  },
];

export function HowItWorks() {
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Vibe Semantic으로 데이터 분석 시작하기",
    description:
      "SQL 없이도 제품 지표를 분석하고 다음 액션을 제안받는 방법. PO, 창업가, 마케터를 위한 3단계 데이터 분석 프로세스.",
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: `${step.description}: ${step.detail}`,
    })),
    totalTime: "PT5M",
    tool: [
      {
        "@type": "HowToTool",
        name: "Vibe Semantic",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <Section id="how" className="bg-gray-950/30">
        <Container size="lg">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              How it works
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              3단계로 시작하는 데이터 인사이트. PO, 창업가, 마케터를 위한 간단한 데이터 분석 프로세스입니다.
            </p>
          </div>

          <div className="space-y-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative">
                {idx < steps.length - 1 && (
                  <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-white/10 hidden md:block"></div>
                )}
                <Card variant="bento" className="p-8 md:p-10">
                  <div className="flex gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-2xl font-bold text-white">
                        {step.number}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-semibold mb-2 text-white">
                        {step.title}
                      </h3>
                      <p className="text-gray-400 mb-4 font-medium">
                        {step.description}
                      </p>
                      <p className="text-gray-400 leading-relaxed">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
