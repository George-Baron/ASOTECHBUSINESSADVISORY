import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Button, Card, DataTable, Input, PageHeader, StatusBadge } from "@asotech/ui";
import { formatDate, formatQty, formatMoney } from "@asotech/utilities";
import type { MovementType } from "@asotech/types";
import { ctx } from "../../../../lib/ctx";
import { Flash } from "../../../../lib/flash";
import { NoAccess } from "../../../../components/common";
import { MOVEMENT_LABELS, byId, isUuid, profileNames, type AnyRow } from "../../../../components/core-util";
import { reverseMovement } from "../actions";

export const metadata = { title: "Movement" };

export default async function MovementDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const c = await ctx();
  if (c.role === "stock_counter" || c.role === "client") return <NoAccess what="the stock ledger" />;
  if (!isUuid(id)) notFound();
  const { data: m } = await c.sb.from("stock_movements").select("*").eq("id", id).eq("organization_id", c.orgId).maybeSingle();
  if (!m) notFound();
  const { data: ls } = await c.sb.from("stock_movement_lines").select("*").eq("movement_id", id).eq("organization_id", c.orgId);
  const lines = (ls ?? []) as AnyRow[];
  const [prods, locs, batches, names, reversal] = await Promise.all([
    byId(c.sb, "products", lines.map((l) => l.product_id), "id, sku, name"),
    byId(c.sb, "locations", lines.flatMap((l) => [l.from_location_id, l.to_location_id]), "id, code"),
    byId(c.sb, "batches", lines.map((l) => l.batch_id), "id, batch_no, expiry_date"),
    profileNames(c.sb, [m.created_by]),
    c.sb.from("stock_movements").select("id").eq("reverses_movement_id", id).maybeSingle(),
  ]);
  const reversedBy = reversal.data?.id as string | undefined;
  const canReverse = (c.role === "owner" || c.role === "admin") && !reversedBy && !m.reverses_movement_id;

  return (
    <>
      <PageHeader title={m.reference} description={`${MOVEMENT_LABELS[m.movement_type as MovementType]} · ${formatDate(m.created_at, true)} · ${names[m.created_by] ?? "system"}`}
        actions={<Link className="text-sm font-semibold text-navy underline" href="/movements">All movements</Link>} />
      <Flash sp={sp} />
      <div className="mb-4 flex gap-2"><StatusBadge status={m.approval === "not_required" ? "posted" : m.approval} />{reversedBy && <StatusBadge status="cancelled" />}</div>
      {reversedBy && <Alert tone="warn">This movement has been reversed. <Link className="font-semibold underline" href={`/movements/${reversedBy}`}>View reversal</Link></Alert>}
      {m.reverses_movement_id && <Alert tone="info">This entry reverses <Link className="font-semibold underline" href={`/movements/${m.reverses_movement_id}`}>an earlier movement</Link>.</Alert>}
      {m.notes && <p className="mb-4 text-sm text-slate2">{m.notes}</p>}
      <DataTable columns={[{ key: "p", header: "Product" }, { key: "b", header: "Batch" }, { key: "f", header: "From" }, { key: "t", header: "To" }, { key: "q", header: "Quantity", align: "right" }, { key: "c", header: "Unit cost", align: "right" }]}
        rows={lines.map((l) => ({
          p: prods[l.product_id] ? `${prods[l.product_id].sku} · ${prods[l.product_id].name}` : "–",
          b: l.batch_id ? `${batches[l.batch_id]?.batch_no ?? ""}${batches[l.batch_id]?.expiry_date ? ` (exp ${batches[l.batch_id].expiry_date})` : ""}` : "–",
          f: l.from_location_id ? locs[l.from_location_id]?.code : "–",
          t: l.to_location_id ? locs[l.to_location_id]?.code : "–",
          q: formatQty(l.quantity), c: l.unit_cost === null ? "–" : formatMoney(l.unit_cost),
        }))} />
      {canReverse && (
        <Card className="mt-8 max-w-xl">
          <h2 className="mb-1 font-bold text-navy">Reverse this movement</h2>
          <p className="mb-3 text-sm text-slate2">Posts an equal and opposite entry. The original stays in the ledger. Reversal can fail if the stock has already moved on.</p>
          <form action={reverseMovement} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={m.id} />
            <div className="min-w-[14rem] flex-1"><label htmlFor="reason" className="mb-1 block text-sm font-semibold text-navy">Reason</label><Input id="reason" name="reason" required minLength={3} maxLength={300} /></div>
            <Button variant="danger" size="sm">Reverse</Button>
          </form>
        </Card>
      )}
    </>
  );
}
