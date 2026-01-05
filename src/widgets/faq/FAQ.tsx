import { Section } from "@/shared/ui/Section";
import { Container } from "@/shared/ui/Container";
import { Accordion } from "@/shared/ui/Accordion";

const faqItems = [
  {
    question: "정말 SQL 없이도 가능한가요?",
    answer:
      "네, 가능합니다. Vibe Semantic은 자연어 질문을 이해하고 자동으로 쿼리를 생성합니다. 복잡한 SQL 지식 없이도 데이터 인사이트를 얻을 수 있습니다.",
  },
  {
    question: "데이터를 저장하나요?",
    answer:
      "아니요, Vibe Semantic은 데이터를 저장하지 않습니다. 읽기 전용으로 연결하여 쿼리 결과만 일시적으로 처리하며, 원본 데이터는 그대로 유지됩니다.",
  },
  {
    question: "Supabase/BigQuery 둘 다 되나요?",
    answer:
      "네, Supabase와 BigQuery를 모두 지원합니다. 추후 더 많은 데이터베이스를 지원할 예정입니다.",
  },
  {
    question: "오픈 일정은 어떻게 되나요?",
    answer:
      "2026년 1월 Private Preview를 시작합니다. Early Access 신청을 통해 소수의 서비스 운영자와 함께 테스트하며 개선해 나갈 예정입니다.",
  },
  {
    question: "가격은 어떻게 되나요?",
    answer:
      "Private Preview 기간 동안은 무료로 제공됩니다. 정식 출시 후 가격 정책은 추후 공개될 예정입니다.",
  },
];

export function FAQ() {
  return (
    <Section id="faq" className="bg-gray-950/30">
      <Container size="md">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">FAQ</h2>
          <p className="text-lg text-gray-400">
            자주 묻는 질문들
          </p>
        </div>

        <Accordion items={faqItems} />
      </Container>
    </Section>
  );
}

