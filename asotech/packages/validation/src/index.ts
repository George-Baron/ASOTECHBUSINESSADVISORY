// Dependency-free validators. Each returns { ok: true, value } or { ok: false, errors }.
// The same rules are enforced again by CHECK constraints in PostgreSQL.

export type Result<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE = /^[+()\d\s-]{7,30}$/;

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const optional = (v: unknown): string | null => { const s = str(v); return s === "" ? null : s; };

function finish<T>(errors: Record<string, string>, value: T): Result<T> {
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

export interface ContactInput { full_name: string; email: string; phone: string | null; subject: string | null; message: string }
export function validateContact(raw: Record<string, unknown>): Result<ContactInput> {
  const e: Record<string, string> = {};
  const full_name = str(raw.full_name), email = str(raw.email), message = str(raw.message);
  const phone = optional(raw.phone), subject = optional(raw.subject);
  if (full_name.length < 2 || full_name.length > 120) e.full_name = "Enter your full name";
  if (!EMAIL.test(email) || email.length > 254) e.email = "Enter a valid email address";
  if (phone && !PHONE.test(phone)) e.phone = "Enter a valid phone number";
  if (subject && subject.length > 200) e.subject = "Subject is too long";
  if (message.length < 5 || message.length > 5000) e.message = "Message must be 5 to 5000 characters";
  return finish(e, { full_name, email, phone, subject, message });
}

export interface ConsultationInput {
  full_name: string; email: string; phone: string | null; company: string | null; service_slug: string | null;
  preferred_date: string | null; preferred_time: "morning" | "afternoon" | "evening" | null;
  meeting_mode: "video" | "phone" | "in_person"; message: string | null;
}
export function validateConsultation(raw: Record<string, unknown>, today = new Date()): Result<ConsultationInput> {
  const e: Record<string, string> = {};
  const full_name = str(raw.full_name), email = str(raw.email);
  const phone = optional(raw.phone), company = optional(raw.company), message = optional(raw.message);
  const service_slug = optional(raw.service_slug);
  const preferred_date = optional(raw.preferred_date);
  const preferred_time = optional(raw.preferred_time) as ConsultationInput["preferred_time"];
  const meeting_mode = (str(raw.meeting_mode) || "video") as ConsultationInput["meeting_mode"];
  if (full_name.length < 2 || full_name.length > 120) e.full_name = "Enter your full name";
  if (!EMAIL.test(email) || email.length > 254) e.email = "Enter a valid email address";
  if (phone && !PHONE.test(phone)) e.phone = "Enter a valid phone number";
  if (company && company.length > 200) e.company = "Company name is too long";
  if (preferred_date) {
    const d = new Date(preferred_date + "T00:00:00Z");
    const startOfToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(preferred_date) || Number.isNaN(d.getTime())) e.preferred_date = "Choose a valid date";
    else if (d.getTime() < startOfToday) e.preferred_date = "Choose a date from today onwards";
  }
  if (preferred_time && !["morning", "afternoon", "evening"].includes(preferred_time)) e.preferred_time = "Choose a time of day";
  if (!["video", "phone", "in_person"].includes(meeting_mode)) e.meeting_mode = "Choose how you would like to meet";
  if (message && message.length > 5000) e.message = "Message is too long";
  return finish(e, { full_name, email, phone, company, service_slug, preferred_date, preferred_time, meeting_mode, message });
}

export interface ProposalInput {
  full_name: string; email: string; phone: string | null; company: string | null; service_slug: string | null;
  budget_range: string | null; timeline: string | null; scope: string;
}
export function validateProposal(raw: Record<string, unknown>): Result<ProposalInput> {
  const e: Record<string, string> = {};
  const full_name = str(raw.full_name), email = str(raw.email), scope = str(raw.scope);
  const phone = optional(raw.phone), company = optional(raw.company), service_slug = optional(raw.service_slug);
  const budget_range = optional(raw.budget_range), timeline = optional(raw.timeline);
  if (full_name.length < 2 || full_name.length > 120) e.full_name = "Enter your full name";
  if (!EMAIL.test(email) || email.length > 254) e.email = "Enter a valid email address";
  if (phone && !PHONE.test(phone)) e.phone = "Enter a valid phone number";
  if (scope.length < 10 || scope.length > 8000) e.scope = "Describe what you need (at least 10 characters)";
  if (budget_range && budget_range.length > 60) e.budget_range = "Too long";
  if (timeline && timeline.length > 60) e.timeline = "Too long";
  return finish(e, { full_name, email, phone, company, service_slug, budget_range, timeline, scope });
}

