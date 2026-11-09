import { LinkButton } from "@asotech/ui";
import { BRAND } from "@asotech/configuration";
import { PageHero, Section, SectionHeading } from "../../../components/layout";
import { BENEFITS } from "../../../lib/content";

export const metadata = { title: "About ASOTECH", description: "ASOTECH Business Advisory is a business consulting and technology solutions company helping businesses establish, organise, automate and improve operations." };

export default function About() {
  return (
    <>
      <PageHero kicker="About ASOTECH" title="A business consulting and technology company, built around control, accuracy and intelligence">
        {BRAND.strapline}.
      </PageHero>
      <Section tone="white">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading title="Who we are" />
            <p className="text-slate2">ASOTECH Business Advisory helps organisations establish, structure, automate and improve their operations. We combine professional consulting with modern digital products: business startup and management advisory, software product design and development, POS and inventory systems, ERP systems implementation, inventory audit and reconciliation, accounting and HR process design, and business automation.</p>
            <p className="mt-4 text-slate2">Our primary market is Nigeria, and our approach is designed to extend to international clients. We work with newly established businesses and with existing organisations that want better systems.</p>
          </div>
          <div>
            <SectionHeading title="Two directions, one team" />
            <div className="space-y-4">
              <div className="rounded-xl border border-navy-100 p-5"><h3 className="font-extrabold text-navy">Consulting services</h3><p className="mt-1 text-sm text-slate2">Advisory, implementation and managed services across business setup, processes, inventory, audit, accounting, HR, procurement, ERP and reporting.</p></div>
              <div className="rounded-xl border border-navy-100 p-5"><h3 className="font-extrabold text-navy">Technology solutions</h3><p className="mt-1 text-sm text-slate2">Software, websites, mobile apps, POS and inventory systems, integrations, automation and SaaS products.</p></div>
            </div>
          </div>
        </div>
      </Section>
      <Section>
        <SectionHeading kicker="Our principles" title="How we work" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => <div key={b.name}><h3 className="font-extrabold text-navy">{b.name}</h3><p className="mt-1 text-sm text-slate2">{b.text}</p></div>)}
        </div>
      </Section>
      <Section tone="white">
        <SectionHeading kicker="Integrity" title="Honest about what we have and have not done">We do not publish client names, results or testimonials until they are verified and approved. Integrations are described as live only when they have been verified in a client environment. Regulated legal, tax, audit and registration services are delivered through appropriately qualified professionals or authorised partners where required.</SectionHeading>
        <LinkButton href="/consultation">Talk to us</LinkButton>
      </Section>
    </>
  );
}
