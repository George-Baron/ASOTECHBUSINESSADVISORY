"use server";
import { staffCtx, back, field, friendly, isUuid, optUuid, dateField, numField } from "../../../lib/ctx";

const L = "/quotations";
const ROWS = 8;

interface Line { description: string; quantity: number; unit_price: number; amount: number }

/** Parses up to 8 line rows. Amounts are computed here, never trusted from the browser. */
function parseLines(fd: FormData): Line[] | string {
  const lines: Line[] = [];
  for (let i = 0; i < ROWS; i++) {
    const description = field(fd, `desc_${i}`);
    const qty = numField(fd, `qty_${i}`);
    const price = numField(fd, `price_${i}`);
    if (!description && qty === null && price === null) continue;
    if (!description) return `Line ${i + 1}: enter a description.`;
    if (qty === null || Number.isNaN(qty) || qty <= 0) return `Line ${i + 1}: quantity must be greater than zero.`;
    if (price === null || Number.isNaN(price) || price < 0) return `Line ${i + 1}: unit price must be zero or more.`;
    lines.push({ description: description.slice(0, 300), quantity: qty, unit_price: price, amount: Math.round(qty * price * 100) / 100 });
  }
  return lines.length ? lines : "Add at least one line item.";
}

export async function createQuotation(fd: FormData) {
  const { sb } = await staffCtx();
  const org = field(fd, "organization_id");
  if (!isUuid(org)) back(L, "error", "Choose a client.");
  const lines = parseLines(fd);
  if (typeof lines === "string") back(`${L}?org=${org}`, "error", lines);
  const items = lines as Line[];
  const total = Math.round(items.reduce((s, l) => s + l.amount, 0) * 100) / 100;
  const currency = /^[A-Z]{3}$/.test(field(fd, "currency")) ? field(fd, "currency") : "NGN";
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  // Number = QT-YYYYMMDD-NNN; retried on the unique (organization_id, quote_number) constraint.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { count } = await sb.from("quotations").select("id", { count: "exact", head: true }).eq("organization_id", org).like("quote_number", `QT-${stamp}-%`);
    const number = `QT-${stamp}-${String((count ?? 0) + 1 + attempt).padStart(3, "0")}`;
    const { data, error } = await sb.from("quotations").insert({
      organization_id: org, software_project_id: optUuid(fd, "software_project_id"), quote_number: number, currency,
      line_items: items, total_amount: total, valid_until: dateField(fd, "valid_until"), status: "draft",
    }).select("id").single();
    if (!error && data) back(`${L}/${data.id}`, "notice", `Quotation ${number} saved as a draft.`);
    if (error?.code !== "23505") back(L, "error", friendly(error));
  }
  back(L, "error", "Could not allocate a quotation number. Please try again.");
}

export async function setQuoteStatus(fd: FormData) {
  const { sb } = await staffCtx();
  const id = field(fd, "id");
  if (!isUuid(id)) back(L, "error", "Quotation not found.");
  const to = field(fd, "to");
  const { data: cur } = await sb.from("quotations").select("status").eq("id", id).maybeSingle();
  if (!cur) back(L, "error", "Quotation not found.");
  // Staff: draft -> sent, sent -> draft (withdraw), sent -> expired. accepted/rejected are the client's decision.
  const allowed: Record<string, string[]> = { draft: ["sent"], sent: ["draft", "expired"] };
  if (!(allowed[cur.status] ?? []).includes(to)) back(`${L}/${id}`, "error", "That status change is not allowed.");
  const { error } = await sb.from("quotations").update({ status: to }).eq("id", id);
  if (error) back(`${L}/${id}`, "error", friendly(error));
  back(`${L}/${id}`, "notice", to === "sent" ? "Quotation sent to the client." : "Quotation updated.");
}
