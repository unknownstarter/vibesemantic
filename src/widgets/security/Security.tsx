import { Section } from "@/shared/ui/Section";
import { Container } from "@/shared/ui/Container";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";

const securityPoints = [
  {
    title: "Read-only access",
    description:
      "데이터베이스에 읽기 전용으로만 연결합니다. 데이터 수정이나 삭제는 불가능합니다.",
    badge: "🔒",
  },
  {
    title: "Allowlist",
    description:
      "analytics schema/view만 접근 가능하도록 제한합니다. 민감한 데이터는 접근하지 않습니다.",
    badge: "📋",
  },
  {
    title: "Query limit/timeout",
    description:
      "쿼리 실행 시간과 리소스 사용량을 제한하여 데이터베이스 부하를 방지합니다.",
    badge: "⏱️",
  },
  {
    title: "PII 최소화 가이드",
    description:
      "개인정보 식별 가능 데이터(PII)는 최소화하고, 필요시 익명화 처리를 안내합니다.",
    badge: "🛡️",
  },
];

export function Security() {
  return (
    <Section id="security">
      <Container size="lg">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            Security & Trust
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            데이터 보안은 최우선입니다
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {securityPoints.map((point, idx) => (
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

