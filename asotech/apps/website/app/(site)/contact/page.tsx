import { Card } from "@asotech/ui";
import { CONTACT } from "@asotech/configuration";
import { ContactForm } from "../../../components/forms";
import { PageHero, Section } from "../../../components/layout";

export const metadata = { title: "Contact", description: "Contact ASOTECH Business Advisory by email, phone or the contact form." };

export default async function Contact({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHero kicker="Contact" title="Let us know how we can help" />
      <Section tone="white">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <h2 className="text-xl font-extrabold text-navy">Contact details</h2>
            <ul className="space-y-3 text-sm text-navy">
              <li><span className="font-bold">Email:</span> <a className="underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></li>
              <li><span className="font-bold">Phone:</span> <a className="underline" href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}>{CONTACT.phone}</a></li>
              <li><span className="font-bold">Website:</span> {CONTACT.website}</li>
              <li><span className="font-bold">Based in:</span> {CONTACT.country}</li>
            </ul>
            <p className="text-sm text-slate2">For a scheduled conversation use <a className="font-semibold text-navy underline" href="/consultation">Request a consultation</a>; for a quotation use <a className="font-semibold text-navy underline" href="/proposal">Request a proposal</a>.</p>
          </div>
          <div className="lg:col-span-3"><Card><ContactForm status={sp} /></Card></div>
        </div>
      </Section>
    </>
  );
}
