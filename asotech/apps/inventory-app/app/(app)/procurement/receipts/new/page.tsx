import { notFound } from "next/navigation";
import { Alert, Button, Card, Field, Input, PageHeader, Select } from "@asotech/ui";
import { formatQty } from "@asotech/utilities";
import { ctx } from "../../../../../lib/ctx";
import { Flash } from "../../../../../lib/flash";
import { NoAccess } from "../../../../../components/common";
import { byId, isUuid, type AnyRow } from "../../../../../components/core-util";
import { receiveGoods } from "../../actions";

export const metadata = { title: "Receive goods" };

export default async function NewReceiptPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string; po?: string }> }) {
  const sp = await searchParams;
  const c = await ctx();
  if (!c.can("procurement.manage")) return <NoAccess what="receiving goods" />;
  if (!isUuid(sp.po)) notFound();
  const { data: po } = await c.sb.from("purchase_orders").select("id, po_number, status").eq("id", sp.po).eq("organization_id", c.orgId).maybeSingle();
  if (!po) notFound();
  const { data: ls } = await c.sb.from("purchase_order_lines").select("*").eq("purchase_order_id", po.id).eq("organization_id", c.orgId);
  const lines = ((ls ?? []) as AnyRow[]).filter((l) => Number(l.quantity) - Number(l.received_quantity) > 0);
  const [prods, { data: locs }, { data: whs }] = await Promise.all([
    byId(c.sb, "products", lines.map((l) => l.product_id), "id, sku, name, track_batches, track_expiry"),
    c.sb.from("locations").select("id, code, warehouse_id").eq("organization_id", c.orgId).eq("is_active", true).order("code").limit(2000),
    c.sb.from("warehouses").select("id, code").eq("organization_id", c.orgId),
  ]);
  const wcode = new Map(((whs ?? []) as AnyRow[]).map((w) => [w.id, w.code]));
  const open = ["approved", "partially_received"].includes(po.status);
  return (
    <>
      <PageHeader title={`Receive goods: ${po.po_number}`} description="Enter what actually arrived. Leave a line blank if nothing arrived for it." />
      <Flash sp={sp} />
      {!open ? <Alert tone="warn">This purchase order is {po.status.replace("_", " ")} and cannot be received.</Alert> : lines.length === 0 ? <Alert tone="ok">Everything on this order has been received.</Alert> : (
        <form action={receiveGoods} className="space-y-6">
          <input type="hidden" name="po_id" value={po.id} />
          <Card><Field label="Receive into bin" name="location_id"><Select id="location_id" name="location_id" required>{((locs ?? []) as AnyRow[]).map((l) => <option key={l.id} value={l.id}>{wcode.get(l.warehouse_id)} · {l.code}</option>)}</Select></Field></Card>
          <Card>
            <div className="space-y-4">
              {lines.map((l) => {
                const p = prods[l.product_id];
                const out = Number(l.quantity) - Number(l.received_quantity);
                return (
                  <div key={l.id} className="grid gap-2 border-b border-navy-100/60 pb-4 md:grid-cols-[2fr_1fr_1fr_1fr]">
                    <div><p className="font-semibold">{p?.sku} · {p?.name}</p><p className="text-xs text-slate2">Outstanding {formatQty(out)}</p></div>
                    <Input name={`q_${l.id}`} defaultValue={String(out)} inputMode="decimal" aria-label={`Received quantity for ${p?.sku}`} />
                    {p?.track_batches ? <Input name={`b_${l.id}`} placeholder="Batch no." aria-label={`Batch for ${p?.sku}`} /> : <span />}
                    {p?.track_expiry ? <Input name={`x_${l.id}`} type="date" aria-label={`Expiry for ${p?.sku}`} /> : <span />}
                  </div>
                );
              })}
            </div>
          </Card>
          <Button size="lg">Receive and post to ledger</Button>
        </form>
      )}
    </>
  );
}
