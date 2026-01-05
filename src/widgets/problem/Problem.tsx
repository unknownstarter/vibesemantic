import { Section } from "@/shared/ui/Section";
import { Container } from "@/shared/ui/Container";
import { Card } from "@/shared/ui/Card";

const problems = [
  {
    title: "지표는 보이는데 해석이 없다",
    description:
      "숫자만 나열되어 있어서 무엇이 문제인지, 왜 변했는지 알 수 없습니다.",
  },
  {
    title: "SQL/쿼리 비용이 너무 크다",
    description:
      "매번 데이터팀에 요청하거나 복잡한 쿼리를 작성해야 합니다.",
  },
  {
    title: "데이터팀이 없거나 기다려야 한다",
    description:
      "작은 팀에서는 데이터 분석 인력이 없거나, 대기 시간이 길어집니다.",
  },
];

export function Problem() {
  return (
    <Section id="problem" className="bg-gray-950/30">
      <Container size="lg">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            이런 고민 있으신가요?
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mt-4">
            데이터 분석가가 없어도, SQL을 몰라도 제품 지표를 분석하고 의사결정할 수 있습니다.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((problem, idx) => (
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

