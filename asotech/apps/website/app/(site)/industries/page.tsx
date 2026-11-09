import { LinkButton } from "@asotech/ui";
import { PageHero, Section, Tick } from "../../../components/layout";
import { INDUSTRIES } from "../../../lib/content";

export const metadata = { title: "Industries", description: "How ASOTECH Business Advisory supports retail, pharmacy, supermarkets, warehousing, hospitality, manufacturing and institutions." };

export default function Industries() {
  return (
    <>
      <PageHero kicker="Industries" title="Sector-aware consulting and systems" actions={<LinkButton href="/consultation" size="lg">Request a consultation</LinkButton>}>
        Every sector has its own stock, approval and reporting realities. These are the areas where we most often help.
      </PageHero>
      <Section tone="white">
        <div className="grid gap-6 md:grid-cols-2">
          {INDUSTRIES.map((i) => (
            <article key={i.slug} id={i.slug} className="rounded-xl border border-navy-100 bg-white p-6 shadow-card">
              <h2 className="text-xl font-extrabold text-navy">{i.name}</h2>
              <p className="mt-2 text-sm text-slate2">{i.text}</p>
              <ul className="mt-4 space-y-2 text-sm">{i.help.map((h) => <Tick key={h}>{h}</Tick>)}</ul>
            </article>
          ))}
        </div>
        <p className="mt-8 text-sm text-slate2">Do not see your sector? Our methods apply wherever stock, purchasing, people and reporting need structure. <a href="/contact" className="font-semibold text-navy underline">Contact us</a>.</p>
      </Section>
    </>
  );
}
