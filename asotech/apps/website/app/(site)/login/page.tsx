import { LinkButton, Card } from "@asotech/ui";
import { URLS } from "@asotech/configuration";
import { PageHero, Section } from "../../../components/layout";

export const metadata = { title: "Client login", description: "Sign in to the ASOTECH client portal or inventory application." };

export default function Login() {
  return (
    <>
      <PageHero kicker="Client login" title="Sign in to your ASOTECH account" />
      <Section tone="white">
        <div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-2">
          <Card><h2 className="text-lg font-extrabold text-navy">Client portal</h2><p className="mt-2 text-sm text-slate2">Follow projects, read reports and audit findings, and approve deliverables.</p><div className="mt-5"><LinkButton href={`${URLS.portal}/login`}>Open client portal</LinkButton></div></Card>
          <Card><h2 className="text-lg font-extrabold text-navy">ASOTECH Inventory</h2><p className="mt-2 text-sm text-slate2">Manage products, stock movements, stocktaking and reconciliation.</p><div className="mt-5"><LinkButton href={`${URLS.inventory}/login`}>Open inventory app</LinkButton></div></Card>
        </div>
      </Section>
    </>
  );
}
