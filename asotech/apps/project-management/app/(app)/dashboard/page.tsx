import Link from "next/link";
import { DataTable, PageHeader, StatTile, StatusBadge } from "@asotech/ui";
import { formatDate } from "@asotech/utilities";
import { staffCtx, today } from "../../../lib/ctx";
import { loadInbox } from "../../../lib/data";
import { Flash } from "../../../lib/flash";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const { sb } = await staffCtx();
  const head = (t: string) => sb.from(t).select("id", { count: "exact", head: true });
  const [inbox, sw, cons, overdue, review, quotes] = await Promise.all([
    loadInbox(sb, 50),
    head("software_projects").eq("status", "active"),
    head("consulting_projects").eq("status", "active"),
    head("project_tasks").neq("status", "done").lt("due_date", today()),
    head("project_deliverables").eq("status", "in_review"),
    head("quotations").eq("status", "sent"),
  ]);
  const fresh = inbox.filter((i) => i.status === "new");
  return (
    <>
      <PageHeader title="Dashboard" description="Incoming enquiries and delivery work at a glance." />
      <Flash sp={sp} />
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile label="New requests" value={fresh.length} tone={fresh.length ? "warn" : "ok"} />
        <StatTile label="Active software" value={sw.count ?? 0} />
        <StatTile label="Active consulting" value={cons.count ?? 0} />
        <StatTile label="Overdue tasks" value={overdue.count ?? 0} tone={overdue.count ? "bad" : "ok"} />
        <StatTile label="Deliverables in review" value={review.count ?? 0} />
        <StatTile label="Quotes awaiting client" value={quotes.count ?? 0} />
      </div>
      <h2 className="mb-3 text-lg font-bold text-navy">Latest requests</h2>
      <DataTable empty="No requests yet. Website forms will appear here."
        columns={[{ key: "d", header: "Received" }, { key: "k", header: "Type" }, { key: "n", header: "From" }, { key: "s", header: "Summary" }, { key: "st", header: "Status" }]}
        rows={inbox.slice(0, 10).map((i) => ({ d: formatDate(i.created_at, true), k: i.kind, n: <Link className="font-semibold hover:underline" href={`/requests/${i.kind}/${i.id}`}>{i.name}</Link>, s: i.summary || "–", st: <StatusBadge status={i.status} /> }))} />
    </>
  );
}
