import { notFound } from "next/navigation";
import { formatDate } from "@asotech/utilities";
import { LinkButton } from "@asotech/ui";
import { ARTICLES, AUTHOR, getArticle } from "../../../../lib/articles";
import { Container, Section } from "../../../../components/layout";

export function generateStaticParams() { return ARTICLES.map((a) => ({ slug: a.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const a = getArticle((await params).slug);
  return a ? { title: a.title, description: a.summary } : {};
}

export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const a = getArticle((await params).slug);
  if (!a) return notFound();
  return (
    <>
      <div className="bg-navy text-white">
        <Container className="py-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange">Insights</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold sm:text-4xl">{a.title}</h1>
          <p className="mt-3 text-sm text-white/75">{formatDate(a.date)} · {a.readMinutes} min read · {AUTHOR}</p>
        </Container>
      </div>
      <Section tone="white">
        <article className="mx-auto max-w-3xl space-y-4 text-base leading-relaxed text-navy">
          {a.body.map((b, i) => (
            <div key={i}>
              {b.h && <h2 className="mb-2 mt-6 text-xl font-extrabold">{b.h}</h2>}
              {b.p && <p className="text-slate2">{b.p}</p>}
              {b.list && <ul className="list-disc space-y-1.5 pl-6 text-slate2">{b.list.map((l) => <li key={l}>{l}</li>)}</ul>}
            </div>
          ))}
          <div className="mt-10 rounded-xl bg-cloud p-6">
            <p className="font-extrabold">Need help putting this into practice?</p>
            <div className="mt-3"><LinkButton href="/consultation">Request a consultation</LinkButton></div>
          </div>
        </article>
      </Section>
    </>
  );
}
