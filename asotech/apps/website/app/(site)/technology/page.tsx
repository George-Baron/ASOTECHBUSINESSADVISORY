import { PageHero, Section, SectionHeading, Tick } from "../../../components/layout";
import { TECH } from "../../../lib/content";
import { Alert, Card } from "@asotech/ui";

export const metadata = { title: "Technology", description: "The technology and security approach behind ASOTECH software: Next.js, Supabase, PostgreSQL, row-level security, and prepared ERP, POS and AppSheet integrations." };

const STACK = [
  ["Web applications", "Next.js, React and TypeScript with Tailwind CSS for fast, accessible interfaces."],
  ["Database", "PostgreSQL on Supabase with multi-tenant design, referential integrity and indexes."],
  ["Authentication", "Supabase Auth with role-based access control and secure session handling."],
  ["File storage", "Private Supabase Storage buckets with organisation-scoped access rules."],
  ["Mobile stocktaking", "AppSheet barcode capture connected to the central count and reconciliation workflow."],
  ["Payments", "Paystack for subscription billing, subject to business account approval."],
];

export default function Technology() {
  return (
    <>
      <PageHero kicker="Technology" title="Modern, secure, and honest about what is live">Our platform is built to keep each client&apos;s data separate, every stock movement traceable, and every integration verified before we call it active.</PageHero>
      <Section tone="white">
        <SectionHeading title="Our stack" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {STACK.map(([n, t]) => <Card key={n}><h3 className="font-extrabold text-navy">{n}</h3><p className="mt-1 text-sm text-slate2">{t}</p></Card>)}
        </div>
      </Section>
      <Section>
        <SectionHeading kicker="Solutions" title="What we build" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {TECH.map((t) => <Card key={t.name}><span className="rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-semibold text-navy-600">{t.tag}</span><h3 className="mt-3 font-extrabold text-navy">{t.name}</h3><p className="mt-1 text-sm text-slate2">{t.text}</p></Card>)}
        </div>
        <div className="mt-8"><Alert tone="info" title="Integration status">ERP systems, POS, AppSheet and Paystack integrations are prepared in our architecture. We describe an integration as active only after technical access has been verified with the client&apos;s environment.</Alert></div>
      </Section>
      <Section tone="white">
        <SectionHeading kicker="Security" title="Security by design" />
        <ul className="grid gap-3 sm:grid-cols-2">
          {["Tenant isolation using row-level security in the database", "Role-based access control for every organisation", "Immutable stock movement ledger with audit trails", "Approval workflows that prevent self-approval", "Input and file-upload validation", "Server-side secrets; credentials are never exposed to the browser", "Idempotent integration events to prevent duplicate postings", "Backup, recovery and data-retention planning"].map((x) => <Tick key={x}>{x}</Tick>)}
        </ul>
      </Section>
    </>
  );
}
