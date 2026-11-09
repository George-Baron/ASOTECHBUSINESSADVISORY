import type { Sb, AnyRow } from "./core-util";

/** Resolve SKUs or barcodes to active products of the organisation. Returns a map keyed by what the user typed. */
export async function resolveProducts(sb: Sb, orgId: string, keys: string[]): Promise<Map<string, AnyRow>> {
  const out = new Map<string, AnyRow>();
  const uniq = Array.from(new Set(keys.filter(Boolean)));
  if (!uniq.length) return out;
  const { data } = await sb.from("products").select("id, sku, name, cost_price, track_batches, track_expiry, is_active").eq("organization_id", orgId).in("sku", uniq);
  for (const p of (data ?? []) as AnyRow[]) if (p.is_active) out.set(p.sku, p);
  const rest = uniq.filter((k) => !out.has(k));
  if (rest.length) {
    const { data: bc } = await sb.from("product_barcodes").select("barcode, product_id").eq("organization_id", orgId).in("barcode", rest);
    const ids = ((bc ?? []) as AnyRow[]).map((b) => b.product_id);
    if (ids.length) {
      const { data: p2 } = await sb.from("products").select("id, sku, name, cost_price, track_batches, track_expiry, is_active").eq("organization_id", orgId).in("id", ids);
      const m = new Map(((p2 ?? []) as AnyRow[]).map((p) => [p.id, p]));
      for (const b of (bc ?? []) as AnyRow[]) { const p = m.get(b.product_id); if (p?.is_active) out.set(b.barcode, p); }
    }
  }
  return out;
}
