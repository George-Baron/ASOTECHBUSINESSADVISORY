"use server";
import { redirect } from "next/navigation";
import { validateQuantity } from "@asotech/validation";
import type { MovementType } from "@asotech/types";
import { ctx, back, field, friendly } from "../../../lib/ctx";
import { isUuid, num } from "../../../components/core-util";

const TYPES: MovementType[] = ["receipt", "issue", "transfer", "return_in", "return_out", "opening_balance"];
const IN_ONLY: MovementType[] = ["receipt", "return_in", "opening_balance"];
const OUT_ONLY: MovementType[] = ["issue", "return_out"];
const ROWS = 8;

export async function postMovement(fd: FormData) {
  const c = await ctx();
  const here = "/movements/new";
  const type = field(fd, "movement_type") as MovementType;
  if (!TYPES.includes(type)) back(here, "error", "Choose a movement type.");
  if (type === "opening_balance" ? !(c.role === "owner" || c.role === "admin") : !c.can("movements.post")) {
    back(here, "error", type === "opening_balance" ? "Only owners and administrators can post opening balances." : "You do not have permission to post stock movements.");
  }
  const reference = field(fd, "reference") || `MV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  if (reference.length > 80) back(here, "error", "The reference is too long.");
  const from = field(fd, "from_location_id");
  const to = field(fd, "to_location_id");
  if (!OUT_ONLY.includes(type) && !isUuid(to)) back(here, "error", "Choose the destination bin.");
  if (!IN_ONLY.includes(type) && !isUuid(from)) back(here, "error", "Choose the source bin.");
  if (type === "transfer" && from === to) back(here, "error", "Source and destination must be different bins.");
  const idem = field(fd, "idem");
  if (idem.length < 8 || idem.length > 100) back(here, "error", "The form expired. Reload the page and try again.");

  type Line = { sku: string; qty: number; cost: number | null; batch: string; expiry: string };
  const lines: Line[] = [];
  for (let i = 0; i < ROWS; i++) {
    const sku = field(fd, `sku_${i}`);
    const qtyRaw = field(fd, `qty_${i}`);
    if (!sku && !qtyRaw) continue;
    if (!sku) back(here, "error", `Line ${i + 1}: enter a SKU or barcode.`);
    const q = validateQuantity(qtyRaw);
    if (!q.ok || q.value <= 0) back(here, "error", `Line ${i + 1}: quantity must be greater than zero.`);
    const cost = num(fd, `cost_${i}`);
    if (cost !== null && (Number.isNaN(cost) || cost < 0)) back(here, "error", `Line ${i + 1}: unit cost must be zero or more.`);
    lines.push({ sku, qty: (q as { ok: true; value: number }).value, cost, batch: field(fd, `batch_${i}`), expiry: field(fd, `expiry_${i}`) });
  }
  if (!lines.length) back(here, "error", "Add at least one line.");

  // Resolve SKU or barcode -> product.
  const keys = Array.from(new Set(lines.map((l) => l.sku)));
  const bySku = new Map<string, { id: string; track_batches: boolean; track_expiry: boolean; name: string }>();
  const { data: ps } = await c.sb.from("products").select("id, sku, name, track_batches, track_expiry, is_active").eq("organization_id", c.orgId).in("sku", keys);
  for (const p of (ps ?? []) as Array<{ id: string; sku: string; name: string; track_batches: boolean; track_expiry: boolean; is_active: boolean }>) if (p.is_active) bySku.set(p.sku, p);
  const missing = keys.filter((k) => !bySku.has(k));
  if (missing.length) {
    const { data: bc } = await c.sb.from("product_barcodes").select("barcode, product_id").eq("organization_id", c.orgId).in("barcode", missing);
    const ids = ((bc ?? []) as Array<{ product_id: string }>).map((b) => b.product_id);
    if (ids.length) {
      const { data: p2 } = await c.sb.from("products").select("id, name, track_batches, track_expiry, is_active").eq("organization_id", c.orgId).in("id", ids);
      const prod = new Map(((p2 ?? []) as Array<{ id: string; name: string; track_batches: boolean; track_expiry: boolean; is_active: boolean }>).map((p) => [p.id, p]));
      for (const b of (bc ?? []) as Array<{ barcode: string; product_id: string }>) { const p = prod.get(b.product_id); if (p?.is_active) bySku.set(b.barcode, p); }
    }
  }
  const unknown = keys.filter((k) => !bySku.has(k));
  if (unknown.length) back(here, "error", `Unknown or inactive product: ${unknown.slice(0, 5).join(", ")}.`);

  // Batches: existing ones are looked up; new ones are created only when stock comes IN.
  const canCreateBatch = IN_ONLY.includes(type);
  const payload: Array<Record<string, unknown>> = [];
  for (const [i, l] of lines.entries()) {
    const p = bySku.get(l.sku)!;
    let batchId: string | null = null;
    if (p.track_batches) {
      if (!l.batch) back(here, "error", `Line ${i + 1}: ${p.name} is batch-tracked. Enter a batch number.`);
      const { data: b } = await c.sb.from("batches").select("id").eq("organization_id", c.orgId).eq("product_id", p.id).eq("batch_no", l.batch).maybeSingle();
      if (b) batchId = b.id as string;
      else {
        if (!canCreateBatch) back(here, "error", `Line ${i + 1}: batch ${l.batch} does not exist for ${p.name}.`);
        if (p.track_expiry && !/^\d{4}-\d{2}-\d{2}$/.test(l.expiry)) back(here, "error", `Line ${i + 1}: enter an expiry date for new batch ${l.batch}.`);
        const { data: nb, error: be } = await c.sb.from("batches").insert({ organization_id: c.orgId, product_id: p.id, batch_no: l.batch, expiry_date: l.expiry || null }).select("id").single();
        if (be) back(here, "error", `Line ${i + 1}: ${friendly(be)}`);
        batchId = nb.id as string;
      }
    }
    payload.push({
      product_id: p.id, batch_id: batchId, quantity: l.qty, unit_cost: l.cost,
      from_location_id: IN_ONLY.includes(type) ? null : from,
      to_location_id: OUT_ONLY.includes(type) ? null : to,
    });
  }

  const { data: mid, error } = await c.sb.rpc("post_stock_movement", {
    p_org: c.orgId, p_type: type, p_reference: reference, p_lines: payload, p_idempotency_key: `ui-${idem}`, p_notes: field(fd, "notes") || null,
  });
  if (error) back(here, "error", friendly(error));
  redirect(`/movements/${mid}?notice=${encodeURIComponent("Movement posted to the ledger.")}`);
}

export async function reverseMovement(fd: FormData) {
  const c = await ctx();
  const id = field(fd, "id");
  if (!isUuid(id)) back("/movements", "error", "Movement not found.");
  const reason = field(fd, "reason");
  if (reason.length < 3) back(`/movements/${id}`, "error", "Enter a reason for the reversal.");
  const { data, error } = await c.sb.rpc("reverse_stock_movement", { p_org: c.orgId, p_movement: id, p_reason: reason });
  if (error) back(`/movements/${id}`, "error", friendly(error));
  redirect(`/movements/${data}?notice=${encodeURIComponent("Reversal posted. The original entry is unchanged.")}`);
}
