export type PlanType = "basic" | "popular" | "premium";

export interface BasicPlanData {
  email: string;
  planType: "basic";
}

export interface PopularPlanData {
  phoneNumber: string;
  planType: "popular";
}

export interface PremiumPlanData {
  email: string;
  phoneNumber: string;
  contactName: string;
  companyName: string;
  planType: "premium";
}

export type PricingFormData = BasicPlanData | PopularPlanData | PremiumPlanData;

