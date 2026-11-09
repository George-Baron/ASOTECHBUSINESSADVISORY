import Link from "next/link";
import { servicesByCategory, SERVICE_CATEGORIES } from "@asotech/business-logic";
import { LinkButton } from "@asotech/ui";
import { PageHero, Section, SectionHeading } from "../../../components/layout";

export const metadata = { title: "Services", description: "Business consulting, software development, POS and inventory systems, ERP, audit, accounting, HR and managed services from ASOTECH Business Advisory." };

export default function ServicesPage() {
  const groups = servicesByCategory();
  return (
    <>
      <PageHero kicker="Services" title="Everything you need to establish, run and improve your business"
        actions={<LinkButton href="/consultation" size="lg">Request a consultation</LinkButton>}>
        Consulting, software and systems under one roof, so your processes, people and technology work together.
      </PageHero>
      {SERVICE_CATEGORIES.map((c, i) => (
        <Section key={c} tone={i % 2 === 0 ? "light" : "white"}>
          <SectionHeading title={c} />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {groups[c].map((s) => (
              <Link key={s.slug} href={`/${s.slug}`} className="group flex flex-col rounded-xl border border-navy-100 bg-white p-6 shadow-card transition hover:border-brand-orange">
                <h3 className="text-lg font-extrabold text-navy group-hover:underline">{s.title}</h3>
                <p className="mt-2 text-sm text-slate2">{s.summary}</p>
                <span className="mt-auto pt-4 text-sm font-bold text-navy">View service →</span>
              </Link>
            ))}
          </div>
        </Section>
      ))}
    </>
  );
}
