import Link from "next/link";
import { getService, SERVICES, SERVICE_ALIASES } from "@asotech/business-logic";
import { LinkButton, Card } from "@asotech/ui";
import { PageHero, Section, SectionHeading, Tick } from "./layout";
import { PROCESS, REGULATED_NOTE } from "../lib/content";

const REGULATED = new Set(["startup-consulting", "accounting-consulting", "inventory-audit"]);

interface Opts { slug: string; titleOverride?: string; introOverride?: string; offeringFilter?: RegExp; routeSlug?: string }

function resolve(o: Opts) {
  const slug = SERVICE_ALIASES[o.slug] ?? o.slug;
  const s = getService(slug);
  if (!s) throw new Error(`Unknown service ${o.slug}`);
  return s;
}

export function serviceMetadata(slug: string, o: Partial<Opts> = {}) {
  const s = resolve({ slug });
  const title = o.titleOverride ?? s.title;
  return { title, description: o.introOverride ?? s.summary, alternates: { canonical: `/${o.routeSlug ?? s.slug}` } };
}

export function ServicePage(o: Opts) {
  const s = resolve(o);
  const title = o.titleOverride ?? s.title;
  const intro = o.introOverride ?? s.summary;
  const offerings = o.offeringFilter ? s.offerings.filter((x) => o.offeringFilter!.test(x)) : s.offerings;
  const related = SERVICES.filter((x) => x.category === s.category && x.slug !== s.slug).slice(0, 3);
  const q = encodeURIComponent(s.slug);
  return (
    <>
      <PageHero kicker={s.category} title={title}
        actions={<><LinkButton href={`/consultation?service=${q}`} size="lg">Request a consultation</LinkButton><LinkButton href={`/proposal?service=${q}`} variant="ghost" size="lg" className="!border-white/40 !text-white hover:!bg-white/10">Request a proposal</LinkButton></>}>
        {intro}
      </PageHero>

      <Section tone="white">
        <SectionHeading kicker="What we offer" title={`${title}: scope of services`}>Select the parts you need. Each engagement is scoped with you before work begins.</SectionHeading>
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {offerings.map((x) => <Tick key={x}>{x}</Tick>)}
        </ul>
      </Section>

      <Section>
        <SectionHeading kicker="Deliverables" title="What you receive" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {s.deliverables.map((d, i) => (
            <Card key={d} className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">{i + 1}</span>
              <p className="font-semibold text-navy">{d}</p>
            </Card>
          ))}
        </div>
        {REGULATED.has(s.slug) && <p className="mt-6 max-w-3xl rounded-lg border border-navy-100 bg-white p-4 text-sm text-slate2">{REGULATED_NOTE}</p>}
      </Section>

      <Section tone="white">
        <SectionHeading kicker="How we work" title="A clear process from first call to support" />
        <ol className="grid gap-4 md:grid-cols-4">
          {PROCESS.map((p) => (
            <li key={p.name} className="rounded-xl border border-navy-100 p-5">
              <p className="text-sm font-bold text-brand-orange">{p.step}</p>
              <h3 className="mt-1 text-lg font-extrabold text-navy">{p.name}</h3>
              <p className="mt-2 text-sm text-slate2">{p.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      {related.length > 0 && (
        <Section>
          <SectionHeading title="Related services" />
          <div className="grid gap-4 md:grid-cols-3">
            {related.map((r) => (
              <Link key={r.slug} href={`/${r.slug}`} className="group rounded-xl border border-navy-100 bg-white p-5 shadow-card transition hover:border-brand-orange">
                <h3 className="font-extrabold text-navy group-hover:underline">{r.title}</h3>
                <p className="mt-2 text-sm text-slate2">{r.summary}</p>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Section tone="navy">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-extrabold sm:text-3xl">Talk to us about {title.toLowerCase()}</h2>
            <p className="mt-2 text-white/80">Tell us about your business and we will suggest the right scope and next steps.</p>
          </div>
          <LinkButton href={`/consultation?service=${q}`} size="lg">Request a consultation</LinkButton>
        </div>
      </Section>
    </>
  );
}
