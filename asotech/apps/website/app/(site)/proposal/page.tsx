import { Card } from "@asotech/ui";
import { ProposalForm } from "../../../components/forms";
import { PageHero, Section } from "../../../components/layout";

export const metadata = { title: "Request a proposal", description: "Describe your project and request a proposal from ASOTECH Business Advisory." };

export default async function Proposal({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string; service?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHero kicker="Proposal" title="Request a proposal">The more you tell us about scope and timing, the more useful our proposal will be.</PageHero>
      <Section tone="white"><div className="mx-auto max-w-3xl"><Card><ProposalForm status={sp} defaultService={sp.service} /></Card></div></Section>
    </>
  );
}
