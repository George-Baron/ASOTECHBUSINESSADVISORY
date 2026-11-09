import { Card } from "@asotech/ui";
import { ConsultationForm } from "../../../components/forms";
import { PageHero, Section } from "../../../components/layout";

export const metadata = { title: "Request a consultation", description: "Book a conversation with ASOTECH Business Advisory about consulting, software, inventory or ERP systems." };

export default async function Consultation({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string; service?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHero kicker="Consultation" title="Request a consultation">Tell us about your business and preferred time. We will get back to you to confirm.</PageHero>
      <Section tone="white"><div className="mx-auto max-w-3xl"><Card><ConsultationForm status={sp} defaultService={sp.service} /></Card></div></Section>
    </>
  );
}
