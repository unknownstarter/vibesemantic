"use client";

import { useState } from "react";
import { Section } from "@/shared/ui/Section";
import { Container } from "@/shared/ui/Container";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Dialog } from "@/shared/ui/Dialog";
import { cn } from "@/shared/lib/utils";
import {
  PricingFormData,
  PlanType,
  BasicPlanData,
  PopularPlanData,
  PremiumPlanData,
} from "@/entities/pricing/types";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: PlanType;
  title: string;
  badge?: string;
  heading: string;
  price: string;
  originalPrice?: string;
  discountBanner?: string;
  features: PlanFeature[];
  buttonText: string;
  buttonVariant: "primary" | "secondary";
  highlighted?: boolean;
}

const plans: Plan[] = [
  {
    id: "basic",
    title: "기본",
    badge: "기본",
    heading: "출시 알림",
    price: "무료",
    features: [
      { text: "출시 시 알림 받기", included: true },
      { text: "Early Access 우선 초대", included: false },
    ],
    buttonText: "이메일 남기기",
    buttonVariant: "secondary",
  },
  {
    id: "popular",
    title: "인기",
    badge: "인기",
    heading: "Early Access 우선 초대",
    price: "25,000원",
    features: [
      { text: "출시 즉시 우선 초대", included: true },
      { text: "자연어 질문 50회 제공", included: true },
      { text: "자동 원인 분석", included: true },
      { text: "다음 액션 제안", included: true },
      { text: "기본 리포트 생성", included: true },
    ],
    buttonText: "전화번호 등록",
    buttonVariant: "primary",
  },
  {
    id: "premium",
    title: "추천",
    badge: "추천",
    heading: "평생 프리미엄",
    price: "평생 ₩69,000",
    originalPrice: "연 ₩250,000",
    discountBanner: "73% 할인 100명 한정",
    features: [
      { text: "출시 즉시 사용", included: true },
      { text: "모든 프리미엄 기능 평생 무료", included: true },
      { text: "자연어 질문 하루 최대 200회", included: true },
      { text: "고급 분석 기능 (트렌드 예측)", included: true },
      { text: "커스텀 리포트 & 공유", included: true },
      { text: "우선 지원 & 피드백 반영", included: true },
      { text: "창립 멤버 배지", included: true },
    ],
    buttonText: "지금 결제하기",
    buttonVariant: "primary",
    highlighted: true,
  },
];

