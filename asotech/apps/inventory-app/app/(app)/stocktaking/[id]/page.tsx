import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Button, Card, EmptyState, Field, Input, PageHeader, Select, StatusBadge, StatTile } from "@asotech/ui";
import { formatDate, formatQty } from "@asotech/utilities";
import { ctx } from "../../../../lib/ctx";
import { Flash } from "../../../../lib/flash";
import { Pager } from "../../../../components/core-pager";
import { byId, isUuid, pageNum, profileNames, searchTerm, type AnyRow } from "../../../../components/core-util";
import { assignLines, cancelSession, closeCounting, requestRecount, saveCounts, startReconciliation } from "../actions";

export const metadata = { title: "Count sheet" };
const PER_PAGE = 100;

export default async function CountSessionPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; notice?: string; q?: string; page?: string; show?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) notFound();
  const c = await ctx();
  const { data: s } = await c.sb.from("stock_count_sessions").select("*").eq("id", id).eq("organization_id", c.orgId).maybeSingle();
  if (!s) notFound();
  const isCounter = c.role === "stock_counter";
  const manage = c.can("stocktake.run");
  const open = s.status === "counting";
  const page = pageNum(sp.page);
  const q = searchTerm(sp.q);

  // Resolve a SKU/name filter to product ids.
  let productFilter: string[] | null = null;
  if (q) {
    const { data } = await c.sb.from("products").select("id").eq("organization_id", c.orgId).or(`sku.ilike.%${q}%,name.ilike.%${q}%`).limit(500);
    productFilter = ((data ?? []) as AnyRow[]).map((p) => p.id);
  }

  let lines: AnyRow[] = [];
  let total = 0;
  if (isCounter) {
    let vq = c.sb.from("v_count_sheet").select("id, sku, product_name, product_id, location_code, location_id, status, counted_qty, snapshot_qty", { count: "exact" }).eq("session_id", id);
    if (productFilter) vq = vq.in("product_id", productFilter.length ? productFilter : ["00000000-0000-0000-0000-000000000000"]);
    if (sp.show === "todo") vq = vq.in("status", ["pending", "recount"]);
    const r = await vq.order("location_code").order("sku").range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
    lines = (r.data ?? []) as AnyRow[]; total = r.count ?? 0;
  } else {
    let lq = c.sb.from("stock_count_lines").select("*", { count: "exact" }).eq("session_id", id).eq("organization_id", c.orgId);
    if (productFilter) lq = lq.in("product_id", productFilter.length ? productFilter : ["00000000-0000-0000-0000-000000000000"]);
    if (sp.show === "todo") lq = lq.in("status", ["pending", "recount"]);
    if (sp.show === "variance") lq = lq.neq("variance_qty", 0);
    const r = await lq.order("location_id").order("product_id").range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
    lines = (r.data ?? []) as AnyRow[]; total = r.count ?? 0;
  }

  const [prods, locs] = await Promise.all([
    isCounter ? Promise.resolve({} as Record<string, AnyRow>) : byId(c.sb, "products", lines.map((l) => l.product_id), "id, sku, name"),
    isCounter ? Promise.resolve({} as Record<string, AnyRow>) : byId(c.sb, "locations", lines.map((l) => l.location_id), "id, code"),
  ]);

  // Progress (manager view).
  let progress = { total: 0, counted: 0, recount: 0, variance: 0 };
  let counters: AnyRow[] = [];
  let sessionLocs: AnyRow[] = [];
  const entries: Record<string, AnyRow[]> = {};
  let assignees: Record<string, string> = {};
  if (!isCounter) {
    const { data: all } = await c.sb.from("stock_count_lines").select("status, variance_qty, location_id, assigned_to").eq("session_id", id).eq("organization_id", c.orgId).limit(20000);
    const rows = (all ?? []) as AnyRow[];
    progress = {
      total: rows.length, counted: rows.filter((r) => r.status === "counted" || r.status === "verified").length,
      recount: rows.filter((r) => r.status === "recount").length, variance: rows.filter((r) => r.variance_qty !== null && Number(r.variance_qty) !== 0).length,
    };
    const locIds = Array.from(new Set(rows.map((r) => r.location_id)));
    sessionLocs = Object.values(await byId(c.sb, "locations", locIds, "id, code"));
    assignees = await profileNames(c.sb, rows.map((r) => r.assigned_to));
    const { data: mem } = await c.sb.from("organization_members").select("user_id").eq("organization_id", c.orgId).eq("role", "stock_counter").eq("is_active", true);
    const nm = await profileNames(c.sb, ((mem ?? []) as AnyRow[]).map((m) => m.user_id));
    counters = ((mem ?? []) as AnyRow[]).map((m) => ({ id: m.user_id, name: nm[m.user_id] ?? "Counter" }));
    const lineIds = lines.map((l) => l.id);
    if (lineIds.length) {
      const { data: en } = await c.sb.from("stock_count_entries").select("line_id, entry_no, quantity, entered_at, source, note").in("line_id", lineIds).order("entry_no");
      for (const e of (en ?? []) as AnyRow[]) (entries[e.line_id] ||= []).push(e);
    }
  }

  const input = "w-24 rounded-lg border border-navy-200 px-2 py-1.5 text-right text-sm tabular-nums focus:border-navy focus:outline-none focus:ring-2 focus:ring-brand-orange/60";
  const showSystem = !isCounter || !s.blind_count;

  return (
    <>
      <PageHeader title={s.name} description={`${s.count_type} count · started ${formatDate(s.created_at, true)}${s.blind_count ? " · blind count" : ""}`}
        actions={<><StatusBadge status={s.status} /><Link className="text-sm font-semibold text-navy underline" href={isCounter ? "/stocktaking" : s.count_type === "cycle" ? "/cycle-counting" : "/stocktaking"}>Back</Link></>} />
      <Flash sp={sp} />
      {!isCounter && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Lines" value={formatQty(progress.total)} />
          <StatTile label="Counted" value={`${formatQty(progress.counted)} / ${formatQty(progress.total)}`} tone={progress.counted === progress.total && progress.total > 0 ? "ok" : undefined} />
          <StatTile label="Awaiting recount" value={formatQty(progress.recount)} tone={progress.recount ? "warn" : undefined} />
          <StatTile label="Lines with variance" value={formatQty(progress.variance)} tone={progress.variance ? "warn" : "ok"} />
        </div>
      )}

      {!isCounter && manage && open && (
        <Card className="mb-6">
          <h2 className="mb-3 font-bold text-navy">Assign bins to a counter</h2>
          {counters.length === 0 ? <p className="text-sm text-slate2">No stock counters yet. Add team members with the Stock counter role under Settings & team.</p> : (
            <form action={assignLines} className="grid gap-3 md:grid-cols-[1fr_2fr_auto] md:items-end">
              <input type="hidden" name="session_id" value={id} />
              <Field label="Counter" name="user_id"><Select id="user_id" name="user_id" required>{counters.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
              <Field label="Bins" name="location_ids"><Select id="location_ids" name="location_ids" multiple size={4} required>{sessionLocs.map((l) => <option key={l.id} value={l.id}>{l.code}</option>)}</Select></Field>
              <Button variant="secondary">Assign</Button>
            </form>
          )}
        </Card>
      )}

      <form className="no-print mb-3 flex flex-wrap items-end gap-3">
        <div><label htmlFor="q" className="mb-1 block text-xs font-semibold text-slate2">Find product</label><Input id="q" name="q" defaultValue={q} placeholder="SKU or name" /></div>
        <div><label htmlFor="show" className="mb-1 block text-xs font-semibold text-slate2">Show</label>
          <Select id="show" name="show" defaultValue={sp.show ?? ""}><option value="">All lines</option><option value="todo">Still to count</option>{!isCounter && <option value="variance">Variances only</option>}</Select></div>
        <Button variant="ghost" size="sm">Apply</Button>
      </form>

      {lines.length === 0 ? <EmptyState title="No lines to show" /> : (
        <form action={saveCounts}>
          <input type="hidden" name="session_id" value={id} />
          <div className="overflow-x-auto rounded-xl border border-navy-100/70 bg-white shadow-card">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-navy-50 text-xs uppercase tracking-wide text-slate2">
                <tr><th className="px-4 py-3">Bin</th><th className="px-4 py-3">Product</th>{showSystem && <th className="px-4 py-3 text-right">System</th>}<th className="px-4 py-3 text-right">Counted</th>{!isCounter && <th className="px-4 py-3 text-right">Variance</th>}<th className="px-4 py-3">Status</th>{open && <th className="px-4 py-3 text-right">Enter count</th>}</tr>
              </thead>
              <tbody className="divide-y divide-navy-100/60">
                {lines.map((l) => {
                  const sku = isCounter ? l.sku : prods[l.product_id]?.sku;
                  const name = isCounter ? l.product_name : prods[l.product_id]?.name;
                  const bin = isCounter ? l.location_code : locs[l.location_id]?.code;
                  const v = l.variance_qty === null || l.variance_qty === undefined ? null : Number(l.variance_qty);
                  const hist = entries[l.id] ?? [];
                  return (
                    <tr key={l.id} className={l.status === "recount" ? "bg-orange-50/60" : undefined}>
                      <td className="px-4 py-3 font-semibold">{bin}</td>
                      <td className="px-4 py-3">{sku} · {name}
                        {hist.length > 1 && (
                          <details className="mt-1 text-xs text-slate2"><summary className="cursor-pointer">Count history ({hist.length})</summary>
                            <ul className="mt-1 space-y-0.5">{hist.map((e) => <li key={e.entry_no}>#{e.entry_no}: {formatQty(e.quantity)} · {e.source} · {formatDate(e.entered_at, true)}</li>)}</ul></details>
                        )}
                      </td>
                      {showSystem && <td className="px-4 py-3 text-right tabular-nums">{formatQty(l.snapshot_qty)}</td>}
                      <td className="px-4 py-3 text-right tabular-nums">{l.counted_qty === null ? "–" : formatQty(l.counted_qty)}</td>
                      {!isCounter && <td className={`px-4 py-3 text-right tabular-nums ${v ? "font-bold text-bad" : ""}`}>{v === null ? "–" : formatQty(v)}</td>}
                      <td className="px-4 py-3"><StatusBadge status={l.status} />{!isCounter && l.assigned_to && <span className="ml-1 text-xs text-slate2">{assignees[l.assigned_to]}</span>}</td>
                      {open && (
                        <td className="px-4 py-3 text-right">
                          <input name={`q_${l.id}`} inputMode="decimal" aria-label={`Count for ${sku} in ${bin}`} className={input} />
                          {!isCounter && manage && l.counted_qty !== null && (
                            <button type="submit" formAction={requestRecount} name="line_id" value={l.id} className="ml-2 text-xs font-semibold text-navy underline">Recount</button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {open && <div className="mt-4 flex items-center gap-3"><Button>Save counts on this page</Button><span className="text-xs text-slate2">Only rows with a quantity are saved. Re-entering a count keeps the original value in the history.</span></div>}
        </form>
      )}
      <Pager base={`/stocktaking/${id}`} params={{ q, show: sp.show }} page={page} total={total} pageSize={PER_PAGE} />

      {!isCounter && manage && (
        <Card className="mt-8">
          <h2 className="mb-3 font-bold text-navy">Next step</h2>
          {s.status === "counting" && (
            <div className="flex flex-wrap gap-3">
              <form action={closeCounting}><input type="hidden" name="session_id" value={id} /><Button variant="secondary">Close counting</Button></form>
              <form action={cancelSession}><input type="hidden" name="session_id" value={id} /><Button variant="danger">Cancel this count</Button></form>
            </div>
          )}
          {s.status === "review" && (
            <div className="flex flex-wrap items-center gap-3">
              <form action={startReconciliation}><input type="hidden" name="session_id" value={id} /><Button>Start reconciliation</Button></form>
              <form action={cancelSession}><input type="hidden" name="session_id" value={id} /><Button variant="danger" size="sm">Cancel</Button></form>
              <span className="text-sm text-slate2">Counting is closed. Use Recount on a line to reopen counting for it.</span>
            </div>
          )}
          {s.status === "reconciling" && <p className="text-sm text-slate2">Reconciliation in progress. <Link className="font-semibold text-navy underline" href="/reconciliation">Open reconciliations</Link></p>}
          {s.status === "posted" && <Alert tone="ok">This count was reconciled and any approved adjustments have been posted to the ledger.</Alert>}
          {s.status === "cancelled" && <p className="text-sm text-slate2">This count was cancelled. No stock was changed.</p>}
        </Card>
      )}
    </>
  );
}
