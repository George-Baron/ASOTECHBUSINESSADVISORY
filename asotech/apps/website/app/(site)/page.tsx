import Link from "next/link";
import { Card, LinkButton, Logo } from "@asotech/ui";
import { BRAND, CONTACT } from "@asotech/configuration";
import { getService } from "@asotech/business-logic";
import { ConsultationForm } from "../../components/ConsultationForm";
import { HeroArt } from "../../components/HeroArt";
import { Container, Section, SectionHeading, Tick } from "../../components/layout";
import { BENEFITS, INDUSTRIES, PROCESS, TECH } from "../../lib/content";

export const metadata = {
  title: { absolute: "ASOTECH Business Advisory | Consulting, Software & Inventory Systems" },
  description: "Business consulting, software design and development, POS and inventory systems, audit and reconciliation, accounting, HR and ERP systems for Nigerian businesses. Control. Accuracy. Intelligence.",
};

const GROUPS: Array<{ id: string; title: string; text: string; slugs: string[]; href: string }> = [
  { id: "consulting", title: "Business consulting", text: "Strategy, process improvement, KPIs and management reporting to help your business run better.", slugs: ["business-consulting", "procurement-supply-chain"], href: "/business-consulting" },
  { id: "software", title: "Software design & development", text: "Web, mobile and enterprise software, from product discovery and UX through build, test and support.", slugs: ["software-development", "website-development", "mobile-app-development"], href: "/software-development" },
  { id: "pos", title: "POS & inventory systems", text: "Move from manual stock control to a structured digital inventory and point-of-sale environment.", slugs: ["pos-inventory", "inventory-audit", "erp-solutions"], href: "/pos-inventory" },
  { id: "startup", title: "Business startup consulting", text: "Business model, structure, processes and systems for new companies, so you launch ready to operate.", slugs: ["startup-consulting"], href: "/startup-consulting" },
  { id: "admin", title: "Accounting, HR & administration", text: "Process design, systems and controls for finance, people and administration.", slugs: ["accounting-consulting", "hr-administration", "business-automation"], href: "/accounting-consulting" },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy-700 to-navy-500 text-white">
        <div aria-hidden className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-brand-orange/15 blur-3xl" />
        <Container className="relative grid items-center gap-10 py-16 sm:py-24 lg:grid-cols-2">
          <div>
            <p className="mb-4 text-sm font-semibold tracking-[0.22em] text-brand-orange">{BRAND.tagline.toUpperCase()}</p>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">Comprehensive business solutions for a smarter, more efficient business</h1>
            <p className="mt-5 max-w-xl text-lg text-white/85">ASOTECH Business Advisory combines consulting, software development, inventory management and business systems to help you establish, organise, automate and improve your operations.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/consultation" size="lg">Request a consultation</LinkButton>
              <LinkButton href="/services" variant="ghost" size="lg" className="!border-white/40 !text-white hover:!bg-white/10">Explore services</LinkButton>
            </div>
            <ul className="mt-8 grid gap-2 text-sm sm:grid-cols-2">
              {["Consulting & Advisory", "Software Design & Development", "Inventory Management", "Business Systems", "Operational Excellence"].map((x) => <Tick key={x} onDark>{x}</Tick>)}
            </ul>
          </div>
          <div className="flex justify-center lg:justify-end"><HeroArt /></div>
        </Container>
      </section>

      <Section tone="white">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-orange">About ASOTECH</p>
            <h2 className="text-3xl font-extrabold text-navy sm:text-4xl">From first idea to continuous improvement</h2>
          </div>
          <p className="text-lg text-slate2">We serve newly established businesses and organisations that want better systems. Our team combines professional consulting with modern digital products to help you set up properly, control stock and cash, automate routine work, and report with confidence. <Link href="/about" className="font-semibold text-navy underline">More about us</Link>.</p>
        </div>
      </Section>

      <Section>
        <SectionHeading kicker="What we do" title="Five ways we help your business" />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map((g) => (
            <Card key={g.id} className="flex flex-col">
              <h3 className="text-xl font-extrabold text-navy">{g.title}</h3>
              <p className="mt-2 text-sm text-slate2">{g.text}</p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {g.slugs.map((s) => <li key={s}><Link className="font-semibold text-navy hover:text-brand-orange hover:underline" href={`/${s}`}>{getService(s)?.title}</Link></li>)}
              </ul>
              <Link href={g.href} className="mt-auto pt-5 text-sm font-bold text-navy underline">Learn more</Link>
            </Card>
          ))}
        </div>
      </Section>

      <Section tone="white">
        <SectionHeading kicker="Industries" title="Experience across the sectors that depend on accurate stock and sound controls" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INDUSTRIES.slice(0, 4).map((i) => (
            <div key={i.slug} className="rounded-xl border border-navy-100 p-5">
              <h3 className="font-extrabold text-navy">{i.name}</h3>
              <p className="mt-2 text-sm text-slate2">{i.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-6"><Link href="/industries" className="font-bold text-navy underline">See all industries</Link></p>
      </Section>

      <Section>
        <SectionHeading kicker="Technology" title="Featured technology solutions">Integrations marked “Prepared” are built to be connected, and are only described as live once verified against a client environment.</SectionHeading>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TECH.map((t) => (
            <Card key={t.name}>
              <span className="rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-semibold text-navy-600">{t.tag}</span>
              <h3 className="mt-3 text-lg font-extrabold text-navy">{t.name}</h3>
              <p className="mt-2 text-sm text-slate2">{t.text}</p>
            </Card>
          ))}
        </div>
        <p className="mt-6"><Link href="/technology" className="font-bold text-navy underline">How we build and secure our software</Link></p>
      </Section>

      <Section tone="navy">
        <SectionHeading kicker="Our process" title="Discover. Design. Deliver. Support." onDark center />
        <ol className="grid gap-4 md:grid-cols-4">
          {PROCESS.map((p) => (
            <li key={p.name} className="rounded-xl border border-white/15 bg-white/5 p-5">
              <p className="text-sm font-bold text-brand-orange">{p.step}</p>
              <h3 className="mt-1 text-xl font-extrabold">{p.name}</h3>
              <p className="mt-2 text-sm text-white/80">{p.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="white">
        <SectionHeading kicker="Why ASOTECH" title="Benefits of working with us" />
        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.name}>
              <h3 className="flex items-center gap-2 font-extrabold text-navy"><span aria-hidden className="h-2 w-2 rounded-full bg-brand-orange" />{b.name}</h3>
              <p className="mt-1 text-sm text-slate2">{b.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="rounded-2xl border border-dashed border-navy-200 bg-white p-8 text-center">
          <h2 className="text-2xl font-extrabold text-navy">Case studies</h2>
          <p className="mx-auto mt-2 max-w-2xl text-slate2">We publish a case study only after the client has verified it and agreed to its publication. None are published yet. <Link href="/case-studies" className="font-semibold text-navy underline">See how case studies will appear</Link>.</p>
        </div>
      </Section>

      <Section id="consultation" tone="white">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <SectionHeading kicker="Get started" title="Request a consultation">Tell us a little about your business. We will respond to arrange a conversation.</SectionHeading>
            <ul className="space-y-3 text-sm text-navy">
              <li><span className="font-bold">Email:</span> <a className="underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></li>
              <li><span className="font-bold">Phone:</span> <a className="underline" href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}>{CONTACT.phone}</a></li>
              <li><span className="font-bold">Web:</span> {CONTACT.website}</li>
            </ul>
            <div className="mt-8 hidden lg:block"><Logo /></div>
          </div>
          <div className="lg:col-span-3"><Card><ConsultationForm status={sp} compact returnTo="/" /></Card></div>
        </div>
      </Section>
    </>
  );
}
