import Link from "next/link";
import { Card, DataTable, EmptyState, PageHeader, StatusBadge } from "@asotech/ui";
import { formatDate } from "@asotech/utilities";
import { ctx } from "../../../lib/ctx";
import { Flash } from "../../../lib/flash";
import { CreateCountForm } from "../../../components/count-form";
import type { AnyRow } from "../../../components/core-util";

export const metadata = { title: "Stocktaking" };

export default async function StocktakingPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const c = await ctx();

  // Stock counters only ever see their own lines, through the blind-count view.
  if (c.role === "stock_counter") {
    const { data } = await c.sb.from("v_count_sheet").select("session_id, status").eq("organization_id", c.orgId).limit(5000);
    const bySession = new Map<string, { total: number; done: number }>();
    for (const r of (data ?? []) as AnyRow[]) {
      const s = bySession.get(r.session_id) ?? { total: 0, done: 0 };
      s.total++; if (r.status === "counted" || r.status === "verified") s.done++;
      bySession.set(r.session_id, s);
    }
    const ids = Array.from(bySession.keys());
    const { data: ss } = ids.length ? await c.sb.from("stock_count_sessions").select("id, name, status, created_at").in("id", ids).order("created_at", { ascending: false }) : { data: [] };
    const rows = ((ss ?? []) as AnyRow[]).filter((s) => s.status === "counting");
    return (
      <>
        <PageHeader title="My count sheets" description="Counts assigned to you. Count what is physically in each bin and enter the quantity." />
        <Flash sp={sp} />
        {rows.length === 0 ? <EmptyState title="Nothing to count right now">When a manager assigns you bins, your count sheet appears here.</EmptyState> : (
          <DataTable columns={[{ key: "n", header: "Count" }, { key: "p", header: "Progress", align: "right" }]}
            rows={rows.map((s) => ({ n: <Link className="font-semibold hover:underline" href={`/stocktaking/${s.id}`}>{s.name}</Link>, p: `${bySession.get(s.id)?.done ?? 0} of ${bySession.get(s.id)?.total ?? 0} counted` }))} />
        )}
      </>
    );
  }

  const [{ data: ss }, { data: wh }, { data: locs }, { data: cats }] = await Promise.all([
    c.sb.from("stock_count_sessions").select("id, name, count_type, status, created_at, warehouse_id").eq("organization_id", c.orgId).neq("count_type", "cycle").order("created_at", { ascending: false }).limit(100),
    c.sb.from("warehouses").select("id, code, name, is_active").eq("organization_id", c.orgId).order("code"),
    c.sb.from("locations").select("id, code, warehouse_id").eq("organization_id", c.orgId).eq("is_active", true).order("code").limit(2000),
    c.sb.from("product_categories").select("id, name").eq("organization_id", c.orgId).order("name"),
  ]);
  const sessions = (ss ?? []) as AnyRow[];
  const wcode = new Map(((wh ?? []) as AnyRow[]).map((w) => [w.id, w.code]));
  return (
    <>
      <PageHeader title="Stocktaking" description="Count the stock physically, compare it with the system, investigate variances and post only approved adjustments." />
      <Flash sp={sp} />
      {c.can("stocktake.run") && <CreateCountForm countType="full" warehouses={(wh ?? []) as AnyRow[]} locations={(locs ?? []) as AnyRow[]} categories={(cats ?? []) as AnyRow[]} />}
      <h2 className="mb-3 text-lg font-bold text-navy">Counts</h2>
      <DataTable empty="No stocktakes yet."
        columns={[{ key: "n", header: "Name" }, { key: "w", header: "Warehouse" }, { key: "t", header: "Type" }, { key: "d", header: "Started" }, { key: "s", header: "Status" }]}
        rows={sessions.map((s) => ({ n: <Link className="font-semibold hover:underline" href={`/stocktaking/${s.id}`}>{s.name}</Link>, w: wcode.get(s.warehouse_id) ?? "–", t: s.count_type, d: formatDate(s.created_at), s: <StatusBadge status={s.status} /> }))} />
      <Card className="mt-6 !p-4 text-sm text-slate2">Cycle counts are managed under <Link className="font-semibold text-navy underline" href="/cycle-counting">Cycle counting</Link>.</Card>
    </>
  );
}
