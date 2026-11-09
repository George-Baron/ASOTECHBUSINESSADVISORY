import { LinkButton, Card } from "@asotech/ui";
import { URLS } from "@asotech/configuration";
import { PageHero, Section } from "../../../components/layout";

export const metadata = { title: "Register", description: "Create an ASOTECH client portal or inventory account." };

export default function Register() {
  return (
    <>
      <PageHero kicker="Register" title="Create your ASOTECH account" />
      <Section tone="white">
        <div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-2">
          <Card><h2 className="text-lg font-extrabold text-navy">Client portal</h2><p className="mt-2 text-sm text-slate2">Register, then ask your ASOTECH contact to link your account to your organisation&apos;s projects.</p><div className="mt-5"><LinkButton href={`${URLS.portal}/register`}>Register for the portal</LinkButton></div></Card>
          <Card><h2 className="text-lg font-extrabold text-navy">ASOTECH Inventory</h2><p className="mt-2 text-sm text-slate2">Create an account and set up your organisation to start managing stock.</p><div className="mt-5"><LinkButton href={`${URLS.inventory}/register`}>Register for Inventory</LinkButton></div></Card>
        </div>
      </Section>
    </>
  );
}
