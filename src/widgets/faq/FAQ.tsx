import { Section } from "@/shared/ui/Section";
import { Container } from "@/shared/ui/Container";
import { Accordion } from "@/shared/ui/Accordion";

const faqItems = [
  {
    question: "정말 SQL 없이도 가능한가요?",
    answer:
      "네, 가능합니다. Vibe Semantic은 자연어 질문을 이해하고 자동으로 쿼리를 생성합니다. 복잡한 SQL 지식 없이도 데이터 인사이트를 얻을 수 있습니다. 예를 들어 '지난 7일 리텐션이 왜 떨어졌어?'와 같은 자연어 질문으로 데이터를 분석할 수 있습니다.",
  },
  {
    question: "데이터를 저장하나요?",
    answer:
      "아니요, Vibe Semantic은 데이터를 저장하지 않습니다. 읽기 전용으로 연결하여 쿼리 결과만 일시적으로 처리하며, 원본 데이터는 그대로 유지됩니다. 모든 데이터는 사용자의 데이터베이스에만 저장되며, Vibe Semantic은 분석 결과만 제공합니다.",
  },
  {
    question: "Supabase/BigQuery 둘 다 되나요?",
    answer:
      "네, Supabase와 BigQuery를 모두 지원합니다. 읽기 전용 연결을 통해 안전하게 데이터에 접근하며, 추후 더 많은 데이터베이스를 지원할 예정입니다. 현재는 PostgreSQL 기반 데이터베이스와 BigQuery를 지원합니다.",
  },
  {
    question: "오픈 일정은 어떻게 되나요?",
    answer:
      "2026년 1월 Private Preview를 시작합니다. Early Access 신청을 통해 소수의 서비스 운영자와 함께 테스트하며 개선해 나갈 예정입니다. 정식 출시는 2026년 상반기 중 예정되어 있습니다.",
  },
  {
    question: "가격은 어떻게 되나요?",
    answer:
      "Private Preview 기간 동안은 무료로 제공됩니다. 정식 출시 후 가격 정책은 추후 공개될 예정입니다. Early Access 신청자에게는 특별 가격 혜택이 제공될 예정입니다.",
  },
  {
    question: "데이터 분석가가 없어도 사용할 수 있나요?",
    answer:
      "네, 맞습니다. Vibe Semantic은 PO, 창업가, 마케터 등 데이터 분석 전문 지식이 없는 사용자도 쉽게 사용할 수 있도록 설계되었습니다. 자연어로 질문하면 자동으로 분석 결과와 인사이트를 제공합니다.",
  },
  {
    question: "어떤 지표를 분석할 수 있나요?",
    answer:
      "DAU(일일 활성 사용자), 리텐션, 전환율, 클릭률(CTR), 구매 전환율(CVR), 장바구니 추가율 등 다양한 제품 지표를 분석할 수 있습니다. 서비스의 목적과 핵심 지표를 입력하면 자동으로 관련 지표를 추적하고 분석합니다.",
  },
  {
    question: "보안은 어떻게 보장되나요?",
    answer:
      "Vibe Semantic은 읽기 전용 연결만 사용하며, 데이터를 저장하지 않습니다. 또한 Allowlist를 통해 특정 스키마나 뷰에만 접근할 수 있도록 제한할 수 있으며, 쿼리 제한 및 타임아웃 설정을 통해 보안을 강화합니다.",
  },
];

export function FAQ() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
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
    </>
  );
}
