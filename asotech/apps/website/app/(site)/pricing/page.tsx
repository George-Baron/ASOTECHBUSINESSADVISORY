import { LinkButton, Card } from "@asotech/ui";
import { PageHero, Section, SectionHeading, Tick } from "../../../components/layout";

export const metadata = { title: "Pricing", description: "ASOTECH Inventory subscription plans and consulting engagements. Request a quote." };

const PLANS = [
  { name: "Starter", for: "Small businesses starting structured stock control", items: ["Products, barcodes and categories", "Warehouses and bin locations", "Stock movement ledger", "Basic stocktaking and reports"] },
  { name: "Professional", for: "Growing, multi-branch businesses", items: ["Everything in Starter", "Cycle counting and reconciliation", "Approval workflows", "Procurement, batch and expiry (FEFO)", "Team roles and audit log"] },
  { name: "Enterprise", for: "Larger organisations with specific requirements", items: ["Everything in Professional", "Integration support (ERP systems, POS, AppSheet)", "Custom onboarding and training", "Priority support options"] },
  { name: "Consulting + Software", for: "Organisations that want advisory and software together", items: ["Software subscription", "Consulting delivery by ASOTECH", "Implementation, data cleanup and training", "Client portal for reports and deliverables"] },
];

export default function Pricing() {
  return (
    <>
      <PageHero kicker="Pricing" title="Plans and engagements shaped around your business">Subscription prices and project fees are being finalised through business planning and market validation. We do not publish figures until they are confirmed.</PageHero>
      <Section tone="white">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <Card key={p.name} className="flex flex-col">
              <h2 className="text-xl font-extrabold text-navy">{p.name}</h2>
              <p className="mt-1 text-sm text-slate2">{p.for}</p>
              <p className="mt-4 text-lg font-extrabold text-navy">Pricing to be announced</p>
              <ul className="mt-4 space-y-2 text-sm">{p.items.map((i) => <Tick key={i}>{i}</Tick>)}</ul>
              <div className="mt-auto pt-6"><LinkButton href="/proposal" className="w-full">Request a quote</LinkButton></div>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-sm text-slate2">Plan inclusions are indicative and will be confirmed when plans launch.</p>
      </Section>
      <Section>
        <SectionHeading title="Consulting and development projects">Consulting, audit, ERP implementation and software development are quoted per project after we understand scope, size and timeline.</SectionHeading>
        <LinkButton href="/proposal" size="lg">Request a proposal</LinkButton>
      </Section>
    </>
  );
}
