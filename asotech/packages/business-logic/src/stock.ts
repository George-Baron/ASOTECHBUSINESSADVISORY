// Pure stock calculations used by the UI and tested independently of the database.

export interface BatchStock { batch_id: string; batch_no: string; expiry_date: string | null; quantity: number; location_id?: string }

/** First-Expired-First-Out allocation. Expired stock is never allocated. Items without expiry go last. */
export function allocateFefo(
  batches: BatchStock[], needed: number, today = new Date().toISOString().slice(0, 10),
): { picks: Array<BatchStock & { take: number }>; shortfall: number } {
  const usable = batches
    .filter((b) => b.quantity > 0 && (b.expiry_date === null || b.expiry_date >= today))
    .sort((a, b) => {
      if (a.expiry_date === b.expiry_date) return a.batch_no.localeCompare(b.batch_no);
      if (a.expiry_date === null) return 1;
      if (b.expiry_date === null) return -1;
      return a.expiry_date.localeCompare(b.expiry_date);
    });
  let remaining = needed;
  const picks: Array<BatchStock & { take: number }> = [];
  for (const b of usable) {
    if (remaining <= 0) break;
    const take = Math.min(b.quantity, remaining);
    picks.push({ ...b, take });
    remaining -= take;
  }
  return { picks, shortfall: Math.max(0, round4(remaining)) };
}

export const round4 = (n: number): number => Math.round(n * 10000) / 10000;

export function expiryStatus(expiry: string | null, today = new Date(), warningDays = 90): "none" | "ok" | "near_expiry" | "expired" {
  if (!expiry) return "none";
  const d = new Date(expiry + "T00:00:00Z").getTime();
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  if (d < t) return "expired";
  return d - t <= warningDays * 86400000 ? "near_expiry" : "ok";
}

export interface VarianceRow { system_qty: number; counted_qty: number; unit_cost: number }
export function summariseVariance(rows: VarianceRow[]) {
  let lines = 0, overQty = 0, underQty = 0, overValue = 0, underValue = 0, matched = 0;
  for (const r of rows) {
    const v = round4(r.counted_qty - r.system_qty);
    if (v === 0) { matched++; continue; }
    lines++;
    if (v > 0) { overQty += v; overValue += v * r.unit_cost; } else { underQty += -v; underValue += -v * r.unit_cost; }
  }
  const total = rows.length;
  return {
    totalLines: total, matchedLines: matched, varianceLines: lines,
    overQty: round4(overQty), underQty: round4(underQty),
    overValue: round4(overValue), underValue: round4(underValue), netValue: round4(overValue - underValue),
    accuracyPct: total === 0 ? 100 : Math.round((matched / total) * 1000) / 10,
  };
}

export const isLowStock = (qty: number, reorderLevel: number): boolean => qty <= reorderLevel;

export function inventoryValue(rows: Array<{ quantity: number; cost_price: number }>): number {
  return round4(rows.reduce((s, r) => s + r.quantity * r.cost_price, 0));
}
