import { Alert, Button, Card, EmptyState, Input, PageHeader, StatusBadge } from "@asotech/ui";
import { formatDate, formatQty } from "@asotech/utilities";
import { ctx } from "../../../lib/ctx";
import { Flash } from "../../../lib/flash";
import { NoAccess } from "../../../components/common";
import { byId, profileNames, type AnyRow } from "../../../components/core-util";
import { decide } from "./actions";

export const metadata = { title: "Approvals" };

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const c = await ctx();
  if (c.role === "stock_counter" || c.role === "client") return <NoAccess what="approvals" />;
  const { data } = await c.sb.from("approval_requests").select("*").eq("organization_id", c.orgId).order("created_at", { ascending: false }).limit(100);
  const reqs = (data ?? []) as AnyRow[];
  const adjIds = reqs.filter((r) => r.entity_type === "stock_adjustment").map((r) => r.entity_id);
  const [adjs, names] = await Promise.all([byId(c.sb, "stock_adjustments", adjIds, "id, reference, reason, status"), profileNames(c.sb, reqs.flatMap((r) => [r.requested_by, r.decided_by]))]);
  const { data: al } = adjIds.length ? await c.sb.from("stock_adjustment_lines").select("adjustment_id, product_id, location_id, quantity_delta").in("adjustment_id", adjIds).limit(5000) : { data: [] };
  const lines = (al ?? []) as AnyRow[];
  const [prods, locs] = await Promise.all([byId(c.sb, "products", lines.map((l) => l.product_id), "id, sku, name"), byId(c.sb, "locations", lines.map((l) => l.location_id), "id, code")]);
  const canDecide = c.can("approvals.decide");
  const pending = reqs.filter((r) => r.status === "pending");
  const decided = reqs.filter((r) => r.status !== "pending");

  return (
    <>
      <PageHeader title="Approvals" description="Stock adjustments change your inventory records, so a second person must approve them. You cannot approve a request you raised." />
      <Flash sp={sp} />
      <h2 className="mb-3 text-lg font-bold text-navy">Waiting for a decision ({pending.length})</h2>
      {pending.length === 0 ? <EmptyState title="Nothing is waiting for approval" /> : (
        <div className="space-y-4">
          {pending.map((r) => {
            const a = adjs[r.entity_id];
            const mine = r.requested_by === c.session.userId;
            const ls = lines.filter((l) => l.adjustment_id === r.entity_id);
            return (
              <Card key={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-navy">{r.entity_type.replace(/_/g, " ")} {a?.reference}</p>
                    <p className="text-sm text-slate2">Requested by {names[r.requested_by] ?? "–"} on {formatDate(r.created_at, true)}{a?.reason ? ` · ${a.reason}` : ""}</p>
                  </div>
                  <StatusBadge status="pending" />
                </div>
                {ls.length > 0 && (
                  <ul className="mt-3 divide-y divide-navy-100/60 text-sm">
                    {ls.map((l, i) => <li key={i} className="flex justify-between py-1.5"><span>{prods[l.product_id]?.sku} · {prods[l.product_id]?.name} <span className="text-slate2">({locs[l.location_id]?.code})</span></span><span className={`tabular-nums font-semibold ${Number(l.quantity_delta) < 0 ? "text-bad" : "text-ok"}`}>{Number(l.quantity_delta) > 0 ? "+" : ""}{formatQty(l.quantity_delta)}</span></li>)}
                  </ul>
                )}
                {!canDecide ? <p className="mt-3 text-sm text-slate2">Only owners and administrators can decide.</p>
                  : mine ? <Alert tone="info">You raised this request, so someone else must decide it.</Alert>
                  : (
                    <form action={decide} className="mt-4 flex flex-wrap items-end gap-3">
                      <input type="hidden" name="id" value={r.id} />
                      <div className="min-w-[14rem] flex-1"><label htmlFor={`n-${r.id}`} className="mb-1 block text-xs font-semibold text-slate2">Note (required to reject)</label><Input id={`n-${r.id}`} name="note" maxLength={300} /></div>
                      <Button name="decision" value="approve" size="sm">Approve and post</Button>
                      <Button name="decision" value="reject" variant="danger" size="sm">Reject</Button>
                    </form>
                  )}
              </Card>
            );
          })}
        </div>
      )}
      <h2 className="mb-3 mt-10 text-lg font-bold text-navy">Decided</h2>
      {decided.length === 0 ? <p className="text-sm text-slate2">No decisions yet.</p> : (
        <ul className="divide-y divide-navy-100/60 rounded-xl border border-navy-100/70 bg-white text-sm shadow-card">
          {decided.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <span><strong>{adjs[r.entity_id]?.reference ?? r.entity_type}</strong> · requested by {names[r.requested_by] ?? "–"} · decided by {names[r.decided_by] ?? "–"} on {formatDate(r.decided_at, true)}{r.decision_note ? ` · "${r.decision_note}"` : ""}</span>
              <StatusBadge status={r.status} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
