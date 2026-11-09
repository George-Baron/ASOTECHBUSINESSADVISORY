import Link from "next/link";
import { ARTICLES, AUTHOR } from "../../../lib/articles";
import { formatDate } from "@asotech/utilities";
import { PageHero, Section } from "../../../components/layout";

export const metadata = { title: "Insights", description: "Practical guides on stocktaking, reconciliation, FEFO and ERP readiness from ASOTECH Business Advisory." };

export default function Insights() {
  return (
    <>
      <PageHero kicker="Insights" title="Practical guidance for better stock, systems and controls" />
      <Section tone="white">
        <div className="grid gap-6 md:grid-cols-2">
          {ARTICLES.map((a) => (
            <article key={a.slug} className="flex flex-col rounded-xl border border-navy-100 bg-white p-6 shadow-card">
              <p className="text-xs font-semibold text-slate2">{formatDate(a.date)} · {a.readMinutes} min read · {AUTHOR}</p>
              <h2 className="mt-2 text-xl font-extrabold text-navy"><Link href={`/insights/${a.slug}`} className="hover:underline">{a.title}</Link></h2>
              <p className="mt-2 text-sm text-slate2">{a.summary}</p>
              <Link href={`/insights/${a.slug}`} className="mt-auto pt-4 text-sm font-bold text-navy underline">Read article</Link>
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}
