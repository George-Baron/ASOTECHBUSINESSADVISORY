import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, Card, DataTable, StatusBadge, Button, EmptyState } from "@asotech/ui";
import { formatDate, formatMoney, titleCase, cn } from "@asotech/utilities";
import { ctx, STAGES } from "../../../../lib/ctx";
import { decide } from "../../../../lib/actions";
import { Flash } from "../../../../lib/flash";

type Project = { id: string; name: string; description: string | null; stage: string; status: string; starts_on: string | null; target_date: string | null };
type Req = { id: string; title: string; priority: string; status: string };
type Milestone = { id: string; title: string; due_date: string | null; status: string };
type Deliv = { id: string; title: string; kind: string; status: string };
type Quote = { id: string; quote_number: string; total_amount: number; currency: string; status: string; valid_until: string | null };

function DecisionButtons({ entity, id, path, yes, no }: { entity: string; id: string; path: string; yes: string; no: string }) {
  return (
    <form action={decide} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="entity" value={entity} /><input type="hidden" name="id" value={id} /><input type="hidden" name="return_to" value={path} />
      <input name="note" placeholder="Optional note" aria-label="Optional note" className="w-40 rounded-lg border border-navy-200 px-2 py-1.5 text-sm" />
      <Button name="approve" value="true" size="sm">{yes}</Button>
      <Button name="approve" value="false" size="sm" variant="ghost">{no}</Button>
    </form>
  );
}

export default async function ProjectDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { sb, orgId } = await ctx();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: proj } = await sb.from("software_projects").select("id, name, description, stage, status, starts_on, target_date").eq("id", id).eq("organization_id", orgId).maybeSingle();
  if (!proj) notFound();
  const p = proj as Project;
  const [r, m, d, q] = await Promise.all([
    sb.from("project_requirements").select("id, title, priority, status").eq("software_project_id", id).eq("organization_id", orgId).order("created_at"),
    sb.from("project_milestones").select("id, title, due_date, status").eq("software_project_id", id).eq("organization_id", orgId).order("due_date", { nullsFirst: false }),
    sb.from("project_deliverables").select("id, title, kind, status").eq("software_project_id", id).eq("organization_id", orgId).order("created_at"),
    sb.from("quotations").select("id, quote_number, total_amount, currency, status, valid_until").eq("software_project_id", id).eq("organization_id", orgId).order("created_at"),
  ]);
  const reqs = (r.data ?? []) as Req[], miles = (m.data ?? []) as Milestone[], delivs = (d.data ?? []) as Deliv[], quotes = (q.data ?? []) as Quote[];
  const path = `/projects/${id}`;
  const idx = Math.max(0, STAGES.indexOf(p.stage as (typeof STAGES)[number]));
  const pct = Math.round(((idx + 1) / STAGES.length) * 100);
  return (
    <>
      <PageHeader title={p.name} description={p.description ?? undefined} actions={<Link className="text-sm font-semibold underline" href="/projects">All projects</Link>} />
      <Flash sp={sp} />
      <Card className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold text-navy">Stage: {titleCase(p.stage)}</span><StatusBadge status={p.status} /></div>
        <div className="h-2.5 overflow-hidden rounded-full bg-navy-50" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Project stage progress">
          <div className="h-full rounded-full bg-brand-orange" style={{ width: `${pct}%` }} />
        </div>
        <ol className="mt-3 grid grid-cols-3 gap-1 text-xs sm:grid-cols-6">
          {STAGES.map((s, i) => <li key={s} className={cn("rounded px-1.5 py-1 text-center", i <= idx ? "bg-navy text-white" : "bg-navy-50 text-slate2")}>{titleCase(s)}</li>)}
        </ol>
        <p className="mt-3 text-xs text-slate2">Started {formatDate(p.starts_on)} · Target {formatDate(p.target_date)}</p>
      </Card>

      <h2 className="mb-2 text-lg font-bold text-navy">Quotations</h2>
      <DataTable empty="No quotations have been issued." columns={[{ key: "n", header: "Number" }, { key: "t", header: "Total", align: "right" }, { key: "v", header: "Valid until" }, { key: "s", header: "Status" }, { key: "a", header: "Your response" }]}
        rows={quotes.map((x) => ({ n: x.quote_number, t: formatMoney(x.total_amount, x.currency), v: formatDate(x.valid_until), s: <StatusBadge status={x.status} />, a: x.status === "sent" ? <DecisionButtons entity="quotation" id={x.id} path={path} yes="Accept" no="Reject" /> : "–" }))} />

      <h2 className="mb-2 mt-8 text-lg font-bold text-navy">Milestones</h2>
      <DataTable empty="No milestones yet." columns={[{ key: "t", header: "Milestone" }, { key: "d", header: "Due" }, { key: "s", header: "Status" }, { key: "a", header: "Your response" }]}
        rows={miles.map((x) => ({ t: x.title, d: formatDate(x.due_date), s: <StatusBadge status={x.status} />, a: x.status === "done" ? <DecisionButtons entity="milestone" id={x.id} path={path} yes="Approve" no="Not yet" /> : "–" }))} />

      <h2 className="mb-2 mt-8 text-lg font-bold text-navy">Requirements</h2>
      <DataTable empty="No requirements recorded yet." columns={[{ key: "t", header: "Requirement" }, { key: "p", header: "Priority" }, { key: "s", header: "Status" }]}
        rows={reqs.map((x) => ({ t: x.title, p: titleCase(x.priority), s: <StatusBadge status={x.status} /> }))} />

      <h2 className="mb-2 mt-8 text-lg font-bold text-navy">Deliverables</h2>
      {delivs.length === 0 ? <EmptyState title="No deliverables published yet" /> : (
        <DataTable columns={[{ key: "t", header: "Deliverable" }, { key: "k", header: "Type" }, { key: "s", header: "Status" }, { key: "a", header: "Your response" }]}
          rows={delivs.map((x) => ({ t: x.title, k: titleCase(x.kind), s: <StatusBadge status={x.status} />, a: x.status === "in_review" ? <DecisionButtons entity="deliverable" id={x.id} path={path} yes="Approve" no="Request changes" /> : "–" }))} />
      )}
    </>
  );
}
