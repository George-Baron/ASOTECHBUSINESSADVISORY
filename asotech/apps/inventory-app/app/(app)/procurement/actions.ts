"use server";
import { redirect } from "next/navigation";
import { validateQuantity } from "@asotech/validation";
import { ctx, back, field, friendly } from "../../../lib/ctx";
import { isUuid, num } from "../../../components/core-util";
import { nextNumber } from "../../../components/data";
import { resolveProducts } from "../../../components/resolve";

const NO = "You do not have permission to manage procurement.";
const ROWS = 8;

export async function saveSupplier(fd: FormData) {
  const c = await ctx();
  if (!c.can("procurement.manage")) back("/procurement/suppliers", "error", NO);
  const id = field(fd, "id");
  const name = field(fd, "name");
  const email = field(fd, "email");
  if (name.length < 2 || name.length > 200) back("/procurement/suppliers", "error", "Enter the supplier name.");
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) back("/procurement/suppliers", "error", "Enter a valid email address.");
  const row = { name, contact_name: field(fd, "contact_name") || null, email: email || null, phone: field(fd, "phone") || null, address: field(fd, "address") || null };
  const { error } = id && isUuid(id)
    ? await c.sb.from("suppliers").update(row).eq("id", id).eq("organization_id", c.orgId)
    : await c.sb.from("suppliers").insert({ organization_id: c.orgId, ...row });
  if (error) back("/procurement/suppliers", "error", friendly(error));
  back("/procurement/suppliers", "notice", "Supplier saved.");
}

export async function setSupplierActive(fd: FormData) {
  const c = await ctx();
  const id = field(fd, "id");
  if (!c.can("procurement.manage") || !isUuid(id)) back("/procurement/suppliers", "error", NO);
  const { error } = await c.sb.from("suppliers").update({ is_active: field(fd, "active") === "true" }).eq("id", id).eq("organization_id", c.orgId);
  if (error) back("/procurement/suppliers", "error", friendly(error));
  back("/procurement/suppliers", "notice", "Supplier updated.");
}

export async function createPurchaseOrder(fd: FormData) {
  const c = await ctx();
  const here = "/procurement/orders/new";
  if (!c.can("procurement.manage")) back(here, "error", NO);
  const supplier = field(fd, "supplier_id");
  if (!isUuid(supplier)) back(here, "error", "Choose a supplier.");
  const expected = field(fd, "expected_date");
  if (expected && !/^\d{4}-\d{2}-\d{2}$/.test(expected)) back(here, "error", "Enter a valid expected date.");
  const raw: Array<{ sku: string; qty: number; cost: number }> = [];
  for (let i = 0; i < ROWS; i++) {
    const sku = field(fd, `sku_${i}`), qtyRaw = field(fd, `qty_${i}`);
    if (!sku && !qtyRaw) continue;
    const q = validateQuantity(qtyRaw);
    if (!sku || !q.ok || q.value <= 0) back(here, "error", `Line ${i + 1}: enter a SKU and a quantity above zero.`);
    const cost = num(fd, `cost_${i}`);
    if (cost === null || Number.isNaN(cost) || cost < 0) back(here, "error", `Line ${i + 1}: enter the unit cost.`);
    raw.push({ sku, qty: (q as { ok: true; value: number }).value, cost: cost as number });
  }
  if (!raw.length) back(here, "error", "Add at least one line.");
  const prods = await resolveProducts(c.sb, c.orgId, raw.map((r) => r.sku));
  const unknown = raw.filter((r) => !prods.has(r.sku)).map((r) => r.sku);
  if (unknown.length) back(here, "error", `Unknown or inactive product: ${unknown.slice(0, 5).join(", ")}.`);

  let poId: string | null = null;
  for (let attempt = 0; attempt < 5 && !poId; attempt++) {
    const po_number = await nextNumber(c.sb, "purchase_orders", "po_number", "PO", c.orgId, attempt);
    const { data, error } = await c.sb.from("purchase_orders").insert({
      organization_id: c.orgId, po_number, supplier_id: supplier, expected_date: expected || null, notes: field(fd, "notes") || null, created_by: c.session.userId, status: "draft",
    }).select("id").single();
    if (!error) poId = data.id as string;
    else if (error.code !== "23505") back(here, "error", friendly(error));
  }
  if (!poId) back(here, "error", "Could not allocate a PO number. Try again.");
  const { error: le } = await c.sb.from("purchase_order_lines").insert(raw.map((r) => ({ organization_id: c.orgId, purchase_order_id: poId, product_id: prods.get(r.sku)!.id, quantity: r.qty, unit_cost: r.cost })));
  if (le) {
    await c.sb.from("purchase_orders").delete().eq("id", poId).eq("organization_id", c.orgId);
    back(here, "error", friendly(le));
  }
  redirect(`/procurement/orders/${poId}?notice=${encodeURIComponent("Purchase order saved as a draft.")}`);
}

