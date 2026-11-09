import Link from "next/link";
import { PageHeader, StatTile, Card, DataTable, StatusBadge, EmptyState } from "@asotech/ui";
import { formatDate } from "@asotech/utilities";
import { ctx, todayIso } from "../../../lib/ctx";

export const metadata = { title: "Dashboard" };

type Report = { id: string; title: string; report_type: string; published_at: string | null; created_at: string };
type Milestone = { id: string; title: string; due_date: string | null; status: string };

export default async function Dashboard() {
  const { sb, orgId, org } = await ctx();
  const head = { count: "exact" as const, head: true };
  const today = todayIso();
  const [cp, sp, af, ca, od, dv, tk, reports, miles] = await Promise.all([
    sb.from("consulting_projects").select("id", head).eq("organization_id", orgId).eq("status", "active"),
    sb.from("software_projects").select("id", head).eq("organization_id", orgId).eq("status", "active"),
    sb.from("audit_findings").select("id", head).eq("organization_id", orgId).in("status", ["open", "in_progress"]),
    sb.from("corrective_actions").select("id", head).eq("organization_id", orgId).neq("status", "done"),
    sb.from("corrective_actions").select("id", head).eq("organization_id", orgId).neq("status", "done").lt("due_date", today),
    sb.from("project_deliverables").select("id", head).eq("organization_id", orgId).eq("status", "in_review"),
    sb.from("support_tickets").select("id", head).eq("organization_id", orgId).in("status", ["open", "in_progress", "waiting_client"]),
    sb.from("client_reports").select("id, title, report_type, published_at, created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(5),
    sb.from("project_milestones").select("id, title, due_date, status").eq("organization_id", orgId).in("status", ["pending", "in_progress", "done"]).order("due_date", { ascending: true, nullsFirst: false }).limit(6),
  ]);
  const overdue = od.count ?? 0;
  const reportRows = (reports.data ?? []) as Report[];
  const milestoneRows = (miles.data ?? []) as Milestone[];
  return (
    <>
      <PageHeader title={`Welcome, ${org.name}`} description="A summary of your projects with ASOTECH Business Advisory." />
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Consulting projects" value={cp.count ?? 0} hint="active" />
        <StatTile label="Software projects" value={sp.count ?? 0} hint="active" />
        <StatTile label="Open findings" value={af.count ?? 0} tone={(af.count ?? 0) > 0 ? "warn" : "ok"} />
        <StatTile label="Corrective actions" value={ca.count ?? 0} hint={overdue ? `${overdue} overdue` : "none overdue"} tone={overdue ? "bad" : undefined} />
        <StatTile label="Awaiting your approval" value={dv.count ?? 0} tone={(dv.count ?? 0) > 0 ? "warn" : undefined} />
        <StatTile label="Open support tickets" value={tk.count ?? 0} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="recent-reports">
          <h2 id="recent-reports" className="mb-2 text-lg font-bold text-navy">Recent reports</h2>
          <DataTable
            empty="No reports have been published to you yet."
            columns={[{ key: "title", header: "Report" }, { key: "type", header: "Type" }, { key: "date", header: "Published" }]}
            rows={reportRows.map((r) => ({ title: <Link className="font-semibold underline" href={`/reports/${r.id}/download`}>{r.title}</Link>, type: r.report_type, date: formatDate(r.published_at ?? r.created_at) }))}
          />
        </section>
        <section aria-labelledby="milestones">
          <h2 id="milestones" className="mb-2 text-lg font-bold text-navy">Upcoming milestones</h2>
          {milestoneRows.length === 0 ? <EmptyState title="No milestones yet" /> : (
            <Card className="!p-0">
              <ul className="divide-y divide-navy-100/60">
                {milestoneRows.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="font-semibold">{m.title}</span>
                    <span className="flex items-center gap-3 text-slate2">{formatDate(m.due_date)} <StatusBadge status={m.status} /></span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      </div>
    </>
  );
}
