import Link from "next/link";
import { DataTable, PageHeader, StatusBadge } from "@asotech/ui";
import { formatDate } from "@asotech/utilities";
import { ctx } from "../../../lib/ctx";
import { Flash } from "../../../lib/flash";
import { NoAccess } from "../../../components/common";
import { byId, type AnyRow } from "../../../components/core-util";

export const metadata = { title: "Reconciliation" };

export default async function ReconciliationList({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const c = await ctx();
  if (c.role === "stock_counter" || c.role === "client") return <NoAccess what="reconciliations" />;
  const { data } = await c.sb.from("reconciliation_sessions").select("id, status, created_at, count_session_id").eq("organization_id", c.orgId).order("created_at", { ascending: false }).limit(100);
  const rows = (data ?? []) as AnyRow[];
  const sess = await byId(c.sb, "stock_count_sessions", rows.map((r) => r.count_session_id), "id, name");
  return (
    <>
      <PageHeader title="Reconciliation" description="Explain every variance between the count and the system. Adjustments post to the ledger only after approval." />
      <Flash sp={sp} />
      <DataTable empty="No reconciliations yet. Close a stocktake and start its reconciliation."
        columns={[{ key: "n", header: "Count" }, { key: "d", header: "Opened" }, { key: "s", header: "Status" }]}
        rows={rows.map((r) => ({ n: <Link className="font-semibold hover:underline" href={`/reconciliation/${r.id}`}>{sess[r.count_session_id]?.name ?? "Count"}</Link>, d: formatDate(r.created_at, true), s: <StatusBadge status={r.status} /> }))} />
    </>
  );
}