const FLOW: Record<string, string[]> = {
  submit: ["draft"], approve: ["pending_approval"], reopen: ["pending_approval", "approved"], cancel: ["draft", "pending_approval", "approved"],
};
const TARGET: Record<string, string> = { submit: "pending_approval", approve: "approved", reopen: "draft", cancel: "cancelled" };

export async function changePoStatus(fd: FormData) {
  const c = await ctx();
  const id = field(fd, "id");
  const act = field(fd, "action");
  const here = `/procurement/orders/${id}`;
  if (!isUuid(id) || !FLOW[act]) back("/procurement", "error", "Purchase order not found.");
  if (!c.can("procurement.manage")) back(here, "error", NO);
  // The database trigger additionally enforces: only owner/admin approve, never the PO creator.
  const { data, error } = await c.sb.from("purchase_orders").update({ status: TARGET[act] }).eq("id", id).eq("organization_id", c.orgId).in("status", FLOW[act]).select("id");
  if (error) back(here, "error", friendly(error));
  if (!data?.length) back(here, "error", "That change is not allowed for the purchase order's current status.");
  back(here, "notice", `Purchase order ${TARGET[act].replace("_", " ")}.`);
}

/** Creates a goods receipt (with lines) from a PO and posts it to the ledger in one step. */
export async function receiveGoods(fd: FormData) {
  const c = await ctx();
  const poId = field(fd, "po_id");
  const here = `/procurement/receipts/new?po=${poId}`;
  if (!c.can("procurement.manage")) back(here, "error", NO);
  if (!isUuid(poId)) back("/procurement", "error", "Purchase order not found.");
  const location = field(fd, "location_id");
  if (!isUuid(location)) back(here, "error", "Choose the bin the goods are received into.");
  const { data: po } = await c.sb.from("purchase_orders").select("id, status").eq("id", poId).eq("organization_id", c.orgId).maybeSingle();
  if (!po || !["approved", "partially_received"].includes(po.status)) back(here, "error", "Only approved purchase orders can be received.");
  const { data: pl } = await c.sb.from("purchase_order_lines").select("id, product_id, quantity, received_quantity, unit_cost").eq("purchase_order_id", poId).eq("organization_id", c.orgId);
  const out: Array<Record<string, unknown>> = [];
  for (const l of (pl ?? []) as Array<{ id: string; product_id: string; quantity: number; received_quantity: number; unit_cost: number }>) {
    const raw = field(fd, `q_${l.id}`);
    if (!raw) continue;
    const q = validateQuantity(raw);
    if (!q.ok) back(here, "error", Object.values(q.errors)[0]);
    const qty = (q as { ok: true; value: number }).value;
    if (qty === 0) continue;
    const outstanding = Number(l.quantity) - Number(l.received_quantity);
    if (qty > outstanding + 1e-9) back(here, "error", `You entered more than the ${outstanding} still outstanding on a line.`);
    const expiry = field(fd, `x_${l.id}`);
    out.push({ organization_id: c.orgId, po_line_id: l.id, product_id: l.product_id, location_id: location, quantity: qty, unit_cost: l.unit_cost, batch_no: field(fd, `b_${l.id}`) || null, expiry_date: /^\d{4}-\d{2}-\d{2}$/.test(expiry) ? expiry : null });
  }
  if (!out.length) back(here, "error", "Enter a received quantity on at least one line.");

  let grId: string | null = null;
  for (let attempt = 0; attempt < 5 && !grId; attempt++) {
    const receipt_no = await nextNumber(c.sb, "goods_receipts", "receipt_no", "GR", c.orgId, attempt);
    const { data, error } = await c.sb.from("goods_receipts").insert({ organization_id: c.orgId, receipt_no, purchase_order_id: poId, received_by: c.session.userId, status: "draft" }).select("id").single();
    if (!error) grId = data.id as string;
    else if (error.code !== "23505") back(here, "error", friendly(error));
  }
  if (!grId) back(here, "error", "Could not allocate a receipt number. Try again.");
  const { error: le } = await c.sb.from("goods_receipt_lines").insert(out.map((o) => ({ ...o, goods_receipt_id: grId })));
  if (le) { await c.sb.from("goods_receipts").delete().eq("id", grId).eq("organization_id", c.orgId); back(here, "error", friendly(le)); }
  const { error: pe } = await c.sb.rpc("post_goods_receipt", { p_org: c.orgId, p_receipt: grId });
  if (pe) redirect(`/procurement/receipts?error=${encodeURIComponent(`Receipt saved as a draft but not posted: ${friendly(pe)}`)}`);
  redirect(`/procurement/orders/${poId}?notice=${encodeURIComponent("Goods received and posted to the ledger.")}`);
}

export async function postDraftReceipt(fd: FormData) {
  const c = await ctx();
  const id = field(fd, "id");
  if (!isUuid(id)) back("/procurement/receipts", "error", "Receipt not found.");
  const { error } = await c.sb.rpc("post_goods_receipt", { p_org: c.orgId, p_receipt: id });
  if (error) back("/procurement/receipts", "error", friendly(error));
  back("/procurement/receipts", "notice", "Receipt posted to the ledger.");
}
