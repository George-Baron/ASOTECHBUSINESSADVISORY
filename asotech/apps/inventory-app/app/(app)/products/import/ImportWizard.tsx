"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, Card, DataTable } from "@asotech/ui";
import { previewImport, confirmImport, type PreviewState } from "./actions";

export function ImportWizard() {
  const [state, formAction, pending] = useActionState<PreviewState, FormData>(previewImport, {});
  const s = state.summary;
  return (
    <>
      <Card className="mb-6 max-w-2xl">
        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="file" className="mb-1 block text-sm font-semibold text-navy">File (.csv or .xlsx, up to 5 MB, 5,000 rows)</label>
            <input id="file" name="file" type="file" accept=".csv,.xlsx" required className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-4 file:py-2 file:font-semibold file:text-white" />
          </div>
          <p className="text-xs text-slate2">Columns: sku, name, description, barcode, uom_code, cost_price, sale_price, reorder_level, track_batches, track_expiry. Existing SKUs are skipped, never overwritten.</p>
          <Button disabled={pending}>{pending ? "Checking…" : "Check file"}</Button>
        </form>
      </Card>
      {state.error && <Alert tone="bad">{state.error}</Alert>}
      {s && (
        <section aria-label="Import preview">
          <h2 className="mb-3 text-lg font-bold text-navy">Preview</h2>
          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            <Card className="!p-4"><p className="text-xs text-slate2">Rows read</p><p className="text-2xl font-extrabold">{s.total}</p></Card>
            <Card className="!p-4"><p className="text-xs text-slate2">Ready to import</p><p className="text-2xl font-extrabold text-ok">{s.valid}</p></Card>
            <Card className="!p-4"><p className="text-xs text-slate2">Skipped (SKU exists)</p><p className="text-2xl font-extrabold text-warn">{s.skipped}</p></Card>
            <Card className="!p-4"><p className="text-xs text-slate2">Rows with errors</p><p className="text-2xl font-extrabold text-bad">{s.errors.length}</p></Card>
          </div>
          {s.errors.length > 0 && (
            <>
              <Alert tone="warn" title="Fix these rows in your file and upload again if you need them imported">Row numbers include the header row. Showing up to 50.</Alert>
              <DataTable columns={[{ key: "row", header: "Row" }, { key: "msg", header: "Problem" }]}
                rows={s.errors.map((e) => ({ row: e.row === 0 ? "File" : e.row, msg: Object.entries(e.errors).map(([k, v]) => `${k}: ${v}`).join("; ") }))} />
            </>
          )}
          {s.valid > 0 && (
            <form action={confirmImport} className="mt-5">
              <input type="hidden" name="rows" value={state.rows ?? "[]"} />
              <Button size="lg">Import {s.valid} product{s.valid === 1 ? "" : "s"}</Button>
              <Link href="/products/import" className="ml-4 text-sm font-semibold text-navy underline">Cancel</Link>
            </form>
          )}
        </section>
      )}
    </>
  );
}
