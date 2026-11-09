import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Vendor-neutral ERP connector contract. ASOTECH does not claim an active ERP integration until a
 * concrete adapter has been implemented AND verified against a real tenant (API access and
 * subscription entitlements confirmed). The default adapter below reports "not configured".
 */
export interface ErpConnector {
  readonly name: string;
  verify(): Promise<{ ok: boolean; detail: string }>;
  pullProducts(since?: string): Promise<ErpProduct[]>;
  pullWarehouses(): Promise<Array<{ external_ref: string; code: string; name: string }>>;
  pullStockBalances(): Promise<Array<{ product_ref: string; location_ref: string; quantity: number; lot?: string }>>;
  pushStockMovement(m: ErpMovement): Promise<{ external_ref: string }>;
  pushApprovedAdjustment(a: ErpAdjustment): Promise<{ external_ref: string }>;
}
export interface ErpProduct { external_ref: string; sku: string; name: string; barcode?: string; cost_price?: number; sale_price?: number }
export interface ErpMovement { idempotency_key: string; type: string; reference: string; lines: Array<{ product_ref: string; from_ref?: string; to_ref?: string; quantity: number; lot?: string; expiry_date?: string }> }
export interface ErpAdjustment { idempotency_key: string; reference: string; lines: Array<{ product_ref: string; location_ref: string; quantity_delta: number; lot?: string }> }

export class NotConfiguredErpConnector implements ErpConnector {
  readonly name = "not-configured";
  private fail(): never { throw new Error("No ERP system is connected. Configure and verify a connector first."); }
  async verify() { return { ok: false, detail: "No ERP connector configured" }; }
  async pullProducts(): Promise<ErpProduct[]> { return this.fail(); }
  async pullWarehouses(): Promise<never> { return this.fail(); }
  async pullStockBalances(): Promise<never> { return this.fail(); }
  async pushStockMovement(): Promise<never> { return this.fail(); }
  async pushApprovedAdjustment(): Promise<never> { return this.fail(); }
}

// ------------------------------------------------------------------------------------------------
// AppSheet count capture payload
// ------------------------------------------------------------------------------------------------
export interface AppSheetCountPayload { event_key: string; line_id: string; quantity: number; note?: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseAppSheetCount(body: unknown): { ok: true; value: AppSheetCountPayload } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Body must be a JSON object" };
  const b = body as Record<string, unknown>;
  const event_key = typeof b.event_key === "string" ? b.event_key.trim() : "";
  const line_id = typeof b.line_id === "string" ? b.line_id.trim() : "";
  const quantity = typeof b.quantity === "number" ? b.quantity : Number(b.quantity);
  if (event_key.length < 8 || event_key.length > 200) return { ok: false, error: "event_key must be 8-200 characters and unique per scan" };
  if (!UUID.test(line_id)) return { ok: false, error: "line_id must be a UUID" };
  if (!Number.isFinite(quantity) || quantity < 0 || quantity > 1e9) return { ok: false, error: "quantity must be a number between 0 and 1,000,000,000" };
  const note = typeof b.note === "string" ? b.note.slice(0, 500) : undefined;
  return { ok: true, value: { event_key, line_id, quantity, note } };
}

export const sha256Hex = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");

/** Constant-time comparison of a presented API key against the stored SHA-256 hash. */
export function apiKeyMatches(presentedKey: string | null | undefined, storedHashHex: string): boolean {
  if (!presentedKey) return false;
  const a = Buffer.from(sha256Hex(presentedKey), "utf8"), b = Buffer.from(storedHashHex, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
