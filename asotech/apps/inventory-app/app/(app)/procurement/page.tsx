import Link from "next/link";
import { DataTable, LinkButton, PageHeader, StatusBadge } from "@asotech/ui";
import { formatDate } from "@asotech/utilities";
import { ctx } from "../../../lib/ctx";
import { Flash } from "../../../lib/flash";
import { NoAccess } from "../../../components/common";
import { ProcurementNav } from "../../../components/procurement-nav";
import { byId, type AnyRow } from "../../../components/core-util";

export const metadata = { title: "Procurement" };

export default async function ProcurementPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const c = await ctx();
  if (c.role === "stock_counter" || c.role === "client") return <NoAccess what="procurement" />;
  const { data } = await c.sb.from("purchase_orders").select("id, po_number, supplier_id, status, expected_date, created_at").eq("organization_id", c.orgId).order("created_at", { ascending: false }).limit(200);
  const rows = (data ?? []) as AnyRow[];
  const sup = await byId(c.sb, "suppliers", rows.map((r) => r.supplier_id), "id, name");
  return (
    <>
      <PageHeader title="Procurement" description="Raise purchase orders, get them approved by a second person, then receive goods into bins."
        actions={c.can("procurement.manage") ? <LinkButton href="/procurement/orders/new" size="sm">New purchase order</LinkButton> : undefined} />
      <ProcurementNav />
      <Flash sp={sp} />
      <DataTable empty="No purchase orders yet."
        columns={[{ key: "n", header: "PO" }, { key: "s", header: "Supplier" }, { key: "e", header: "Expected" }, { key: "d", header: "Created" }, { key: "st", header: "Status" }]}
        rows={rows.map((r) => ({ n: <Link className="font-semibold hover:underline" href={`/procurement/orders/${r.id}`}>{r.po_number}</Link>, s: sup[r.supplier_id]?.name ?? "–", e: formatDate(r.expected_date), d: formatDate(r.created_at), st: <StatusBadge status={r.status} /> }))} />
    </>
  );
}
