import { round4 } from "@asotech/business-logic";
import { loadAll, fetchPages, mapById, lagosDate, isIsoDate, type Row, type Sb } from "./data";

export interface ReportDef { key: string; title: string; description: string }
export interface ReportResult { title: string; columns: string[]; rows: Array<Array<string | number>>; truncated: boolean }

export const REPORTS: ReportDef[] = [
  { key: "stock-on-hand", title: "Stock on hand", description: "Quantity per product across all bins, with reorder level." },
  { key: "valuation", title: "Stock valuation", description: "Quantity multiplied by cost price, by warehouse." },
  { key: "low-stock", title: "Low stock", description: "Products at or below their reorder level." },
  { key: "movements", title: "Movement history", description: "Every ledger line in a date range." },
  { key: "variances", title: "Stocktake variances", description: "Reconciled variances with reasons." },
  { key: "expiry", title: "Expiry", description: "Batches by expiry status from the latest refresh." },
  { key: "purchases", title: "Supplier purchases", description: "Purchase order lines by supplier and status." },
];

const CAP = 50000;

export async function buildReport(sb: Sb, orgId: string, key: string, p: { from?: string; to?: string } = {}): Promise<ReportResult | null> {
  switch (key) {
    case "stock-on-hand": {
      const { rows, truncated } = await loadAll(sb, "v_stock_on_hand", "sku, product_name, quantity, reorder_level, is_low", orgId, "sku", CAP);
      return { title: "Stock on hand", truncated, columns: ["SKU", "Product", "Quantity", "Reorder level", "Low stock"], rows: rows.map((r) => [r.sku, r.product_name, Number(r.quantity), Number(r.reorder_level), r.is_low ? "Yes" : "No"]) };
    }
    case "low-stock": {
      const [prods, onhand] = await Promise.all([loadAll(sb, "products", "id, sku, name, reorder_level", orgId, "sku", CAP), loadAll(sb, "v_stock_on_hand", "product_id, quantity", orgId, "product_id", CAP)]);
      const q = new Map(onhand.rows.map((r) => [r.product_id as string, Number(r.quantity)]));
      const rows = prods.rows.filter((r) => Number(r.reorder_level) > 0 && (q.get(r.id) ?? 0) <= Number(r.reorder_level))
        .map((r) => [r.sku, r.name, q.get(r.id) ?? 0, Number(r.reorder_level), round4(Number(r.reorder_level) - (q.get(r.id) ?? 0))] as Array<string | number>);
      return { title: "Low stock", truncated: prods.truncated, columns: ["SKU", "Product", "On hand", "Reorder level", "Shortfall"], rows };
    }
    case "valuation": {
      const [bal, prods, locs, whs] = await Promise.all([
        loadAll(sb, "inventory_balances", "product_id, location_id, quantity", orgId, "id", CAP), loadAll(sb, "products", "id, sku, name, cost_price", orgId, "id", CAP),
        loadAll(sb, "locations", "id, warehouse_id", orgId, "id", CAP), loadAll(sb, "warehouses", "id, code, name", orgId, "id", CAP),
      ]);
      const pm = mapById(prods.rows), lm = mapById(locs.rows), wm = mapById(whs.rows);
      const agg = new Map<string, { wh: string; sku: string; name: string; qty: number; cost: number }>();
      for (const b of bal.rows) {
        const prod = pm.get(b.product_id); const loc = lm.get(b.location_id); if (!prod || !loc) continue;
        const wh = wm.get(loc.warehouse_id)?.code ?? "?";
        const k = `${wh}|${prod.id}`; const cur = agg.get(k) ?? { wh, sku: prod.sku, name: prod.name, qty: 0, cost: Number(prod.cost_price) };
        cur.qty += Number(b.quantity); agg.set(k, cur);
      }
      const rows = Array.from(agg.values()).sort((a, b) => a.wh.localeCompare(b.wh) || a.sku.localeCompare(b.sku)).map((r) => [r.wh, r.sku, r.name, round4(r.qty), r.cost, round4(r.qty * r.cost)] as Array<string | number>);
      const total = rows.reduce((s, r) => s + (r[5] as number), 0);
      rows.push(["TOTAL", "", "", "", "", round4(total)]);
      return { title: "Stock valuation", truncated: bal.truncated, columns: ["Warehouse", "SKU", "Product", "Quantity", "Unit cost", "Value"], rows };
    }
    case "movements": {
      const from = isIsoDate(p.from) ? p.from : lagosDate(new Date(Date.now() - 30 * 86400000));
      const to = isIsoDate(p.to) ? p.to : lagosDate();
      const mv = await fetchPages((a, b) => sb.from("stock_movements").select("id, reference, movement_type, created_at").eq("organization_id", orgId).gte("created_at", `${from}T00:00:00+01:00`).lt("created_at", `${to}T23:59:59+01:00`).order("created_at").range(a, b), CAP);
      const ids = mv.rows.map((m) => m.id as string);
      const lines: Row[] = [];
      for (let i = 0; i < ids.length && lines.length < CAP; i += 100) {
        const { data } = await sb.from("stock_movement_lines").select("movement_id, product_id, from_location_id, to_location_id, quantity, unit_cost").eq("organization_id", orgId).in("movement_id", ids.slice(i, i + 100));
        lines.push(...((data ?? []) as Row[]));
      }
      const [prods, locs] = await Promise.all([loadAll(sb, "products", "id, sku, name", orgId, "id", CAP), loadAll(sb, "locations", "id, code", orgId, "id", CAP)]);
      const pm = mapById(prods.rows), lm = mapById(locs.rows), mm = mapById(mv.rows);
      return { title: `Movement history ${from} to ${to}`, truncated: mv.truncated || lines.length >= CAP, columns: ["Date", "Reference", "Type", "SKU", "Product", "From", "To", "Quantity", "Unit cost"],
        rows: lines.map((l) => { const m = mm.get(l.movement_id)!; return [String(m.created_at).slice(0, 19).replace("T", " "), m.reference, m.movement_type, pm.get(l.product_id)?.sku ?? "", pm.get(l.product_id)?.name ?? "", lm.get(l.from_location_id)?.code ?? "", lm.get(l.to_location_id)?.code ?? "", Number(l.quantity), l.unit_cost === null ? "" : Number(l.unit_cost)]; }) };
    }
    case "variances": {
      const [rl, prods, locs, rs] = await Promise.all([
        loadAll(sb, "reconciliation_lines", "reconciliation_id, product_id, location_id, system_qty, counted_qty, variance_qty, variance_value, reason_code, explanation, action", orgId, "id", CAP),
        loadAll(sb, "products", "id, sku, name", orgId, "id", CAP), loadAll(sb, "locations", "id, code", orgId, "id", CAP), loadAll(sb, "reconciliation_sessions", "id, status, created_at", orgId, "id", CAP),
      ]);
      const pm = mapById(prods.rows), lm = mapById(locs.rows), rm = mapById(rs.rows);
      return { title: "Stocktake variances", truncated: rl.truncated, columns: ["Reconciliation date", "Status", "SKU", "Product", "Bin", "System", "Counted", "Variance", "Value", "Action", "Reason", "Explanation"],
        rows: rl.rows.filter((r) => Number(r.variance_qty) !== 0).map((r) => [String(rm.get(r.reconciliation_id)?.created_at ?? "").slice(0, 10), rm.get(r.reconciliation_id)?.status ?? "", pm.get(r.product_id)?.sku ?? "", pm.get(r.product_id)?.name ?? "", lm.get(r.location_id)?.code ?? "", Number(r.system_qty), Number(r.counted_qty), Number(r.variance_qty), Number(r.variance_value ?? 0), r.action, r.reason_code ?? "", r.explanation ?? ""]) };
    }
    case "expiry": {
      const [er, bt, prods, locs] = await Promise.all([loadAll(sb, "expiry_records", "batch_id, location_id, quantity, expiry_date, status", orgId, "expiry_date", CAP), loadAll(sb, "batches", "id, batch_no, product_id", orgId, "id", CAP), loadAll(sb, "products", "id, sku, name", orgId, "id", CAP), loadAll(sb, "locations", "id, code", orgId, "id", CAP)]);
      const bm = mapById(bt.rows), pm = mapById(prods.rows), lm = mapById(locs.rows);
      return { title: "Expiry", truncated: er.truncated, columns: ["SKU", "Product", "Batch", "Bin", "Quantity", "Expiry date", "Status"], rows: er.rows.map((r) => { const b = bm.get(r.batch_id); const pr = pm.get(b?.product_id); return [pr?.sku ?? "", pr?.name ?? "", b?.batch_no ?? "", lm.get(r.location_id)?.code ?? "", Number(r.quantity), r.expiry_date, r.status]; }) };
    }
    case "purchases": {
      const [pos, pl, sup, prods] = await Promise.all([loadAll(sb, "purchase_orders", "id, po_number, supplier_id, status, created_at", orgId, "id", CAP), loadAll(sb, "purchase_order_lines", "purchase_order_id, product_id, quantity, received_quantity, unit_cost", orgId, "id", CAP), loadAll(sb, "suppliers", "id, name", orgId, "id", CAP), loadAll(sb, "products", "id, sku, name", orgId, "id", CAP)]);
      const pm = mapById(prods.rows), sm = mapById(sup.rows), om = mapById(pos.rows);
      return { title: "Supplier purchases", truncated: pl.truncated, columns: ["PO", "Date", "Supplier", "Status", "SKU", "Product", "Ordered", "Received", "Unit cost", "Line total"],
        rows: pl.rows.map((l) => { const o = om.get(l.purchase_order_id); return [o?.po_number ?? "", String(o?.created_at ?? "").slice(0, 10), sm.get(o?.supplier_id)?.name ?? "", o?.status ?? "", pm.get(l.product_id)?.sku ?? "", pm.get(l.product_id)?.name ?? "", Number(l.quantity), Number(l.received_quantity), Number(l.unit_cost), round4(Number(l.quantity) * Number(l.unit_cost))]; }) };
    }
    default: return null;
  }
}
