import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, Card, DataTable, Field, Input, PageHeader, StatusBadge } from "@asotech/ui";
import { formatDate, formatMoney, formatQty } from "@asotech/utilities";
import { ctx } from "../../../../lib/ctx";
import { Flash } from "../../../../lib/flash";
import { MOVEMENT_LABELS, byId, isUuid, type AnyRow } from "../../../../components/core-util";
import { ProductForm } from "../../../../components/product-form";
import { addBarcode, removeBarcode, saveProduct, setProductActive } from "../actions";
import type { MovementType } from "@asotech/types";

export const metadata = { title: "Product" };
export default async function ProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) notFound();
  const c = await ctx();
  const { data: product } = await c.sb.from("products").select("*").eq("id", id).eq("organization_id", c.orgId).maybeSingle();
  if (!product) notFound();
  const canEdit = c.can("products.manage");
  const canDeleteBarcode = c.role === "owner" || c.role === "admin";
  const [cats, uoms, codes, bal, lines] = await Promise.all([
    c.sb.from("product_categories").select("id, name").eq("organization_id", c.orgId).order("name"),
    c.sb.from("units_of_measure").select("id, code, name").eq("organization_id", c.orgId).order("code"),
    c.sb.from("product_barcodes").select("id, barcode, is_primary").eq("organization_id", c.orgId).eq("product_id", id).order("created_at"),
    c.sb.from("inventory_balances").select("location_id, batch_id, quantity").eq("organization_id", c.orgId).eq("product_id", id).limit(500),
    c.sb.from("stock_movement_lines").select("movement_id, from_location_id, to_location_id, quantity, created_at").eq("organization_id", c.orgId).eq("product_id", id).order("created_at", { ascending: false }).limit(15),
  ]);
  const balances = ((bal.data ?? []) as AnyRow[]).filter((b) => Number(b.quantity) !== 0);
  const lineRows = (lines.data ?? []) as AnyRow[];
  const locs = await byId(c.sb, "locations", [...balances.map((b) => b.location_id), ...lineRows.flatMap((l) => [l.from_location_id, l.to_location_id])], "id, code, warehouse_id");
  const [whs, mvs, batches] = await Promise.all([
    byId(c.sb, "warehouses", Object.values(locs).map((l) => l.warehouse_id), "id, code"),
    byId(c.sb, "stock_movements", lineRows.map((l) => l.movement_id), "id, reference, movement_type"),
    byId(c.sb, "batches", balances.map((b) => b.batch_id), "id, batch_no, expiry_date"),
  ]);
  const locLabel = (lid?: string | null) => (lid && locs[lid] ? `${whs[locs[lid].warehouse_id]?.code ?? "?"} / ${locs[lid].code}` : "–");
  const total = balances.reduce((s, b) => s + Number(b.quantity), 0);
  const uom = ((uoms.data ?? []) as AnyRow[]).find((u) => u.id === product.uom_id)?.code ?? "";

  return (
    <>
      <PageHeader title={`${product.sku} · ${product.name}`} description={`On hand: ${formatQty(total)} ${uom} · Cost ${formatMoney(product.cost_price)} · Price ${formatMoney(product.sale_price)}`}
        actions={<><StatusBadge status={product.is_active ? "active" : "cancelled"} /><Link href="/products" className="text-sm font-semibold text-navy underline">All products</Link></>} />
      <Flash sp={sp} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {canEdit && (
            <Card>
              <h2 className="mb-4 text-lg font-bold text-navy">Details</h2>
              <ProductForm action={saveProduct} product={product} categories={cats.data ?? []} uoms={uoms.data ?? []} submitLabel="Save changes" />
              <form action={setProductActive} className="mt-4 border-t border-navy-100 pt-4">
                <input type="hidden" name="id" value={product.id} />
                <input type="hidden" name="active" value={product.is_active ? "false" : "true"} />
                <Button type="submit" variant={product.is_active ? "ghost" : "secondary"} size="sm">{product.is_active ? "Deactivate product" : "Reactivate product"}</Button>
                <span className="ml-3 text-xs text-slate2">Deactivated products keep their history.</span>
              </form>
            </Card>
          )}
          <section>
            <h2 className="mb-3 text-lg font-bold text-navy">Stock by location</h2>
            <DataTable empty="No stock on hand for this product."
              columns={[{ key: "l", header: "Location" }, { key: "b", header: "Batch" }, { key: "e", header: "Expiry" }, { key: "q", header: "Quantity", align: "right" }]}
              rows={balances.map((b) => ({ l: locLabel(b.location_id), b: b.batch_id ? batches[b.batch_id]?.batch_no ?? "–" : "–", e: b.batch_id ? formatDate(batches[b.batch_id]?.expiry_date) : "–", q: formatQty(b.quantity) }))} />
          </section>
          <section>
            <h2 className="mb-3 text-lg font-bold text-navy">Recent movements</h2>
            <DataTable empty="No movements for this product yet."
              columns={[{ key: "d", header: "Date" }, { key: "r", header: "Reference" }, { key: "t", header: "Type" }, { key: "f", header: "From" }, { key: "to", header: "To" }, { key: "q", header: "Qty", align: "right" }]}
              rows={lineRows.map((l) => ({ d: formatDate(l.created_at, true), r: mvs[l.movement_id]?.reference ?? "–", t: MOVEMENT_LABELS[mvs[l.movement_id]?.movement_type as MovementType] ?? "–", f: locLabel(l.from_location_id), to: locLabel(l.to_location_id), q: formatQty(l.quantity) }))} />
          </section>
        </div>
        <Card className="h-fit">
          <h2 className="mb-3 text-lg font-bold text-navy">Barcodes</h2>
          <ul className="space-y-2 text-sm">
            {((codes.data ?? []) as AnyRow[]).map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2">
                <span className="font-mono">{b.barcode}{b.is_primary && <span className="ml-2 text-xs text-slate2">primary</span>}</span>
                {canDeleteBarcode && (
                  <form action={removeBarcode}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="product_id" value={product.id} /><button className="text-xs font-semibold text-bad hover:underline">Remove</button></form>
                )}
              </li>
            ))}
            {!(codes.data ?? []).length && <li className="text-slate2">No barcodes yet.</li>}
          </ul>
          {canEdit && (
            <form action={addBarcode} className="mt-4 space-y-2 border-t border-navy-100 pt-4">
              <input type="hidden" name="product_id" value={product.id} />
              <Field label="Add barcode" name="barcode"><Input id="barcode" name="barcode" minLength={3} maxLength={64} required /></Field>
              <Button type="submit" size="sm" variant="secondary">Add barcode</Button>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
