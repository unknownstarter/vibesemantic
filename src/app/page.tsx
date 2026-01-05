import { Header } from "@/widgets/header/Header";
import { Footer } from "@/widgets/footer/Footer";
import { Hero } from "@/widgets/hero/Hero";
import { Problem } from "@/widgets/problem/Problem";
import { Bento } from "@/widgets/bento/Bento";
import { SuccessCase } from "@/widgets/success-case/SuccessCase";
import { HowItWorks } from "@/widgets/how-it-works/HowItWorks";
import { Security } from "@/widgets/security/Security";
import { FAQ } from "@/widgets/faq/FAQ";
import { LeadCaptureForm } from "@/features/lead-capture/ui/LeadCaptureForm";
import { Section } from "@/shared/ui/Section";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen">
      <Header />
      <main>
        <Hero />
        <Problem />
        <Bento />
        <SuccessCase />
        <HowItWorks />
        <Security />
        <FAQ />
        <Section id="apply" className="bg-gray-950/30">
          <LeadCaptureForm />
        </Section>
      </main>
      <Footer />
    </div>
  );
}

