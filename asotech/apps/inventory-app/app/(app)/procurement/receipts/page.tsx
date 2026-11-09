import { Button, DataTable, PageHeader, StatusBadge } from "@asotech/ui";
import { formatDate } from "@asotech/utilities";
import { ctx } from "../../../../lib/ctx";
import { Flash } from "../../../../lib/flash";
import { NoAccess } from "../../../../components/common";
import { ProcurementNav } from "../../../../components/procurement-nav";
import { byId, type AnyRow } from "../../../../components/core-util";
import { postDraftReceipt } from "../actions";

export const metadata = { title: "Goods receipts" };

export default async function ReceiptsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const c = await ctx();
  if (c.role === "stock_counter" || c.role === "client") return <NoAccess what="goods receipts" />;
  const { data } = await c.sb.from("goods_receipts").select("id, receipt_no, status, received_at, purchase_order_id").eq("organization_id", c.orgId).order("received_at", { ascending: false }).limit(200);
  const rows = (data ?? []) as AnyRow[];
  const pos = await byId(c.sb, "purchase_orders", rows.map((r) => r.purchase_order_id), "id, po_number");
  const manage = c.can("procurement.manage");
  return (
    <>
      <PageHeader title="Goods receipts" description="Posted receipts add stock to the ledger. To receive goods, open an approved purchase order." />
      <ProcurementNav />
      <Flash sp={sp} />
      <DataTable empty="No goods receipts yet."
        columns={[{ key: "n", header: "Receipt" }, { key: "p", header: "Purchase order" }, { key: "d", header: "Date" }, { key: "s", header: "Status" }, ...(manage ? [{ key: "a", header: "" }] : [])]}
        rows={rows.map((r) => ({ n: r.receipt_no, p: pos[r.purchase_order_id]?.po_number ?? "–", d: formatDate(r.received_at, true), s: <StatusBadge status={r.status} />,
          a: manage && r.status === "draft" ? <form action={postDraftReceipt}><input type="hidden" name="id" value={r.id} /><Button size="sm" variant="secondary">Post</Button></form> : null }))} />
    </>
  );
}
