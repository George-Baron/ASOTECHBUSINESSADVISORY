import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Button, Card, DataTable, LinkButton, PageHeader, StatusBadge } from "@asotech/ui";
import { formatDate, formatMoney, formatQty } from "@asotech/utilities";
import { ctx } from "../../../../../lib/ctx";
import { Flash } from "../../../../../lib/flash";
import { NoAccess } from "../../../../../components/common";
import { ProcurementNav } from "../../../../../components/procurement-nav";
import { byId, isUuid, profileNames, type AnyRow } from "../../../../../components/core-util";
import { changePoStatus } from "../../actions";

export const metadata = { title: "Purchase order" };

export default async function PoDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) notFound();
  const c = await ctx();
  if (c.role === "stock_counter" || c.role === "client") return <NoAccess what="procurement" />;
  const { data: po } = await c.sb.from("purchase_orders").select("*").eq("id", id).eq("organization_id", c.orgId).maybeSingle();
  if (!po) notFound();
  const { data: ls } = await c.sb.from("purchase_order_lines").select("*").eq("purchase_order_id", id).eq("organization_id", c.orgId);
  const lines = (ls ?? []) as AnyRow[];
  const [prods, sup, names, { data: grs }] = await Promise.all([
    byId(c.sb, "products", lines.map((l) => l.product_id), "id, sku, name"),
    byId(c.sb, "suppliers", [po.supplier_id], "id, name"),
    profileNames(c.sb, [po.created_by]),
    c.sb.from("goods_receipts").select("id, receipt_no, status, received_at").eq("purchase_order_id", id).eq("organization_id", c.orgId).order("received_at"),
  ]);
  const total = lines.reduce((s, l) => s + Number(l.quantity) * Number(l.unit_cost), 0);
  const manage = c.can("procurement.manage");
  const approver = c.role === "owner" || c.role === "admin";
  const mine = po.created_by === c.session.userId;
  const act = (action: string, label: string, variant: "primary" | "secondary" | "ghost" | "danger" = "secondary") => (
    <form action={changePoStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="action" value={action} /><Button variant={variant} size="sm">{label}</Button></form>
  );
  return (
    <>
      <PageHeader title={po.po_number} description={`${sup[po.supplier_id]?.name ?? "Supplier"} · created ${formatDate(po.created_at)} by ${names[po.created_by] ?? "–"}${po.expected_date ? ` · expected ${formatDate(po.expected_date)}` : ""}`} actions={<StatusBadge status={po.status} />} />
      <ProcurementNav />
      <Flash sp={sp} />
      {po.notes && <p className="mb-4 text-sm text-slate2">{po.notes}</p>}
      <DataTable columns={[{ key: "p", header: "Product" }, { key: "q", header: "Ordered", align: "right" }, { key: "r", header: "Received", align: "right" }, { key: "c", header: "Unit cost", align: "right" }, { key: "t", header: "Line total", align: "right" }]}
        rows={lines.map((l) => ({ p: `${prods[l.product_id]?.sku} · ${prods[l.product_id]?.name}`, q: formatQty(l.quantity), r: formatQty(l.received_quantity), c: formatMoney(l.unit_cost), t: formatMoney(Number(l.quantity) * Number(l.unit_cost)) }))} />
      <p className="mt-3 text-right text-lg font-extrabold text-navy">Total {formatMoney(total)}</p>
      <Card className="mt-6">
        <h2 className="mb-3 font-bold text-navy">Actions</h2>
        <div className="flex flex-wrap items-center gap-3">
          {manage && po.status === "draft" && act("submit", "Submit for approval", "primary")}
          {po.status === "pending_approval" && (approver && !mine ? act("approve", "Approve", "primary") : <span className="text-sm text-slate2">{mine ? "You created this order, so another owner or administrator must approve it." : "Waiting for an owner or administrator to approve."}</span>)}
          {manage && ["pending_approval", "approved"].includes(po.status) && act("reopen", "Send back to draft", "ghost")}
          {manage && ["draft", "pending_approval", "approved"].includes(po.status) && act("cancel", "Cancel order", "danger")}
          {manage && ["approved", "partially_received"].includes(po.status) && <LinkButton href={`/procurement/receipts/new?po=${id}`} size="sm">Receive goods</LinkButton>}
        </div>
      </Card>
      {(grs ?? []).length > 0 && (
        <section className="mt-6"><h2 className="mb-2 font-bold text-navy">Receipts</h2>
          <ul className="text-sm">{((grs ?? []) as AnyRow[]).map((g) => <li key={g.id}><Link className="font-semibold underline" href="/procurement/receipts">{g.receipt_no}</Link> · {formatDate(g.received_at, true)} · <StatusBadge status={g.status} /></li>)}</ul></section>
      )}
      {po.status === "cancelled" && <Alert tone="warn">This purchase order was cancelled.</Alert>}
    </>
  );
}
