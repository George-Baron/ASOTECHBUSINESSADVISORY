import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Card, DataTable, Field, Input, LinkButton, PageHeader, Select, StatusBadge, Textarea } from "@asotech/ui";
import { formatDate, formatMoney } from "@asotech/utilities";
import { staffCtx, isUuid, staffUsers } from "../../../../lib/ctx";
import { DELIVERABLE_KINDS, MILESTONE_STAFF_STATUSES, PROJECT_STATUSES, REQ_PRIORITIES, REQ_STATUSES, STAGES, TASK_STATUSES } from "../../../../lib/constants";
import { signedUrls } from "../../../../lib/storage";
import { Flash } from "../../../../lib/flash";
import { addDeliverable, addMilestone, addRequirement, addTask, moveTask, setDeliverable, setMilestoneStatus, setRequirementStatus, updateSoftware } from "../actions";

export const metadata = { title: "Software project" };

export default async function SoftwareDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) return notFound();
  const { sb, session } = await staffCtx();
  const { data: p } = await sb.from("software_projects").select("*").eq("id", id).maybeSingle();
  if (!p) return notFound();
  const q = (t: string) => sb.from(t).select("*").eq("software_project_id", id).order("created_at");
  const [{ data: org }, { data: reqs }, { data: ms }, { data: dels }, { data: tasks }, { data: quotes }, team] = await Promise.all([
    sb.from("organizations").select("name").eq("id", p.organization_id).maybeSingle(),
    q("project_requirements"), sb.from("project_milestones").select("*").eq("software_project_id", id).order("due_date"), q("project_deliverables"), q("project_tasks"),
    sb.from("quotations").select("id, quote_number, status, total_amount, currency").eq("software_project_id", id).order("created_at", { ascending: false }),
    staffUsers(session),
  ]);
  const links = await signedUrls(sb, ((dels ?? []) as any[]).map((d) => d.storage_path));
  const names = new Map(team.map((u) => [u.id, u.name]));
  const msTitle = new Map(((ms ?? []) as any[]).map((m) => [m.id, m.title]));
  const hid = (extra?: Record<string, string>) => (<><input type="hidden" name="project_id" value={id} /><input type="hidden" name="organization_id" value={p.organization_id} />{extra && Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}</>);
  const H = ({ children }: { children: string }) => <h2 className="mb-3 mt-10 text-lg font-bold text-navy">{children}</h2>;
  return (
    <>
      <PageHeader title={p.name} description={`${org?.name ?? "Client"} · stage: ${p.stage}`} actions={<><StatusBadge status={p.status} /><LinkButton href={`/quotations?project=${id}&org=${p.organization_id}`} size="sm" variant="secondary">New quotation</LinkButton><Link className="text-sm font-semibold text-navy underline" href="/software-projects">All projects</Link></>} />
      <Flash sp={sp} />
      <Card className="max-w-3xl">
        <form action={updateSoftware} className="grid gap-4 sm:grid-cols-3">{hid()}
          <div className="sm:col-span-3"><Field label="Description" name="description"><Textarea id="description" name="description" defaultValue={p.description ?? ""} maxLength={4000} /></Field></div>
          <Field label="Stage" name="stage"><Select id="stage" name="stage" defaultValue={p.stage}>{STAGES.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
          <Field label="Status" name="status"><Select id="status" name="status" defaultValue={p.status}>{PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select></Field>
          <Field label="Target date" name="target_date"><Input id="target_date" name="target_date" type="date" defaultValue={p.target_date ?? ""} /></Field>
          <div className="sm:col-span-3"><Button size="sm">Save</Button></div>
        </form>
      </Card>

      <H>Requirements</H>
      <DataTable empty="No requirements captured yet."
        columns={[{ key: "t", header: "Requirement" }, { key: "p", header: "Priority" }, { key: "s", header: "Status" }]}
        rows={((reqs ?? []) as any[]).map((r) => ({ t: <><strong>{r.title}</strong>{r.description && <p className="text-xs text-slate2">{r.description}</p>}</>, p: <StatusBadge status={r.priority} />,
          s: <form action={setRequirementStatus} className="flex gap-2">{hid({ id: r.id })}<Select name="status" aria-label="Requirement status" defaultValue={r.status}>{REQ_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select><Button size="sm" variant="secondary">Save</Button></form> }))} />
      <Card className="mt-4 max-w-3xl"><form action={addRequirement} className="grid gap-3 sm:grid-cols-3 sm:items-end">{hid()}
        <div className="sm:col-span-2"><Field label="New requirement" name="title"><Input id="r_title" name="title" required minLength={3} maxLength={160} /></Field></div>
        <Field label="Priority" name="priority"><Select id="priority" name="priority" defaultValue="medium">{REQ_PRIORITIES.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
        <div className="sm:col-span-3"><Field label="Detail" name="description"><Textarea id="r_desc" name="description" maxLength={2000} className="min-h-[70px]" /></Field></div>
        <div><Button size="sm">Add requirement</Button></div></form></Card>

      <H>Milestones</H>
      <DataTable empty="No milestones yet."
        columns={[{ key: "t", header: "Milestone" }, { key: "d", header: "Due" }, { key: "s", header: "Status" }]}
        rows={((ms ?? []) as any[]).map((m) => ({ t: m.title, d: m.due_date ? formatDate(m.due_date) : "–",
          s: m.status === "approved" ? <Badge tone="ok">Approved by client</Badge> : <form action={setMilestoneStatus} className="flex gap-2">{hid({ id: m.id })}<Select name="status" aria-label="Milestone status" defaultValue={m.status}>{MILESTONE_STAFF_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select><Button size="sm" variant="secondary">Save</Button></form> }))} />
      <Card className="mt-4 max-w-3xl"><form action={addMilestone} className="grid gap-3 sm:grid-cols-3 sm:items-end">{hid()}
        <div className="sm:col-span-2"><Field label="New milestone" name="title"><Input id="m_title" name="title" required minLength={3} maxLength={160} /></Field></div>
        <Field label="Due date" name="due_date"><Input id="m_due" name="due_date" type="date" /></Field>
        <div><Button size="sm">Add milestone</Button></div></form></Card>

      <H>Deliverables</H>
      <DataTable empty="No deliverables yet."
        columns={[{ key: "t", header: "Deliverable" }, { key: "k", header: "Kind" }, { key: "s", header: "Status" }, { key: "a", header: "" }]}
        rows={((dels ?? []) as any[]).map((d) => ({ t: <>{d.storage_path && links.get(d.storage_path) ? <a className="font-semibold underline" href={links.get(d.storage_path)}>{d.title}</a> : d.title}{d.milestone_id && <p className="text-xs text-slate2">{msTitle.get(d.milestone_id)}</p>}</>, k: d.kind, s: <StatusBadge status={d.status} />,
          a: d.status === "approved" ? <Badge tone="ok">Locked</Badge> : <form action={setDeliverable}>{hid({ id: d.id, publish: d.is_published ? "0" : "1" })}<Button size="sm" variant="secondary">{d.is_published ? "Withdraw" : "Send for review"}</Button></form> }))} />
      <Card className="mt-4 max-w-3xl"><form action={addDeliverable} encType="multipart/form-data" className="grid gap-3 sm:grid-cols-2">{hid()}
        <Field label="New deliverable" name="title"><Input id="d_title" name="title" required minLength={3} maxLength={160} /></Field>
        <Field label="Kind" name="kind"><Select id="d_kind" name="kind" defaultValue="document">{DELIVERABLE_KINDS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select></Field>
        <Field label="Milestone" name="milestone_id"><Select id="d_ms" name="milestone_id" defaultValue=""><option value="">None</option>{((ms ?? []) as any[]).map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</Select></Field>
        <Field label="File" name="file"><Input id="d_file" name="file" type="file" /></Field>
        <div className="sm:col-span-2"><Button size="sm">Add deliverable</Button></div></form></Card>

      <H>Tasks</H>
      <DataTable empty="No tasks yet."
        columns={[{ key: "t", header: "Task" }, { key: "a", header: "Assignee" }, { key: "d", header: "Due" }, { key: "s", header: "Status" }]}
        rows={((tasks ?? []) as any[]).map((t) => ({ t: <>{t.title}<p className="text-xs text-slate2">{t.stage}{t.estimate_hours != null ? ` · ${t.estimate_hours}h` : ""}</p></>, a: (t.assignee && names.get(t.assignee)) || "Unassigned", d: t.due_date ? formatDate(t.due_date) : "–",
          s: <form action={moveTask} className="flex gap-2"><input type="hidden" name="id" value={t.id} /><input type="hidden" name="return" value={`/software-projects/${id}`} /><Select name="status" aria-label="Task status" defaultValue={t.status}>{TASK_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select><Button size="sm" variant="secondary">Move</Button></form> }))} />
      <Card className="mt-4 max-w-3xl"><form action={addTask} className="grid gap-3 sm:grid-cols-3">{hid()}
        <div className="sm:col-span-3"><Field label="New task" name="title"><Input id="t_title" name="title" required minLength={3} maxLength={160} /></Field></div>
        <Field label="Stage" name="stage"><Select id="t_stage" name="stage" defaultValue="development">{STAGES.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
        <Field label="Assignee" name="assignee"><Select id="t_as" name="assignee" defaultValue=""><option value="">Unassigned</option>{team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
        <Field label="Milestone" name="milestone_id"><Select id="t_ms" name="milestone_id" defaultValue=""><option value="">None</option>{((ms ?? []) as any[]).map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</Select></Field>
        <Field label="Estimate (hours)" name="estimate_hours"><Input id="t_est" name="estimate_hours" inputMode="decimal" /></Field>
        <Field label="Due date" name="due_date"><Input id="t_due" name="due_date" type="date" /></Field>
        <div className="self-end"><Button size="sm">Add task</Button></div></form></Card>

      <H>Quotations</H>
      <DataTable empty="No quotations for this project."
        columns={[{ key: "n", header: "Number" }, { key: "a", header: "Total" }, { key: "s", header: "Status" }]}
        rows={((quotes ?? []) as any[]).map((x) => ({ n: <Link className="font-semibold hover:underline" href={`/quotations/${x.id}`}>{x.quote_number}</Link>, a: formatMoney(Number(x.total_amount), x.currency), s: <StatusBadge status={x.status} /> }))} />
    </>
  );
}