export interface ProductInput {
  sku: string; name: string; description: string | null; barcode: string | null; uom_code: string | null;
  cost_price: number; sale_price: number; reorder_level: number; track_batches: boolean; track_expiry: boolean;
}
const num = (v: unknown, d = 0): number => { const s = str(v); if (s === "") return d; const n = Number(s.replace(/,/g, "")); return n; };

export function validateProduct(raw: Record<string, unknown>): Result<ProductInput> {
  const e: Record<string, string> = {};
  const sku = str(raw.sku), name = str(raw.name);
  const description = optional(raw.description), barcode = optional(raw.barcode), uom_code = optional(raw.uom_code);
  const cost_price = num(raw.cost_price), sale_price = num(raw.sale_price), reorder_level = num(raw.reorder_level);
  const flag = (v: unknown) => ["true", "1", "yes", "y", "on"].includes(str(v).toLowerCase()) || v === true;
  const track_expiry = flag(raw.track_expiry);
  const track_batches = flag(raw.track_batches) || track_expiry;
  if (sku.length < 1 || sku.length > 64) e.sku = "SKU is required (max 64 characters)";
  if (name.length < 1 || name.length > 300) e.name = "Name is required";
  if (barcode && (barcode.length < 3 || barcode.length > 64)) e.barcode = "Barcode must be 3 to 64 characters";
  for (const [k, v] of [["cost_price", cost_price], ["sale_price", sale_price], ["reorder_level", reorder_level]] as const) {
    if (!Number.isFinite(v) || v < 0) e[k] = "Must be a number, zero or more";
  }
  return finish(e, { sku, name, description, barcode, uom_code, cost_price, sale_price, reorder_level, track_batches, track_expiry });
}

export interface ImportReport { valid: ProductInput[]; errors: Array<{ row: number; errors: Record<string, string> }>; duplicates: string[] }

/** Validates rows parsed from a CSV or Excel sheet (header keys lower_snake_case). Row numbers are 1-based incl. header. */
export function validateProductRows(rows: Array<Record<string, string>>, maxRows = 5000): ImportReport {
  const report: ImportReport = { valid: [], errors: [], duplicates: [] };
  if (rows.length > maxRows) {
    report.errors.push({ row: 0, errors: { file: `File has ${rows.length} rows; the limit is ${maxRows} per import` } });
    return report;
  }
  const seenSku = new Set<string>(), seenBarcode = new Set<string>();
  rows.forEach((r, i) => {
    const res = validateProduct(r);
    if (!res.ok) { report.errors.push({ row: i + 2, errors: res.errors }); return; }
    const sku = res.value.sku.toLowerCase();
    if (seenSku.has(sku)) { report.duplicates.push(res.value.sku); report.errors.push({ row: i + 2, errors: { sku: "Duplicate SKU in file" } }); return; }
    if (res.value.barcode) {
      if (seenBarcode.has(res.value.barcode)) { report.errors.push({ row: i + 2, errors: { barcode: "Duplicate barcode in file" } }); return; }
      seenBarcode.add(res.value.barcode);
    }
    seenSku.add(sku);
    report.valid.push(res.value);
  });
  return report;
}

export function validateQuantity(v: unknown): Result<number> {
  const s = str(v);
  const n = Number(s);
  if (s === "" || !Number.isFinite(n)) return { ok: false, errors: { quantity: "Enter a number" } };
  if (n < 0) return { ok: false, errors: { quantity: "Quantity cannot be negative" } };
  if (n > 1e9) return { ok: false, errors: { quantity: "Quantity is too large" } };
  return { ok: true, value: n };
}

export const ALLOWED_UPLOAD_MIME = [
  "text/csv", "application/vnd.ms-excel", "application/pdf", "image/png", "image/jpeg", "text/plain",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export function validateUpload(file: { name: string; size: number; type: string }, maxBytes = 20 * 1024 * 1024): Result<true> {
  const e: Record<string, string> = {};
  if (file.size <= 0) e.file = "The file is empty";
  else if (file.size > maxBytes) e.file = `File exceeds ${Math.round(maxBytes / 1048576)} MB`;
  if (!(ALLOWED_UPLOAD_MIME as readonly string[]).includes(file.type)) e.type = "File type is not allowed";
  if (/[\\/]|\.\./.test(file.name) || file.name.length > 200) e.name = "Invalid file name";
  if (/\.(exe|bat|cmd|sh|js|mjs|msi|dll|com|scr|ps1|vbs|jar|html?|svg)$/i.test(file.name)) e.name = "This file extension is not allowed";
  return finish(e, true as const);
}

/** Honeypot + minimum fill time check for public forms. */
export function looksLikeBot(raw: Record<string, unknown>, now = Date.now()): boolean {
  if (str(raw.website_url) !== "") return true;
  const started = Number(raw._t);
  return Number.isFinite(started) && started > 0 && now - started < 1500;
}
