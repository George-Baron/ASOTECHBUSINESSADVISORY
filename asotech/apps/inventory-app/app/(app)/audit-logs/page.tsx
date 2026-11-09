import { Button, DataTable, Input, PageHeader, Select } from "@asotech/ui";
import { formatDate } from "@asotech/utilities";
import { ctx } from "../../../lib/ctx";
import { NoAccess } from "../../../components/common";
import { Pager } from "../../../components/core-pager";
import { PAGE_SIZE, pageNum, profileNames, searchTerm, type AnyRow } from "../../../components/core-util";

export const metadata = { title: "Audit log" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ table?: string; action?: string; page?: string }> }) {
  const sp = await searchParams;
  const c = await ctx();
  if (!c.can("audit.view")) return <NoAccess what="the audit log" />;
  const page = pageNum(sp.page);
  const table = searchTerm(sp.table).replace(/[^a-z_]/gi, "");
  let q = c.sb.from("audit_logs").select("id, actor_id, action, table_name, record_id, old_data, new_data, created_at", { count: "exact" }).eq("organization_id", c.orgId);
  if (table) q = q.eq("table_name", table);
  if (sp.action && ["INSERT", "UPDATE", "DELETE"].includes(sp.action)) q = q.eq("action", sp.action);
  const { data, count } = await q.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const rows = (data ?? []) as AnyRow[];
  const names = await profileNames(c.sb, rows.map((r) => r.actor_id));
  return (
    <>
      <PageHeader title="Audit log" description="A permanent record of who changed what and when. Entries cannot be edited or deleted." />
      <form className="mb-4 flex flex-wrap items-end gap-3">
        <div><label htmlFor="table" className="mb-1 block text-xs font-semibold text-slate2">Table</label><Input id="table" name="table" defaultValue={table} placeholder="e.g. products" /></div>
        <div><label htmlFor="action" className="mb-1 block text-xs font-semibold text-slate2">Action</label><Select id="action" name="action" defaultValue={sp.action ?? ""}><option value="">All</option><option>INSERT</option><option>UPDATE</option><option>DELETE</option></Select></div>
        <Button variant="secondary" size="sm">Filter</Button>
      </form>
      <DataTable empty="No audit entries match."
        columns={[{ key: "w", header: "When" }, { key: "u", header: "Who" }, { key: "a", header: "Action" }, { key: "t", header: "Table" }, { key: "d", header: "Details" }]}
        rows={rows.map((r) => ({ w: formatDate(r.created_at, true), u: names[r.actor_id] ?? (r.actor_id ? "User" : "System"), a: r.action, t: r.table_name,
          d: <details><summary className="cursor-pointer text-xs font-semibold text-navy">View</summary><pre className="mt-1 max-h-60 max-w-xl overflow-auto rounded bg-cloud p-2 text-xs">{JSON.stringify({ before: r.old_data, after: r.new_data }, null, 2)}</pre></details> }))} />
      <Pager base="/audit-logs" params={{ table: table || undefined, action: sp.action }} page={page} total={count ?? 0} pageSize={PAGE_SIZE} />
    </>
  );
}
