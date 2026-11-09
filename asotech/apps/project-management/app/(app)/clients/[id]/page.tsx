import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, Card, DataTable, Field, Input, PageHeader, Select, StatusBadge } from "@asotech/ui";
import { formatDate } from "@asotech/utilities";
import { staffCtx, isUuid, one } from "../../../../lib/ctx";
import { MEMBER_ROLES, TICKET_STATUSES } from "../../../../lib/constants";
import { Flash } from "../../../../lib/flash";
import { addMember, setTicketStatus } from "../actions";

export const metadata = { title: "Client" };

export default async function ClientDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) return notFound();
  const { sb } = await staffCtx();
  const { data: org } = await sb.from("organizations").select("id, name, slug, kind, created_at").eq("id", id).maybeSingle();
  if (!org) return notFound();
  const [members, tickets, sw, cons] = await Promise.all([
    sb.from("organization_members").select("id, role, is_active, user_id, user_profiles(full_name)").eq("organization_id", id),
    sb.from("support_tickets").select("id, subject, body, priority, status, created_at").eq("organization_id", id).order("created_at", { ascending: false }),
    sb.from("software_projects").select("id, name, status, stage").eq("organization_id", id),
    sb.from("consulting_projects").select("id, title, status").eq("organization_id", id),
  ]);
  return (
    <>
      <PageHeader title={org.name} description={`Client since ${formatDate(org.created_at)}`} actions={<Link className="text-sm font-semibold text-navy underline" href="/clients">All clients</Link>} />
      <Flash sp={sp} />
      <h2 className="mb-3 text-lg font-bold text-navy">Members</h2>
      <DataTable empty="No members yet."
        columns={[{ key: "n", header: "Name" }, { key: "r", header: "Role" }, { key: "a", header: "Active" }]}
        rows={((members.data ?? []) as any[]).map((m) => ({ n: one(m.user_profiles)?.full_name ?? String(m.user_id).slice(0, 8), r: m.role, a: m.is_active ? "Yes" : "No" }))} />
      <Card className="mb-8 mt-4 max-w-2xl">
        <form action={addMember} className="grid gap-4 sm:grid-cols-3 sm:items-end">
          <input type="hidden" name="org" value={id} />
          <div className="sm:col-span-2"><Field label="Add member by email" name="email" hint="The person must have registered in the portal first."><Input id="email" name="email" type="email" required /></Field></div>
          <Field label="Role" name="role"><Select id="role" name="role" defaultValue="client">{MEMBER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</Select></Field>
          <div className="sm:col-span-3"><Button size="sm">Add member</Button></div>
        </form>
      </Card>
      <h2 className="mb-3 text-lg font-bold text-navy">Projects</h2>
      <DataTable empty="No projects for this client."
        columns={[{ key: "n", header: "Project" }, { key: "t", header: "Type" }, { key: "s", header: "Status" }]}
        rows={[
          ...((sw.data ?? []) as any[]).map((p) => ({ n: <Link className="font-semibold hover:underline" href={`/software-projects/${p.id}`}>{p.name}</Link>, t: "Software", s: <StatusBadge status={p.status} /> })),
          ...((cons.data ?? []) as any[]).map((p) => ({ n: <Link className="font-semibold hover:underline" href={`/consulting-projects/${p.id}`}>{p.title}</Link>, t: "Consulting", s: <StatusBadge status={p.status} /> })),
        ]} />
      <h2 className="mb-3 mt-8 text-lg font-bold text-navy">Support tickets</h2>
      <DataTable empty="No tickets."
        columns={[{ key: "d", header: "Opened" }, { key: "s", header: "Subject" }, { key: "p", header: "Priority" }, { key: "u", header: "Status" }]}
        rows={((tickets.data ?? []) as any[]).map((t) => ({ d: formatDate(t.created_at, true), s: <details><summary className="cursor-pointer font-semibold">{t.subject}</summary><p className="mt-1 whitespace-pre-wrap text-sm">{t.body}</p></details>, p: t.priority,
          u: <form action={setTicketStatus} className="flex gap-2"><input type="hidden" name="org" value={id} /><input type="hidden" name="id" value={t.id} /><Select name="status" aria-label="Ticket status" defaultValue={t.status}>{TICKET_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</Select><Button size="sm" variant="secondary">Save</Button></form> }))} />
    </>
  );
}
