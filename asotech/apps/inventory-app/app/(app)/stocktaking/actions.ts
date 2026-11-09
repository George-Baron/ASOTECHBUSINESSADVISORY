"use server";
import { redirect } from "next/navigation";
import { validateQuantity } from "@asotech/validation";
import { ctx, back, field, friendly } from "../../../lib/ctx";
import { isUuid } from "../../../components/core-util";

const NO = "You do not have permission to run stocktakes.";

export async function createSession(fd: FormData) {
  const c = await ctx();
  const countType = field(fd, "count_type") === "cycle" ? "cycle" : field(fd, "count_type") === "spot" ? "spot" : "full";
  const here = countType === "cycle" ? "/cycle-counting" : "/stocktaking";
  if (!c.can("stocktake.run")) back(here, "error", NO);
  const warehouse = field(fd, "warehouse_id");
  const name = field(fd, "name");
  if (!isUuid(warehouse)) back(here, "error", "Choose a warehouse.");
  if (name.length < 2 || name.length > 120) back(here, "error", "Enter a name for the count.");
  const locationIds = fd.getAll("location_ids").filter((v): v is string => typeof v === "string" && isUuid(v));

  // Optional product filter: SKUs or barcodes, one per line or comma separated.
  const rawList = field(fd, "skus").split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean).slice(0, 500);
  let productIds: string[] | null = null;
  if (rawList.length) {
    const { data } = await c.sb.from("products").select("id, sku").eq("organization_id", c.orgId).in("sku", rawList);
    const found = new Set(((data ?? []) as Array<{ id: string; sku: string }>).map((p) => p.sku));
    const { data: bc } = await c.sb.from("product_barcodes").select("product_id, barcode").eq("organization_id", c.orgId).in("barcode", rawList.filter((s) => !found.has(s)));
    productIds = [...((data ?? []) as Array<{ id: string }>).map((p) => p.id), ...((bc ?? []) as Array<{ product_id: string }>).map((b) => b.product_id)];
    if (!productIds.length) back(here, "error", "None of the SKUs or barcodes you entered were found.");
  }
  const category = field(fd, "category_id");
  if (isUuid(category)) {
    const { data } = await c.sb.from("products").select("id").eq("organization_id", c.orgId).eq("category_id", category).limit(5000);
    const ids = ((data ?? []) as Array<{ id: string }>).map((p) => p.id);
    productIds = productIds ? productIds.filter((x) => ids.includes(x)) : ids;
    if (!productIds.length) back(here, "error", "No products match that category and SKU selection.");
  }
  if (countType === "cycle" && !productIds && !locationIds.length) back(here, "error", "A cycle count needs a product list, a category or at least one bin.");

  const { data, error } = await c.sb.rpc("create_count_session", {
    p_org: c.orgId, p_warehouse: warehouse, p_name: name, p_count_type: countType,
    p_location_ids: locationIds.length ? locationIds : null, p_product_ids: productIds, p_blind: field(fd, "blind") !== "off",
  });
  if (error) back(here, "error", friendly(error));
  redirect(`/stocktaking/${data}?notice=${encodeURIComponent("Count started. System quantities were snapshotted.")}`);
}

/** Saves every filled-in `q_<lineId>` quantity on the submitted page of the count sheet. */
export async function saveCounts(fd: FormData) {
  const c = await ctx();
  const sid = field(fd, "session_id");
  const here = `/stocktaking/${sid}`;
  if (!isUuid(sid)) back("/stocktaking", "error", "Count not found.");
  let saved = 0;
  for (const [key, val] of fd.entries()) {
    if (!key.startsWith("q_") || typeof val !== "string" || val.trim() === "") continue;
    const lineId = key.slice(2);
    if (!isUuid(lineId)) continue;
    const q = validateQuantity(val);
    if (!q.ok) back(here, "error", `Line ${lineId.slice(0, 6)}: ${Object.values(q.errors)[0]}`);
    const { error } = await c.sb.rpc("record_count", { p_org: c.orgId, p_line: lineId, p_quantity: (q as { ok: true; value: number }).value, p_source: "web", p_note: null });
    if (error) back(here, "error", `${saved} saved before an error: ${friendly(error)}`);
    saved++;
  }
  back(here, saved ? "notice" : "error", saved ? `${saved} count${saved === 1 ? "" : "s"} saved.` : "Enter at least one quantity.");
}

export async function assignLines(fd: FormData) {
  const c = await ctx();
  const sid = field(fd, "session_id");
  const here = `/stocktaking/${sid}`;
  if (!c.can("stocktake.run")) back(here, "error", NO);
  const user = field(fd, "user_id");
  const locs = fd.getAll("location_ids").filter((v): v is string => typeof v === "string" && isUuid(v));
  if (!isUuid(sid) || !isUuid(user) || !locs.length) back(here, "error", "Choose a counter and at least one bin.");
  const { data, error } = await c.sb.rpc("assign_count_lines", { p_org: c.orgId, p_session: sid, p_location_ids: locs, p_user: user });
  if (error) back(here, "error", friendly(error));
  back(here, "notice", `${data} line(s) assigned.`);
}

export async function requestRecount(fd: FormData) {
  const c = await ctx();
  const sid = field(fd, "session_id");
  const line = field(fd, "line_id");
  if (!isUuid(sid) || !isUuid(line)) back("/stocktaking", "error", "Line not found.");
  const { error } = await c.sb.rpc("request_recount", { p_org: c.orgId, p_line: line, p_note: field(fd, "note") || null });
  if (error) back(`/stocktaking/${sid}`, "error", friendly(error));
  back(`/stocktaking/${sid}`, "notice", "Recount requested.");
}

export async function closeCounting(fd: FormData) {
  const c = await ctx();
  const sid = field(fd, "session_id");
  if (!isUuid(sid)) back("/stocktaking", "error", "Count not found.");
  const { error } = await c.sb.rpc("close_counting", { p_org: c.orgId, p_session: sid });
  if (error) back(`/stocktaking/${sid}`, "error", friendly(error));
  back(`/stocktaking/${sid}`, "notice", "Counting closed. Start the reconciliation when ready.");
}

export async function startReconciliation(fd: FormData) {
  const c = await ctx();
  const sid = field(fd, "session_id");
  if (!isUuid(sid)) back("/stocktaking", "error", "Count not found.");
  const { data, error } = await c.sb.rpc("open_reconciliation", { p_org: c.orgId, p_session: sid });
  if (error) back(`/stocktaking/${sid}`, "error", friendly(error));
  redirect(`/reconciliation/${data}?notice=${encodeURIComponent("Reconciliation opened. Add a reason for each variance, then submit for approval.")}`);
}

export async function cancelSession(fd: FormData) {
  const c = await ctx();
  const sid = field(fd, "session_id");
  if (!isUuid(sid)) back("/stocktaking", "error", "Count not found.");
  if (!c.can("stocktake.run")) back(`/stocktaking/${sid}`, "error", NO);
  const { error } = await c.sb.rpc("cancel_count_session", { p_org: c.orgId, p_session: sid });
  if (error) back(`/stocktaking/${sid}`, "error", friendly(error));
  back("/stocktaking", "notice", "Count cancelled. No stock was changed.");
}
