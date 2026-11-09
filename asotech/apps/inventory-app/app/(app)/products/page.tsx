import Link from "next/link";
import { Button, DataTable, Input, LinkButton, PageHeader, StatusBadge } from "@asotech/ui";
import { formatMoney, formatQty } from "@asotech/utilities";
import { ctx } from "../../../lib/ctx";
import { Flash } from "../../../lib/flash";
import { PAGE_SIZE, pageNum, searchTerm, type AnyRow } from "../../../components/core-util";
import { Pager } from "../../../components/core-pager";

export const metadata = { title: "Products" };
export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const c = await ctx();
  const q = searchTerm(sp.q);
  const page = pageNum(sp.page);
  let query = c.sb.from("products")
    .select("id, sku, name, cost_price, sale_price, reorder_level, is_active, category_id, uom_id", { count: "exact" })
    .eq("organization_id", c.orgId).order("name").range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) {
    const { data: bc } = await c.sb.from("product_barcodes").select("product_id").eq("organization_id", c.orgId).eq("barcode", q);
    const ids = ((bc ?? []) as AnyRow[]).map((b) => b.product_id as string);
    query = query.or([`sku.ilike.%${q}%`, `name.ilike.%${q}%`, ...(ids.length ? [`id.in.(${ids.join(",")})`] : [])].join(","));
  }
  const [{ data, count }, cats, uoms] = await Promise.all([
    query,
    c.sb.from("product_categories").select("id, name").eq("organization_id", c.orgId),
    c.sb.from("units_of_measure").select("id, code").eq("organization_id", c.orgId),
  ]);
  const rows = (data ?? []) as AnyRow[];
  const { data: oh } = rows.length
    ? await c.sb.from("v_stock_on_hand").select("product_id, quantity").eq("organization_id", c.orgId).in("product_id", rows.map((r) => r.id))
    : { data: [] as AnyRow[] };
  const qty = new Map(((oh ?? []) as AnyRow[]).map((r) => [r.product_id as string, Number(r.quantity)]));
  const catName = new Map(((cats.data ?? []) as AnyRow[]).map((r) => [r.id as string, r.name as string]));
  const uomCode = new Map(((uoms.data ?? []) as AnyRow[]).map((r) => [r.id as string, r.code as string]));
  return (
    <>
      <PageHeader title="Products" description="Your product master data: SKUs, barcodes, costs and reorder levels." actions={<>
        {c.can("products.manage") && <LinkButton href="/products/new" size="sm">Add product</LinkButton>}
        {c.can("products.manage") && <LinkButton href="/products/import" size="sm" variant="secondary">Import CSV / Excel</LinkButton>}
        <LinkButton href="/products/categories" size="sm" variant="ghost">Categories & units</LinkButton>
      </>} />
      <Flash sp={sp} />
      <form className="mb-4 flex gap-2" role="search">
        <Input name="q" defaultValue={q} placeholder="Search by SKU, name or barcode" aria-label="Search products" className="max-w-md" />
        <Button type="submit" variant="secondary">Search</Button>
      </form>
      <DataTable empty={q ? "No products match your search." : "No products yet. Add one or import a file."}
        columns={[{ key: "sku", header: "SKU" }, { key: "name", header: "Name" }, { key: "cat", header: "Category" }, { key: "qty", header: "On hand", align: "right" }, { key: "cost", header: "Cost", align: "right" }, { key: "price", header: "Price", align: "right" }, { key: "st", header: "Status" }]}
        rows={rows.map((r) => ({
          sku: r.sku,
          name: <Link className="font-semibold underline-offset-2 hover:underline" href={`/products/${r.id}`}>{r.name}</Link>,
          cat: catName.get(r.category_id) ?? "–",
          qty: <span className={(qty.get(r.id) ?? 0) <= Number(r.reorder_level) && Number(r.reorder_level) > 0 ? "font-bold text-warn" : ""}>{formatQty(qty.get(r.id) ?? 0)} {uomCode.get(r.uom_id) ?? ""}</span>,
          cost: formatMoney(r.cost_price), price: formatMoney(r.sale_price),
          st: <StatusBadge status={r.is_active ? "active" : "cancelled"} />,
        }))} />
      <Pager base="/products" params={{ q }} page={page} total={count ?? 0} pageSize={PAGE_SIZE} />
    </>
  );
}
