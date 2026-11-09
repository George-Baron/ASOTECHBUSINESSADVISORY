import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, DataTable, LinkButton, PageHeader, StatTile, StatusBadge } from "@asotech/ui";
import { formatDate, formatMoney, formatQty } from "@asotech/utilities";
import { inventoryValue } from "@asotech/business-logic";
import { ctx } from "../../../lib/ctx";
import { Flash } from "../../../lib/flash";
import { MOVEMENT_LABELS, type AnyRow } from "../../../components/core-util";
import type { MovementType } from "@asotech/types";

export const metadata = { title: "Dashboard" };
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const c = await ctx();
  if (c.role === "stock_counter") redirect("/stocktaking");

  const [products, onHand, costs, sessions, approvals, expiry, recent, org] = await Promise.all([
    c.sb.from("products").select("id", { count: "exact", head: true }).eq("organization_id", c.orgId).eq("is_active", true),
    c.sb.from("v_stock_on_hand").select("product_id, sku, product_name, quantity, reorder_level, is_low").eq("organization_id", c.orgId).limit(5000),
    c.sb.from("products").select("id, sku, name, cost_price, reorder_level").eq("organization_id", c.orgId).eq("is_active", true).limit(5000),
    c.sb.from("stock_count_sessions").select("id", { count: "exact", head: true }).eq("organization_id", c.orgId).in("status", ["counting", "review", "reconciling"]),
    c.sb.from("approval_requests").select("id", { count: "exact", head: true }).eq("organization_id", c.orgId).eq("status", "pending"),
    c.sb.from("expiry_records").select("id", { count: "exact", head: true }).eq("organization_id", c.orgId).in("status", ["near_expiry", "expired"]),
    c.sb.from("stock_movements").select("id, reference, movement_type, approval, created_at").eq("organization_id", c.orgId).order("created_at", { ascending: false }).limit(8),
    c.sb.from("organizations").select("currency").eq("id", c.orgId).maybeSingle(),
  ]);
  const currency = (org.data?.currency as string) ?? "NGN";
  const qtyBy = new Map<string, number>();
  for (const r of (onHand.data ?? []) as AnyRow[]) qtyBy.set(r.product_id, Number(r.quantity));
  const prod = (costs.data ?? []) as AnyRow[];
  const value = inventoryValue(prod.map((p) => ({ quantity: qtyBy.get(p.id) ?? 0, cost_price: Number(p.cost_price) })));
  // Low stock: view flag for stocked products, plus products with a reorder level and no stock rows at all.
  const low: AnyRow[] = prod
    .filter((p) => Number(p.reorder_level) > 0 && (qtyBy.get(p.id) ?? 0) <= Number(p.reorder_level))
    .map((p) => ({ ...p, qty: qtyBy.get(p.id) ?? 0 }))
    .sort((a, b) => a.qty - b.qty)
    .slice(0, 8);
  const lowCount = prod.filter((p) => Number(p.reorder_level) > 0 && (qtyBy.get(p.id) ?? 0) <= Number(p.reorder_level)).length;

  return (
    <>
      <PageHeader title="Dashboard" description="Stock position, open work and recent activity." actions={<>
        {c.can("movements.post") && <LinkButton href="/movements/new" size="sm">New movement</LinkButton>}
        {c.can("stocktake.run") && <LinkButton href="/stocktaking" size="sm" variant="secondary">Start a stocktake</LinkButton>}
        {c.can("products.manage") && <LinkButton href="/products/new" size="sm" variant="ghost">Add product</LinkButton>}
        {c.can("products.manage") && <LinkButton href="/products/import" size="sm" variant="ghost">Import products</LinkButton>}
      </>} />
      <Flash sp={sp} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Active products" value={formatQty(products.count ?? 0)} />
        <StatTile label="Low on stock" value={formatQty(lowCount)} tone={lowCount ? "warn" : "ok"} hint="At or below reorder level" />
        <StatTile label="Inventory value" value={formatMoney(value, currency)} hint="Quantity × cost price" />
        <StatTile label="Open counts" value={formatQty(sessions.count ?? 0)} />
        <StatTile label="Pending approvals" value={formatQty(approvals.count ?? 0)} tone={approvals.count ? "warn" : undefined} />
        <StatTile label="Near or past expiry" value={formatQty(expiry.count ?? 0)} tone={expiry.count ? "bad" : undefined} hint="From latest expiry refresh" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-bold text-navy">Low stock</h2>
          <DataTable empty="No products are below their reorder level."
            columns={[{ key: "p", header: "Product" }, { key: "q", header: "On hand", align: "right" }, { key: "r", header: "Reorder at", align: "right" }]}
            rows={low.map((p) => ({ p: <Link className="font-semibold underline-offset-2 hover:underline" href={`/products/${p.id}`}>{p.sku} · {p.name}</Link>, q: formatQty(p.qty), r: formatQty(p.reorder_level) }))} />
        </section>
        <section>
          <h2 className="mb-3 text-lg font-bold text-navy">Recent movements</h2>
          <DataTable empty="No stock movements posted yet."
            columns={[{ key: "d", header: "Date" }, { key: "r", header: "Reference" }, { key: "t", header: "Type" }, { key: "a", header: "Status" }]}
            rows={((recent.data ?? []) as AnyRow[]).map((m) => ({ d: formatDate(m.created_at, true), r: m.reference, t: MOVEMENT_LABELS[m.movement_type as MovementType], a: <StatusBadge status={m.approval === "not_required" ? "posted" : m.approval} /> }))} />
          <p className="mt-2 text-right text-sm"><Link className="font-semibold text-navy underline" href="/movements">All movements</Link></p>
        </section>
      </div>
      {!products.count && <Card className="mt-8"><p className="text-sm text-navy">Start by adding warehouses and products, then post an opening balance. <Link className="font-semibold underline" href="/warehouses">Set up warehouses</Link>.</p></Card>}
    </>
  );
}
