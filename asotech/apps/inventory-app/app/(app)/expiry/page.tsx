import { Button, Card, DataTable, EmptyState, Field, Input, PageHeader, Select, StatTile, StatusBadge } from "@asotech/ui";
import { formatDate, formatQty } from "@asotech/utilities";
import { allocateFefo } from "@asotech/business-logic";
import { ctx } from "../../../lib/ctx";
import { Flash } from "../../../lib/flash";
import { NoAccess } from "../../../components/common";
import { byId, searchTerm, type AnyRow } from "../../../components/core-util";
import { lagosDate } from "../../../components/data";
import { resolveProducts } from "../../../components/resolve";
import { refreshExpiry } from "./actions";

export const metadata = { title: "Batches & expiry" };

export default async function ExpiryPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string; status?: string; sku?: string; qty?: string }> }) {
  const sp = await searchParams;
  const c = await ctx();
  if (c.role === "stock_counter" || c.role === "client") return <NoAccess what="expiry management" />;
  let q = c.sb.from("expiry_records").select("*").eq("organization_id", c.orgId).order("expiry_date").limit(500);
  if (sp.status && ["ok", "near_expiry", "expired", "written_off"].includes(sp.status)) q = q.eq("status", sp.status);
  const { data } = await q;
  const recs = (data ?? []) as AnyRow[];
  const batches = await byId(c.sb, "batches", recs.map((r) => r.batch_id), "id, batch_no, product_id");
  const prods = await byId(c.sb, "products", Object.values(batches).map((b) => b.product_id), "id, sku, name");
  const locs = await byId(c.sb, "locations", recs.map((r) => r.location_id), "id, code");
  const count = (s: string) => recs.filter((r) => r.status === s).length;

  // FEFO suggestion for a product and quantity.
  let fefo: { sku: string; name: string; picks: Array<{ batch_no: string; expiry_date: string | null; take: number; loc: string }>; shortfall: number } | null = null;
  const sku = searchTerm(sp.sku);
  const need = Number(sp.qty);
  if (sku && Number.isFinite(need) && need > 0) {
    const found = (await resolveProducts(c.sb, c.orgId, [sku])).get(sku);
    if (found) {
      const { data: pick } = await c.sb.from("v_fefo_pick").select("batch_id, batch_no, expiry_date, quantity, location_id").eq("organization_id", c.orgId).eq("product_id", found.id).limit(500);
      const rows = (pick ?? []) as AnyRow[];
      const lc = await byId(c.sb, "locations", rows.map((r) => r.location_id), "id, code");
      const res = allocateFefo(rows.map((r) => ({ batch_id: r.batch_id, batch_no: r.batch_no, expiry_date: r.expiry_date, quantity: Number(r.quantity), location_id: r.location_id })), need, lagosDate());
      fefo = { sku: found.sku, name: found.name, picks: res.picks.map((p) => ({ batch_no: p.batch_no, expiry_date: p.expiry_date, take: p.take, loc: lc[p.location_id ?? ""]?.code ?? "–" })), shortfall: res.shortfall };
    }
  }

  return (
    <>
      <PageHeader title="Batches & expiry" description="First-Expired-First-Out (FEFO): issue the batch that expires soonest. Expired stock is never suggested."
        actions={c.can("movements.post") ? <form action={refreshExpiry}><Button size="sm" variant="secondary">Refresh expiry records</Button></form> : undefined} />
      <Flash sp={sp} />
      <div className="mb-6 grid grid-cols-3 gap-4"><StatTile label="Expired" value={count("expired")} tone={count("expired") ? "bad" : "ok"} /><StatTile label="Near expiry (90 days)" value={count("near_expiry")} tone={count("near_expiry") ? "warn" : "ok"} /><StatTile label="OK" value={count("ok")} /></div>
      <Card className="mb-8">
        <h2 className="mb-3 font-bold text-navy">FEFO pick suggestion</h2>
        <form className="flex flex-wrap items-end gap-3">
          <Field label="SKU or barcode" name="sku"><Input id="sku" name="sku" defaultValue={sku} required /></Field>
          <Field label="Quantity needed" name="qty"><Input id="qty" name="qty" defaultValue={sp.qty ?? ""} inputMode="decimal" required /></Field>
          <Button variant="secondary" size="sm">Suggest batches</Button>
        </form>
        {fefo && (
          <div className="mt-4 text-sm">
            <p className="font-semibold">{fefo.sku} · {fefo.name}</p>
            {fefo.picks.length === 0 ? <p className="text-slate2">No usable (unexpired) batch stock.</p> : (
              <ul className="mt-1 list-disc pl-5">{fefo.picks.map((p, i) => <li key={i}>Take {formatQty(p.take)} from batch <strong>{p.batch_no}</strong> in {p.loc}{p.expiry_date ? `, expires ${formatDate(p.expiry_date)}` : ""}</li>)}</ul>
            )}
            {fefo.shortfall > 0 && <p className="mt-1 font-semibold text-bad">Short by {formatQty(fefo.shortfall)}</p>}
          </div>
        )}
      </Card>
      <form className="mb-3 flex items-end gap-3">
        <div><label htmlFor="status" className="mb-1 block text-xs font-semibold text-slate2">Status</label>
          <Select id="status" name="status" defaultValue={sp.status ?? ""}><option value="">All</option><option value="expired">Expired</option><option value="near_expiry">Near expiry</option><option value="ok">OK</option></Select></div>
        <Button variant="ghost" size="sm">Filter</Button>
      </form>
      {recs.length === 0 ? <EmptyState title="No expiry records yet">Post receipts for batch-tracked products, then choose Refresh expiry records.</EmptyState> : (
        <DataTable columns={[{ key: "p", header: "Product" }, { key: "b", header: "Batch" }, { key: "l", header: "Bin" }, { key: "q", header: "Quantity", align: "right" }, { key: "e", header: "Expiry" }, { key: "s", header: "Status" }]}
          rows={recs.map((r) => { const b = batches[r.batch_id]; const p = prods[b?.product_id]; return { p: p ? `${p.sku} · ${p.name}` : "–", b: b?.batch_no ?? "–", l: locs[r.location_id]?.code ?? "–", q: formatQty(r.quantity), e: formatDate(r.expiry_date), s: <StatusBadge status={r.status === "near_expiry" ? "pending" : r.status === "ok" ? "active" : r.status} /> }; })} />
      )}
    </>
  );
}
