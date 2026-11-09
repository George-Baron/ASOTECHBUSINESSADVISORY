import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Button, Card, PageHeader, StatTile, StatusBadge } from "@asotech/ui";
import { formatDate, formatMoney, formatQty } from "@asotech/utilities";
import { summariseVariance } from "@asotech/business-logic";
import { ctx } from "../../../../lib/ctx";
import { Flash } from "../../../../lib/flash";
import { NoAccess } from "../../../../components/common";
import { PrintButton } from "../../../../components/core-print-button";
import { byId, isUuid, type AnyRow } from "../../../../components/core-util";
import { saveReconciliation, submitReconciliation } from "../actions";

export const metadata = { title: "Reconciliation" };
const REASONS: Array<[string, string]> = [["miscount", "Miscount"], ["damage", "Damage"], ["theft", "Theft or loss"], ["expiry", "Expiry write-off"], ["receiving_error", "Receiving error"], ["issue_error", "Issue error"], ["unrecorded_transfer", "Unrecorded transfer"], ["data_error", "Data error"], ["other", "Other"]];

export default async function ReconciliationDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) notFound();
  const c = await ctx();
  if (c.role === "stock_counter" || c.role === "client") return <NoAccess what="reconciliations" />;
  const { data: r } = await c.sb.from("reconciliation_sessions").select("*").eq("id", id).eq("organization_id", c.orgId).maybeSingle();
  if (!r) notFound();
  const [{ data: ls }, { data: sess }, { data: adj }] = await Promise.all([
    c.sb.from("reconciliation_lines").select("*").eq("reconciliation_id", id).eq("organization_id", c.orgId).limit(20000),
    c.sb.from("stock_count_sessions").select("name, snapshot_at").eq("id", r.count_session_id).maybeSingle(),
    c.sb.from("stock_adjustments").select("id, reference, status").eq("reconciliation_id", id).maybeSingle(),
  ]);
  const lines = (ls ?? []) as AnyRow[];
  const [prods, locs] = await Promise.all([
    byId(c.sb, "products", lines.map((l) => l.product_id), "id, sku, name, cost_price"),
    byId(c.sb, "locations", lines.map((l) => l.location_id), "id, code"),
  ]);
  const summary = summariseVariance(lines.map((l) => ({ system_qty: Number(l.system_qty), counted_qty: Number(l.counted_qty), unit_cost: Number(prods[l.product_id]?.cost_price ?? 0) })));
  const varianceLines = lines.filter((l) => Number(l.variance_qty) !== 0);
  const editable = r.status === "draft" && c.can("reconciliation.prepare");
  const sel = "rounded-lg border border-navy-200 bg-white px-2 py-1.5 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-brand-orange/60";

  return (
    <>
      <PageHeader title={`Reconciliation: ${sess?.name ?? "count"}`} description={`Opened ${formatDate(r.created_at, true)}${sess?.snapshot_at ? ` · system snapshot ${formatDate(sess.snapshot_at, true)}` : ""}`}
        actions={<><StatusBadge status={r.status} /><PrintButton /><Link className="text-sm font-semibold text-navy underline" href="/reconciliation">All</Link></>} />
      <Flash sp={sp} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Count accuracy" value={`${summary.accuracyPct}%`} hint={`${summary.matchedLines} of ${summary.totalLines} lines matched`} tone={summary.accuracyPct === 100 ? "ok" : "warn"} />
        <StatTile label="Variance lines" value={formatQty(summary.varianceLines)} />
        <StatTile label="Shortage value" value={formatMoney(summary.underValue)} tone={summary.underValue ? "bad" : undefined} hint={`${formatQty(summary.underQty)} units`} />
        <StatTile label="Surplus value" value={formatMoney(summary.overValue)} tone={summary.overValue ? "warn" : undefined} hint={`${formatQty(summary.overQty)} units · net ${formatMoney(summary.netValue)}`} />
      </div>
      {adj && <Alert tone="info">Adjustment <strong>{adj.reference}</strong> is <strong>{String(adj.status).replace(/_/g, " ")}</strong>. <Link className="font-semibold underline" href="/approvals">See approvals</Link></Alert>}
      {varianceLines.length === 0 ? <Alert tone="ok">Every line matched the system. Nothing needs adjusting.</Alert> : (
        <form action={saveReconciliation}>
          <input type="hidden" name="reconciliation_id" value={id} />
          <div className="overflow-x-auto rounded-xl border border-navy-100/70 bg-white shadow-card">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-navy-50 text-xs uppercase tracking-wide text-slate2">
                <tr><th className="px-3 py-3">Product</th><th className="px-3 py-3">Bin</th><th className="px-3 py-3 text-right">System</th><th className="px-3 py-3 text-right">Counted</th><th className="px-3 py-3 text-right">Variance</th><th className="px-3 py-3 text-right">Value</th><th className="px-3 py-3">Action</th><th className="px-3 py-3">Reason</th><th className="px-3 py-3">Explanation</th></tr>
              </thead>
              <tbody className="divide-y divide-navy-100/60">
                {varianceLines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-3">{prods[l.product_id]?.sku} · {prods[l.product_id]?.name}</td>
                    <td className="px-3 py-3">{locs[l.location_id]?.code}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatQty(l.system_qty)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatQty(l.counted_qty)}</td>
                    <td className={`px-3 py-3 text-right font-bold tabular-nums ${Number(l.variance_qty) < 0 ? "text-bad" : "text-warn"}`}>{formatQty(l.variance_qty)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatMoney(l.variance_value)}</td>
                    {editable ? (<>
                      <td className="px-3 py-3"><select name={`a_${l.id}`} defaultValue={l.action} aria-label="Action" className={sel}><option value="adjust">Adjust stock</option><option value="investigate">Investigate</option><option value="ignore">Leave as is</option></select></td>
                      <td className="px-3 py-3"><select name={`r_${l.id}`} defaultValue={l.reason_code ?? ""} aria-label="Reason" className={sel}><option value="">Choose…</option>{REASONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
                      <td className="px-3 py-3"><input name={`e_${l.id}`} defaultValue={l.explanation ?? ""} maxLength={500} aria-label="Explanation" className={`${sel} w-56`} /></td>
                    </>) : (<>
                      <td className="px-3 py-3">{l.action}</td><td className="px-3 py-3">{REASONS.find(([k]) => k === l.reason_code)?.[1] ?? "–"}</td><td className="px-3 py-3">{l.explanation ?? "–"}</td>
                    </>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editable && <div className="no-print mt-4"><Button variant="secondary">Save reasons</Button></div>}
        </form>
      )}
      {editable && (
        <Card className="no-print mt-8">
          <h2 className="mb-1 font-bold text-navy">Submit for approval</h2>
          <p className="mb-3 text-sm text-slate2">Save your reasons first. Lines marked "adjust" need a reason; lines marked "investigate" must be resolved before submitting. A different administrator then approves, and only then do the adjustments post.</p>
          <form action={submitReconciliation}><input type="hidden" name="reconciliation_id" value={id} /><Button>Submit reconciliation</Button></form>
        </Card>
      )}
    </>
  );
}
