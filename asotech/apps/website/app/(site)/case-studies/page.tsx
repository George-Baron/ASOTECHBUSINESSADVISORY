import { LinkButton } from "@asotech/ui";
import { PageHero, Section } from "../../../components/layout";

export const metadata = { title: "Case studies", description: "ASOTECH Business Advisory publishes case studies only when they have been verified by the client." };

export default function CaseStudies() {
  return (
    <>
      <PageHero kicker="Case studies" title="Verified results, when we have them" />
      <Section tone="white">
        <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-navy-200 p-8 text-center">
          <h2 className="text-2xl font-extrabold text-navy">No case studies published yet</h2>
          <p className="mt-3 text-slate2">We will publish a case study only after the client has confirmed the facts and agreed to publication. Each will describe the situation, what we did, what was delivered and the measured outcome, using real figures supplied and approved by the client.</p>
          <p className="mt-3 text-slate2">Until then, we would rather tell you what we can do than invent what we have done.</p>
          <div className="mt-6"><LinkButton href="/consultation">Discuss your project</LinkButton></div>
        </div>
      </Section>
    </>
  );
}