function PricingModal({
  plan,
  isOpen,
  onClose,
  onSubmit,
}: {
  plan: Plan | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PricingFormData) => Promise<void>;
}) {
  const [formData, setFormData] = useState<
    Partial<BasicPlanData | PopularPlanData | PremiumPlanData>
  >({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (plan?.id === "basic") {
      const data = formData as Partial<BasicPlanData>;
      if (!data.email) {
        newErrors.email = "이메일을 입력해주세요.";
      }
    } else if (plan?.id === "popular") {
      const data = formData as Partial<PopularPlanData>;
      if (!data.phoneNumber) {
        newErrors.phoneNumber = "전화번호를 입력해주세요.";
      }
    } else if (plan?.id === "premium") {
      const data = formData as Partial<PremiumPlanData>;
      if (!data.email) newErrors.email = "이메일을 입력해주세요.";
      if (!data.phoneNumber) newErrors.phoneNumber = "전화번호를 입력해주세요.";
      if (!data.contactName) newErrors.contactName = "담당자 이름을 입력해주세요.";
      if (!data.companyName) newErrors.companyName = "회사명을 입력해주세요.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      // 플랜 타입에 맞는 데이터 구성
      let submitData: PricingFormData;
      if (plan?.id === "basic") {
        const data = formData as Partial<BasicPlanData>;
        submitData = {
          email: data.email!,
          planType: "basic",
        };
      } else if (plan?.id === "popular") {
        const data = formData as Partial<PopularPlanData>;
        submitData = {
          phoneNumber: data.phoneNumber!,
          planType: "popular",
        };
      } else {
        const data = formData as Partial<PremiumPlanData>;
        submitData = {
          email: data.email!,
          phoneNumber: data.phoneNumber!,
          contactName: data.contactName!,
          companyName: data.companyName!,
          planType: "premium",
        };
      }
      await onSubmit(submitData);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({});
      setErrors({});
      setIsSubmitted(false);
      onClose();
    }
  };

  if (!plan) return null;

  if (isSubmitted) {
    return (
      <Dialog isOpen={isOpen} onClose={handleClose} title="신청 완료">
        <div className="text-center py-8">
          <div className="mb-4 text-6xl">✓</div>
          <h3 className="text-xl font-bold text-white mb-2">신청이 완료되었습니다</h3>
          {plan.id === "premium" && (
            <p className="text-gray-400 mb-4">
              남겨주신 이메일로 별도 결제 안내를 드리겠습니다.
            </p>
          )}
          <p className="text-gray-400">감사합니다.</p>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title={plan.heading}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {plan.id === "basic" && (
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2 text-white">
              이메일 <span className="text-red-400">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={(formData as Partial<BasicPlanData>).email || ""}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value, planType: "basic" })
              }
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
              placeholder="your@email.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-400">{errors.email}</p>
            )}
          </div>
        )}

        {plan.id === "popular" && (
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium mb-2 text-white">
              전화번호 <span className="text-red-400">*</span>
            </label>
            <input
              id="phoneNumber"
              type="tel"
              value={(formData as Partial<PopularPlanData>).phoneNumber || ""}
              onChange={(e) =>
                setFormData({ ...formData, phoneNumber: e.target.value, planType: "popular" })
              }
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
              placeholder="010-1234-5678"
            />
            {errors.phoneNumber && (
              <p className="mt-1 text-sm text-red-400">{errors.phoneNumber}</p>
            )}
          </div>
        )}

        {plan.id === "premium" && (
          <>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-white">
                이메일 <span className="text-red-400">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={(formData as Partial<PremiumPlanData>).email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value, planType: "premium" })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
                placeholder="your@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email}</p>
              )}
            </div>
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium mb-2 text-white">
                전화번호 <span className="text-red-400">*</span>
              </label>
              <input
                id="phoneNumber"
                type="tel"
                value={(formData as Partial<PremiumPlanData>).phoneNumber || ""}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value, planType: "premium" })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
                placeholder="010-1234-5678"
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-400">{errors.phoneNumber}</p>
              )}
            </div>
            <div>
              <label htmlFor="contactName" className="block text-sm font-medium mb-2 text-white">
                담당자 이름 <span className="text-red-400">*</span>
              </label>
              <input
                id="contactName"
                type="text"
                value={(formData as Partial<PremiumPlanData>).contactName || ""}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value, planType: "premium" })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
                placeholder="홍길동"
              />
              {errors.contactName && (
                <p className="mt-1 text-sm text-red-400">{errors.contactName}</p>
              )}
            </div>
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium mb-2 text-white">
                회사명 <span className="text-red-400">*</span>
              </label>
              <input
                id="companyName"
                type="text"
                value={(formData as Partial<PremiumPlanData>).companyName || ""}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value, planType: "premium" })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
                placeholder="회사명"
              />
              {errors.companyName && (
                <p className="mt-1 text-sm text-red-400">{errors.companyName}</p>
              )}
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-400">
                남겨주신 이메일로 별도 결제 안내를 드리겠습니다.
              </p>
            </div>
          </>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            className="flex-1"
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            type="submit"
            variant={plan.buttonVariant}
            className="flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? "제출 중..." : "제출하기"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePlanClick = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: PricingFormData) => {
    const response = await fetch("/api/pricing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("제출에 실패했습니다.");
    }
  };

  return (
    <>
      <Section id="pricing" className="bg-gray-950/30">
        <Container size="xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Pricing
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              원하는 플랜을 선택하세요
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                variant="bento"
                className={cn(
                  "p-8 flex flex-col",
                  plan.highlighted && "border-yellow-500/50 bg-yellow-500/5"
                )}
              >
                <div className="mb-4">
                  <Badge
                    variant="info"
                    className="bg-orange-500/10 text-orange-400 border-orange-500/20"
                  >
                    {plan.badge || plan.title}
                  </Badge>
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">{plan.heading}</h3>

                <div className="mb-6">
                  {plan.originalPrice && (
                    <p className="text-sm text-gray-500 line-through mb-1">
                      {plan.originalPrice}
                    </p>
                  )}
                  <p className="text-3xl font-bold text-white">{plan.price}</p>
                  {plan.discountBanner && (
                    <div className="mt-2 inline-block bg-red-500/20 border border-red-500/50 rounded px-3 py-1">
                      <p className="text-xs text-red-400 font-medium">
                        {plan.discountBanner}
                      </p>
                    </div>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      {feature.included ? (
                        <svg
                          className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      )}
                      <span
                        className={cn(
                          "text-sm",
                          feature.included ? "text-gray-300" : "text-gray-500"
                        )}
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.buttonVariant}
                  size="lg"
                  className="w-full"
                  onClick={() => handlePlanClick(plan)}
                >
                  {plan.buttonText}
                </Button>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <PricingModal
        plan={selectedPlan}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}

