import Link from "next/link";
import { DataTable, PageHeader, StatusBadge } from "@asotech/ui";
import { formatDate } from "@asotech/utilities";
import { ctx } from "../../../lib/ctx";
import { Flash } from "../../../lib/flash";
import { CreateCountForm } from "../../../components/count-form";
import { NoAccess } from "../../../components/common";
import type { AnyRow } from "../../../components/core-util";

export const metadata = { title: "Cycle counting" };

export default async function CycleCountingPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const c = await ctx();
  if (c.role === "stock_counter" || c.role === "client") return <NoAccess what="cycle count management" />;
  const [{ data: ss }, { data: wh }, { data: locs }, { data: cats }] = await Promise.all([
    c.sb.from("stock_count_sessions").select("id, name, status, created_at").eq("organization_id", c.orgId).eq("count_type", "cycle").order("created_at", { ascending: false }).limit(100),
    c.sb.from("warehouses").select("id, code, name, is_active").eq("organization_id", c.orgId).order("code"),
    c.sb.from("locations").select("id, code, warehouse_id").eq("organization_id", c.orgId).eq("is_active", true).order("code").limit(2000),
    c.sb.from("product_categories").select("id, name").eq("organization_id", c.orgId).order("name"),
  ]);
  return (
    <>
      <PageHeader title="Cycle counting" description="Count a slice of your stock on a regular rhythm (fast movers weekly, slow movers quarterly) instead of shutting down for a full stocktake." />
      <Flash sp={sp} />
      {c.can("stocktake.run") && <CreateCountForm countType="cycle" warehouses={(wh ?? []) as AnyRow[]} locations={(locs ?? []) as AnyRow[]} categories={(cats ?? []) as AnyRow[]} />}
      <h2 className="mb-3 text-lg font-bold text-navy">Cycle counts</h2>
      <DataTable empty="No cycle counts yet."
        columns={[{ key: "n", header: "Name" }, { key: "d", header: "Started" }, { key: "s", header: "Status" }]}
        rows={((ss ?? []) as AnyRow[]).map((s) => ({ n: <Link className="font-semibold hover:underline" href={`/stocktaking/${s.id}`}>{s.name}</Link>, d: formatDate(s.created_at), s: <StatusBadge status={s.status} /> }))} />
    </>
  );
}
