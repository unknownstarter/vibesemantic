import { Section } from "@/shared/ui/Section";
import { Container } from "@/shared/ui/Container";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { cn } from "@/shared/lib/utils";

const features = [
  {
    title: "Connect",
    subtitle: "Read-only",
    description: "데이터베이스에 읽기 전용으로 안전하게 연결",
    demo: "🔒 Read-only",
  },
  {
    title: "Metric Catalog",
    description: "자동으로 지표를 인식하고 카탈로그화",
    demo: "📊 24 metrics",
  },
  {
    title: "Ask in Natural Language",
    description: "자연어로 질문하면 답을 찾아줍니다",
    demo: "💬 '리텐션 왜 떨어졌어?'",
  },
  {
    title: "Explain the Why",
    description: "지표 변화의 원인을 자동으로 분석",
    demo: "🔍 3 causes found",
  },
  {
    title: "Next Actions",
    description: "데이터 기반 다음 액션을 제안",
    demo: "✨ 5 suggestions",
  },
  {
    title: "Shareable Report",
    description: "인사이트를 리포트로 공유",
    demo: "📄 Export PDF",
  },
  {
    title: "Security",
    description: "엔터프라이즈급 보안과 권한 관리",
    demo: "🛡️ SOC 2",
  },
];

export function Bento() {
  return (
    <Section id="product">
      <Container size="xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            Features
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            SQL 없이도 데이터 인사이트를 얻을 수 있는 모든 기능
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <Card
              key={idx}
              variant="bento"
              className={cn(
                "p-6 hover:scale-[1.02] transition-transform",
                idx === 0 && "md:col-span-2",
                idx === 3 && "md:col-span-2"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-semibold text-foreground">
                  {feature.title}
                </h3>
                {feature.subtitle && (
                  <Badge variant="info">{feature.subtitle}</Badge>
                )}
              </div>
              <p className="text-gray-400 mb-4 text-sm leading-relaxed">
                {feature.description}
              </p>
              <div className="text-sm text-gray-400 font-mono">
                {feature.demo}
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}

