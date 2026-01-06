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
import { useI18n } from "@/shared/lib/i18n/context";

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
  const { t } = useI18n();
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
        newErrors.email = t.pricing.modal.errors.email;
      }
    } else if (plan?.id === "popular") {
      const data = formData as Partial<PopularPlanData>;
      if (!data.phoneNumber) {
        newErrors.phoneNumber = t.pricing.modal.errors.phoneNumber;
      }
    } else if (plan?.id === "premium") {
      const data = formData as Partial<PremiumPlanData>;
      if (!data.email) newErrors.email = t.pricing.modal.errors.email;
      if (!data.phoneNumber) newErrors.phoneNumber = t.pricing.modal.errors.phoneNumber;
      if (!data.contactName) newErrors.contactName = t.pricing.modal.errors.contactName;
      if (!data.companyName) newErrors.companyName = t.pricing.modal.errors.companyName;
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
      <Dialog isOpen={isOpen} onClose={handleClose} title={t.pricing.modal.success.title}>
        <div className="text-center py-8">
          <div className="mb-4 text-6xl">✓</div>
          <h3 className="text-xl font-bold text-white mb-2">{t.pricing.modal.success.message}</h3>
          {plan.id === "premium" && (
            <p className="text-gray-400 mb-4">
              {t.pricing.modal.success.premiumNote}
            </p>
          )}
          <p className="text-gray-400">{t.pricing.modal.success.thankYou}</p>
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
              {t.pricing.modal.email} <span className="text-red-400">{t.pricing.modal.required}</span>
            </label>
            <input
              id="email"
              type="email"
              value={(formData as Partial<BasicPlanData>).email || ""}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value, planType: "basic" })
              }
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
              placeholder={t.pricing.modal.placeholders.email}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-400">{errors.email}</p>
            )}
          </div>
        )}

        {plan.id === "popular" && (
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium mb-2 text-white">
              {t.pricing.modal.phoneNumber} <span className="text-red-400">{t.pricing.modal.required}</span>
            </label>
            <input
              id="phoneNumber"
              type="tel"
              value={(formData as Partial<PopularPlanData>).phoneNumber || ""}
              onChange={(e) =>
                setFormData({ ...formData, phoneNumber: e.target.value, planType: "popular" })
              }
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
              placeholder={t.pricing.modal.placeholders.phoneNumber}
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
                {t.pricing.modal.email} <span className="text-red-400">{t.pricing.modal.required}</span>
              </label>
              <input
                id="email"
                type="email"
                value={(formData as Partial<PremiumPlanData>).email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value, planType: "premium" })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
                placeholder={t.pricing.modal.placeholders.email}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email}</p>
              )}
            </div>
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium mb-2 text-white">
                {t.pricing.modal.phoneNumber} <span className="text-red-400">{t.pricing.modal.required}</span>
              </label>
              <input
                id="phoneNumber"
                type="tel"
                value={(formData as Partial<PremiumPlanData>).phoneNumber || ""}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value, planType: "premium" })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
                placeholder={t.pricing.modal.placeholders.phoneNumber}
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-400">{errors.phoneNumber}</p>
              )}
            </div>
            <div>
              <label htmlFor="contactName" className="block text-sm font-medium mb-2 text-white">
                {t.pricing.modal.contactName} <span className="text-red-400">{t.pricing.modal.required}</span>
              </label>
              <input
                id="contactName"
                type="text"
                value={(formData as Partial<PremiumPlanData>).contactName || ""}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value, planType: "premium" })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
                placeholder={t.pricing.modal.placeholders.contactName}
              />
              {errors.contactName && (
                <p className="mt-1 text-sm text-red-400">{errors.contactName}</p>
              )}
            </div>
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium mb-2 text-white">
                {t.pricing.modal.companyName} <span className="text-red-400">{t.pricing.modal.required}</span>
              </label>
              <input
                id="companyName"
                type="text"
                value={(formData as Partial<PremiumPlanData>).companyName || ""}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value, planType: "premium" })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
                placeholder={t.pricing.modal.placeholders.companyName}
              />
              {errors.companyName && (
                <p className="mt-1 text-sm text-red-400">{errors.companyName}</p>
              )}
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-400">
                {t.pricing.modal.premiumNote}
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
            {t.pricing.modal.cancel}
          </Button>
          <Button
            type="submit"
            variant={plan.buttonVariant}
            className="flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? t.pricing.modal.submitting : t.pricing.modal.submit}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function Pricing() {
  const { t } = useI18n();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const plans: Plan[] = [
    {
      id: "basic",
      title: t.pricing.plans.basic.title,
      badge: t.pricing.plans.basic.badge,
      heading: t.pricing.plans.basic.heading,
      price: t.pricing.plans.basic.price,
      features: [...t.pricing.plans.basic.features],
      buttonText: t.pricing.plans.basic.buttonText,
      buttonVariant: "secondary",
    },
    {
      id: "popular",
      title: t.pricing.plans.popular.title,
      badge: t.pricing.plans.popular.badge,
      heading: t.pricing.plans.popular.heading,
      price: t.pricing.plans.popular.price,
      features: [...t.pricing.plans.popular.features],
      buttonText: t.pricing.plans.popular.buttonText,
      buttonVariant: "primary",
    },
    {
      id: "premium",
      title: t.pricing.plans.premium.title,
      badge: t.pricing.plans.premium.badge,
      heading: t.pricing.plans.premium.heading,
      price: t.pricing.plans.premium.price,
      originalPrice: t.pricing.plans.premium.originalPrice,
      discountBanner: t.pricing.plans.premium.discountBanner,
      features: [...t.pricing.plans.premium.features],
      buttonText: t.pricing.plans.premium.buttonText,
      buttonVariant: "primary",
      highlighted: true,
    },
  ];

  const handlePlanClick = (plan: Plan) => {
    // popular 플랜은 모달 대신 최하단 폼으로 스크롤
    if (plan.id === "popular") {
      const target = document.querySelector("#apply");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
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
      throw new Error(t.pricing.modal.submit);
    }
  };

  return (
    <>
      <Section id="pricing" className="bg-gray-950/30">
        <Container size="xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              {t.pricing.title}
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              {t.pricing.description}
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

