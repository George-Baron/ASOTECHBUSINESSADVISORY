import Link from "next/link";
import { DataTable, PageHeader, StatusBadge } from "@asotech/ui";
import { formatMoney } from "@asotech/utilities";
import { staffCtx } from "../../../lib/ctx";
import { loadOrgs, loadProjects, orgNameMap, byId } from "../../../lib/data";

export const metadata = { title: "Client approvals" };

/** Read-only: decisions are made by clients in the portal (client_decide). Staff see what is waiting and what was decided. */
export default async function ApprovalsPage() {
  const { sb } = await staffCtx();
  const [orgs, projects, d, m, q] = await Promise.all([
    loadOrgs(sb), loadProjects(sb),
    sb.from("project_deliverables").select("id, organization_id, software_project_id, title, status").eq("is_published", true).in("status", ["in_review", "approved", "changes_requested"]).order("created_at", { ascending: false }),
    sb.from("project_milestones").select("id, organization_id, software_project_id, title, status").in("status", ["done", "approved"]).order("due_date", { ascending: false }),
    sb.from("quotations").select("id, organization_id, quote_number, status, total_amount, currency").in("status", ["sent", "accepted", "rejected"]).order("created_at", { ascending: false }),
  ]);
  const on = orgNameMap(orgs);
  const pm = byId(projects);
  const rows = [
    ...((d.data ?? []) as any[]).map((x) => ({ k: "Deliverable", t: x.title, c: x.organization_id, s: x.status, p: x.software_project_id as string | null, link: null as string | null, wait: x.status === "in_review" })),
    ...((m.data ?? []) as any[]).map((x) => ({ k: "Milestone", t: x.title, c: x.organization_id, s: x.status, p: x.software_project_id as string | null, link: null, wait: x.status === "done" })),
    ...((q.data ?? []) as any[]).map((x) => ({ k: "Quotation", t: `${x.quote_number} (${formatMoney(Number(x.total_amount), x.currency)})`, c: x.organization_id, s: x.status, p: null, link: `/quotations/${x.id}`, wait: x.status === "sent" })),
  ].sort((a, b) => Number(b.wait) - Number(a.wait));
  return (
    <>
      <PageHeader title="Client approvals" description="Items awaiting a client decision appear first. Clients decide in the client portal." />
      <DataTable empty="Nothing has been sent to clients yet."
        columns={[{ key: "k", header: "Item" }, { key: "t", header: "Title" }, { key: "c", header: "Client" }, { key: "s", header: "Status" }]}
        rows={rows.map((r) => ({ k: r.k, t: r.link ? <Link className="underline" href={r.link}>{r.t}</Link> : r.p ? <Link className="underline" href={`/software-projects/${r.p}`}>{r.t}</Link> : r.t, c: on.get(r.c) ?? "–", s: <><StatusBadge status={r.s} />{r.wait && <span className="ml-2 text-xs font-semibold text-slate2">awaiting client</span>}</> }))} />
    </>
  );
}
