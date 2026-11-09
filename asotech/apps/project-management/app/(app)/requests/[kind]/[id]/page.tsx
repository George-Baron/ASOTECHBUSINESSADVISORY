import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, Card, LinkButton, PageHeader, Select, StatusBadge } from "@asotech/ui";
import { formatDate } from "@asotech/utilities";
import { staffCtx, isUuid } from "../../../../../lib/ctx";
import { REQUEST_KINDS, isRequestKind } from "../../../../../lib/data";
import { REQUEST_STATUSES } from "../../../../../lib/constants";
import { Flash } from "../../../../../lib/flash";
import { setRequestStatus } from "../../actions";

export const metadata = { title: "Request" };

const LABELS: Record<string, string> = { full_name: "Name", email: "Email", phone: "Phone", company: "Company", subject: "Subject", message: "Message", scope: "Scope", budget_range: "Budget", timeline: "Timeline", preferred_date: "Preferred date", preferred_time: "Preferred time", meeting_mode: "Meeting" };

export default async function RequestDetail({ params, searchParams }: { params: Promise<{ kind: string; id: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { kind, id } = await params;
  const sp = await searchParams;
  if (!isRequestKind(kind) || !isUuid(id)) return notFound();
  const { sb } = await staffCtx();
  const { data: r } = await sb.from(REQUEST_KINDS[kind].table).select("*").eq("id", id).maybeSingle();
  if (!r) return notFound();
  let service: string | null = null;
  if (r.service_id) { const { data } = await sb.from("service_catalogue").select("title").eq("id", r.service_id).maybeSingle(); service = data?.title ?? null; }
  return (
    <>
      <PageHeader title={`${REQUEST_KINDS[kind].label} request`} description={`From ${r.full_name} · ${formatDate(r.created_at, true)}`}
        actions={<><StatusBadge status={r.status} /><LinkButton href={`/clients?new=${encodeURIComponent(r.company ?? r.full_name)}&email=${encodeURIComponent(r.email)}`} size="sm" variant="secondary">Convert to client</LinkButton><Link className="text-sm font-semibold text-navy underline" href="/requests">Inbox</Link></>} />
      <Flash sp={sp} />
      <Card className="mb-6 max-w-3xl">
        <dl className="grid gap-4 sm:grid-cols-2 text-sm">
          {service && <div><dt className="text-xs font-semibold uppercase text-slate2">Service</dt><dd className="mt-1">{service}</dd></div>}
          {Object.entries(LABELS).filter(([k]) => r[k]).map(([k, label]) => (
            <div key={k} className={k === "message" || k === "scope" ? "sm:col-span-2" : ""}><dt className="text-xs font-semibold uppercase text-slate2">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{String(r[k])}</dd></div>
          ))}
        </dl>
      </Card>
      <Card className="max-w-md">
        <form action={setRequestStatus} className="flex items-end gap-3">
          <input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} />
          <div className="flex-1"><label htmlFor="status" className="mb-1 block text-sm font-semibold text-navy">Status</label><Select id="status" name="status" defaultValue={r.status}>{REQUEST_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select></div>
          <Button size="sm">Update</Button>
        </form>
      </Card>
    </>
  );
}
