import { toCsv } from "@asotech/utilities";

export function GET() {
  const csv = toCsv([
    ["sku", "name", "description", "barcode", "uom_code", "cost_price", "sale_price", "reorder_level", "track_batches", "track_expiry"],
    ["EXAMPLE-001", "Example product (delete this row)", "Sample description", "0000000000017", "EA", "1000", "1500", "10", "no", "no"],
  ]);
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="asotech-product-import-template.csv"', "Cache-Control": "no-store" },
  });
}
