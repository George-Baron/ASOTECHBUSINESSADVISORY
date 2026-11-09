"use server";
import { csvToObjects } from "@asotech/utilities";
import { validateProductRows, validateUpload, type ProductInput } from "@asotech/validation";
import { ctx, back, friendly } from "../../../../lib/ctx";

const MAX_ROWS = 5000;
const MAX_BYTES = 5 * 1024 * 1024;

/** Reads an uploaded CSV or XLSX into lower_snake_case keyed rows. */
async function readRows(file: File): Promise<Array<Record<string, string>>> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) {
    const { default: readXlsxFile } = await import("read-excel-file/node");
    const buf = Buffer.from(await file.arrayBuffer());
    const sheet: unknown[][] = await readXlsxFile(buf);
    const [head, ...rest] = sheet;
    if (!head) return [];
    const keys = head.map((h) => String(h ?? "").trim().toLowerCase().replace(/\s+/g, "_"));
    return rest.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] === null || r[i] === undefined ? "" : String(r[i]).trim()])));
  }
  return csvToObjects(await file.text());
}

export interface PreviewState {
  error?: string;
  summary?: { total: number; valid: number; skipped: number; errors: Array<{ row: number; errors: Record<string, string> }> };
  rows?: string; // validated rows as JSON, posted back in step 2 (re-validated there)
}

/** Step 1: validate the file and return a preview. Nothing is written. Used with useActionState. */
export async function previewImport(_prev: PreviewState, fd: FormData): Promise<PreviewState> {
  const c = await ctx();
  if (!c.can("products.manage")) return { error: "You do not have permission to import products." };
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV or Excel (.xlsx) file." };
  if (!/\.(csv|xlsx)$/i.test(file.name)) return { error: "Only .csv and .xlsx files can be imported." };
  if (file.size > MAX_BYTES) return { error: "The file is larger than 5 MB." };
  const mime = file.name.toLowerCase().endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv";
  const up = validateUpload({ name: file.name, size: file.size, type: mime });
  if (!up.ok) return { error: Object.values(up.errors).join(". ") };

  let rows: Array<Record<string, string>>;
  try { rows = await readRows(file); } catch { return { error: "The file could not be read. Check that it is a valid CSV or Excel file." }; }
  if (!rows.length) return { error: "The file has no data rows." };
  const report = validateProductRows(rows, MAX_ROWS);

  // Skip SKUs that already exist in this organisation (never overwrite).
  const existing = new Set<string>();
  const skus = report.valid.map((v) => v.sku);
  for (let i = 0; i < skus.length; i += 200) {
    const { data } = await c.sb.from("products").select("sku").eq("organization_id", c.orgId).in("sku", skus.slice(i, i + 200));
    for (const r of (data ?? []) as Array<{ sku: string }>) existing.add(r.sku.toLowerCase());
  }
  const fresh = report.valid.filter((v) => !existing.has(v.sku.toLowerCase()));
  return {
    summary: { total: rows.length, valid: fresh.length, skipped: report.valid.length - fresh.length, errors: report.errors.slice(0, 50) },
    rows: JSON.stringify(fresh),
  };
}

/** Step 2: re-validate the rows and insert them. */
export async function confirmImport(fd: FormData) {
  const c = await ctx();
  if (!c.can("products.manage")) back("/products/import", "error", "You do not have permission to import products.");
  const raw = fd.get("rows");
  let parsed: unknown;
  try { parsed = JSON.parse(typeof raw === "string" ? raw : "[]"); } catch { back("/products/import", "error", "The preview expired. Upload the file again."); }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > MAX_ROWS) back("/products/import", "error", "Nothing to import. Upload the file again.");
  const report = validateProductRows((parsed as Array<Record<string, unknown>>).map((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v ?? "")]))), MAX_ROWS);
  if (report.errors.length) back("/products/import", "error", "Some rows are no longer valid. Upload the file again.");
  const rows: ProductInput[] = report.valid;

  const { data: uoms } = await c.sb.from("units_of_measure").select("id, code").eq("organization_id", c.orgId);
  const uomId = new Map<string, string>(((uoms ?? []) as Array<{ id: string; code: string }>).map((u) => [u.code.toUpperCase(), u.id]));
  const unknownUom = Array.from(new Set(rows.filter((r) => r.uom_code && !uomId.has(r.uom_code.toUpperCase())).map((r) => r.uom_code as string)));
  if (unknownUom.length) back("/products/import", "error", `Unknown unit(s) of measure: ${unknownUom.join(", ")}. Add them under Products > Categories & units first.`);

  let created = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { data, error } = await c.sb.from("products").insert(chunk.map((r) => ({
      organization_id: c.orgId, sku: r.sku, name: r.name, description: r.description,
      uom_id: r.uom_code ? uomId.get(r.uom_code.toUpperCase()) ?? null : null,
      cost_price: r.cost_price, sale_price: r.sale_price, reorder_level: r.reorder_level,
      track_batches: r.track_batches, track_expiry: r.track_expiry,
    }))).select("id, sku");
    if (error) back("/products/import", "error", `Imported ${created} product(s) before stopping: ${friendly(error)}`);
    const idBySku = new Map<string, string>(((data ?? []) as Array<{ id: string; sku: string }>).map((p) => [p.sku, p.id]));
    const codes = chunk.filter((r) => r.barcode && idBySku.has(r.sku)).map((r) => ({
      organization_id: c.orgId, product_id: idBySku.get(r.sku)!, barcode: r.barcode as string, is_primary: true,
    }));
    if (codes.length) await c.sb.from("product_barcodes").insert(codes); // a duplicate barcode must not undo the products
    created += chunk.length;
  }
  back("/products", "notice", `Imported ${created} product(s).`);
}
