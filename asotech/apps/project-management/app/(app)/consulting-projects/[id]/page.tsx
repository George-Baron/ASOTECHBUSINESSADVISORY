import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Card, DataTable, Field, Input, PageHeader, Select, StatusBadge, Textarea } from "@asotech/ui";
import { formatDate } from "@asotech/utilities";
import { staffCtx, isUuid } from "../../../../lib/ctx";
import { ACTION_STATUSES, FINDING_STATUSES, PROJECT_STATUSES, REPORT_TYPES, SEVERITIES } from "../../../../lib/constants";
import { signedUrls } from "../../../../lib/storage";
import { Flash } from "../../../../lib/flash";
import { addAction, addFinding, addReport, toggleReport, updateAction, updateConsulting, updateFinding } from "../actions";

export const metadata = { title: "Consulting project" };

const Pub = ({ on }: { on: boolean }) => <Badge tone={on ? "ok" : "neutral"}>{on ? "Visible to client" : "Internal draft"}</Badge>;

export default async function ConsultingDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) return notFound();
  const { sb } = await staffCtx();
  const { data: p } = await sb.from("consulting_projects").select("*").eq("id", id).maybeSingle();
  if (!p) return notFound();
  const [{ data: org }, { data: reports }, { data: findings }] = await Promise.all([
    sb.from("organizations").select("name").eq("id", p.organization_id).maybeSingle(),
    sb.from("client_reports").select("*").eq("consulting_project_id", id).order("created_at", { ascending: false }),
    sb.from("audit_findings").select("*").eq("consulting_project_id", id).order("created_at", { ascending: false }),
  ]);
  const fids = ((findings ?? []) as any[]).map((f) => f.id);
  const { data: actions } = fids.length ? await sb.from("corrective_actions").select("*").in("finding_id", fids).order("created_at") : { data: [] as any[] };
  const links = await signedUrls(sb, ((reports ?? []) as any[]).map((r) => r.storage_path));
  const hid = (extra?: Record<string, string>) => (<><input type="hidden" name="project_id" value={id} /><input type="hidden" name="organization_id" value={p.organization_id} />{extra && Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}</>);
  return (
    <>
      <PageHeader title={p.title} description={`${org?.name ?? "Client"}${p.starts_on ? ` · from ${formatDate(p.starts_on)}` : ""}`} actions={<><StatusBadge status={p.status} /><Link className="text-sm font-semibold text-navy underline" href="/consulting-projects">All projects</Link></>} />
      <Flash sp={sp} />
      <Card className="mb-8 max-w-3xl">
        <form action={updateConsulting} className="grid gap-4 sm:grid-cols-3 sm:items-end"><input type="hidden" name="id" value={id} />
          <div className="sm:col-span-3"><Field label="Summary" name="summary"><Textarea id="summary" name="summary" defaultValue={p.summary ?? ""} maxLength={2000} /></Field></div>
          <Field label="Status" name="status"><Select id="status" name="status" defaultValue={p.status}>{PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select></Field>
          <div><Button size="sm">Save</Button></div>
        </form>
      </Card>

      <h2 className="mb-3 text-lg font-bold text-navy">Reports</h2>
      <DataTable empty="No reports yet."
        columns={[{ key: "t", header: "Report" }, { key: "y", header: "Type" }, { key: "v", header: "Visibility" }, { key: "a", header: "" }]}
        rows={((reports ?? []) as any[]).map((r) => ({ t: r.storage_path && links.get(r.storage_path) ? <a className="font-semibold underline" href={links.get(r.storage_path)}>{r.title}</a> : r.title, y: r.report_type, v: <Pub on={r.is_published} />,
          a: <form action={toggleReport}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="project_id" value={id} /><input type="hidden" name="publish" value={r.is_published ? "0" : "1"} /><Button size="sm" variant="secondary">{r.is_published ? "Unpublish" : "Publish"}</Button></form> }))} />
      <Card className="mb-8 mt-4 max-w-3xl">
        <form action={addReport} encType="multipart/form-data" className="grid gap-4 sm:grid-cols-2">{hid()}
          <Field label="Report title" name="title"><Input id="title" name="title" required minLength={3} maxLength={160} /></Field>
          <Field label="Type" name="report_type"><Select id="report_type" name="report_type" defaultValue="general">{REPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
          <div className="sm:col-span-2"><Field label="File" name="file" hint="PDF, Office document or image. Stored privately."><Input id="file" name="file" type="file" /></Field></div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="publish" /> Publish to the client immediately</label>
          <div className="sm:col-span-2"><Button size="sm">Add report</Button></div>
        </form>
      </Card>

      <h2 className="mb-3 text-lg font-bold text-navy">Audit findings</h2>
      <div className="space-y-4">
        {((findings ?? []) as any[]).length === 0 && <p className="text-sm text-slate2">No findings recorded.</p>}
        {((findings ?? []) as any[]).map((f) => (
          <Card key={f.id}>
            <div className="flex flex-wrap items-center gap-2"><strong className="text-navy">{f.title}</strong><StatusBadge status={f.severity} /><Pub on={f.is_published} /></div>
            {f.description && <p className="mt-2 whitespace-pre-wrap text-sm">{f.description}</p>}
            <form action={updateFinding} className="mt-3 flex flex-wrap items-center gap-3">{hid({ id: f.id })}
              <Select name="status" aria-label="Finding status" defaultValue={f.status}>{FINDING_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="publish" defaultChecked={f.is_published} /> Visible to client</label>
              <Button size="sm" variant="secondary">Save</Button>
            </form>
            <div className="mt-4 border-t border-slate-200 pt-3">
              <h3 className="mb-2 text-sm font-bold text-navy">Corrective actions</h3>
              {((actions ?? []) as any[]).filter((a) => a.finding_id === f.id).map((a) => (
                <form key={a.id} action={updateAction} className="mb-2 flex flex-wrap items-center gap-3 text-sm">{hid({ id: a.id })}
                  <span className="min-w-[12rem] flex-1">{a.description}{a.owner_name ? ` (${a.owner_name})` : ""}{a.due_date ? ` · due ${formatDate(a.due_date)}` : ""}</span>
                  <Select name="status" aria-label="Action status" defaultValue={a.status}>{ACTION_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select>
                  <label className="flex items-center gap-1"><input type="checkbox" name="publish" defaultChecked={a.is_published} /> Client</label>
                  <Button size="sm" variant="secondary">Save</Button>
                </form>
              ))}
              <form action={addAction} className="mt-2 grid gap-2 sm:grid-cols-4 sm:items-end">{hid({ finding_id: f.id })}
                <div className="sm:col-span-2"><Input name="description" aria-label="Action description" placeholder="New corrective action" required minLength={3} maxLength={500} /></div>
                <Input name="owner_name" aria-label="Owner" placeholder="Owner" maxLength={120} /><Input name="due_date" type="date" aria-label="Due date" />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="publish" /> Visible to client</label><div><Button size="sm">Add action</Button></div>
              </form>
            </div>
          </Card>
        ))}
      </div>
      <Card className="mb-8 mt-4 max-w-3xl">
        <form action={addFinding} className="grid gap-4 sm:grid-cols-2">{hid()}
          <Field label="Finding title" name="title"><Input id="f_title" name="title" required minLength={3} maxLength={160} /></Field>
          <Field label="Severity" name="severity"><Select id="severity" name="severity" defaultValue="medium">{SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
          <div className="sm:col-span-2"><Field label="Description" name="description"><Textarea id="f_desc" name="description" maxLength={4000} /></Field></div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="publish" /> Visible to the client</label>
          <div className="sm:col-span-2"><Button size="sm">Add finding</Button></div>
        </form>
      </Card>
    </>
  );
}
