import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, Card, DataTable, PageHeader, StatusBadge } from "@asotech/ui";
import { formatDate, formatMoney } from "@asotech/utilities";
import { staffCtx, isUuid } from "../../../../lib/ctx";
import { Flash } from "../../../../lib/flash";
import { setQuoteStatus } from "../actions";

export const metadata = { title: "Quotation" };

export default async function QuotationDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) return notFound();
  const { sb } = await staffCtx();
  const { data: q } = await sb.from("quotations").select("*").eq("id", id).maybeSingle();
  if (!q) return notFound();
  const { data: org } = await sb.from("organizations").select("name").eq("id", q.organization_id).maybeSingle();
  const lines = (Array.isArray(q.line_items) ? q.line_items : []) as Array<{ description: string; quantity: number; unit_price: number; amount: number }>;
  const act = (to: string, label: string, variant: "primary" | "secondary" = "secondary") => (
    <form action={setQuoteStatus}><input type="hidden" name="id" value={id} /><input type="hidden" name="to" value={to} /><Button size="sm" variant={variant}>{label}</Button></form>
  );
  return (
    <>
      <PageHeader title={q.quote_number} description={`${org?.name ?? "Client"}${q.valid_until ? ` · valid until ${formatDate(q.valid_until)}` : ""}`}
        actions={<><StatusBadge status={q.status} />{q.status === "draft" && act("sent", "Send to client", "primary")}{q.status === "sent" && act("draft", "Withdraw")}{q.status === "sent" && act("expired", "Mark expired")}<Link className="text-sm font-semibold text-navy underline" href="/quotations">All quotations</Link></>} />
      <Flash sp={sp} />
      <Card className="max-w-3xl">
        <DataTable empty="No lines."
          columns={[{ key: "d", header: "Description" }, { key: "q", header: "Qty" }, { key: "p", header: "Unit price" }, { key: "a", header: "Amount" }]}
          rows={lines.map((l) => ({ d: l.description, q: l.quantity, p: formatMoney(l.unit_price, q.currency), a: formatMoney(l.amount, q.currency) }))} />
        <p className="mt-4 text-right text-lg font-bold text-navy">Total: {formatMoney(Number(q.total_amount), q.currency)}</p>
        <p className="mt-2 text-xs text-slate2">Taxes and payment terms are not added automatically; confirm them with your accountant before sending.</p>
      </Card>
    </>
  );
}
