import { Field, Input, Select, Textarea, Button } from "@asotech/ui";
import type { AnyRow } from "./core-util";

export function ProductForm({ action, product, categories, uoms, showBarcode, submitLabel }: {
  action: (fd: FormData) => Promise<void>; product?: AnyRow | null; categories: AnyRow[]; uoms: AnyRow[];
  showBarcode?: boolean; submitLabel: string;
}) {
  const uomCode = product ? uoms.find((u) => u.id === product.uom_id)?.code : "EA";
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {product && <input type="hidden" name="id" value={product.id} />}
      <Field label="SKU" name="sku"><Input id="sku" name="sku" required maxLength={64} defaultValue={product?.sku ?? ""} /></Field>
      <Field label="Name" name="name"><Input id="name" name="name" required maxLength={300} defaultValue={product?.name ?? ""} /></Field>
      <div className="sm:col-span-2"><Field label="Description" name="description"><Textarea id="description" name="description" className="!min-h-[70px]" defaultValue={product?.description ?? ""} /></Field></div>
      <Field label="Category" name="category_id">
        <Select id="category_id" name="category_id" defaultValue={product?.category_id ?? ""}>
          <option value="">None</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label="Unit of measure" name="uom_code">
        <Select id="uom_code" name="uom_code" defaultValue={uomCode ?? ""}>
          <option value="">None</option>
          {uoms.map((u) => <option key={u.id} value={u.code}>{u.code} · {u.name}</option>)}
        </Select>
      </Field>
      <Field label="Cost price" name="cost_price"><Input id="cost_price" name="cost_price" inputMode="decimal" defaultValue={product?.cost_price ?? 0} /></Field>
      <Field label="Sale price" name="sale_price"><Input id="sale_price" name="sale_price" inputMode="decimal" defaultValue={product?.sale_price ?? 0} /></Field>
      <Field label="Reorder level" name="reorder_level" hint="Flagged as low stock at or below this quantity"><Input id="reorder_level" name="reorder_level" inputMode="decimal" defaultValue={product?.reorder_level ?? 0} /></Field>
      {showBarcode && <Field label="Barcode (optional)" name="barcode"><Input id="barcode" name="barcode" maxLength={64} /></Field>}
      <div className="flex flex-col gap-2 text-sm text-navy sm:col-span-2 sm:flex-row sm:gap-6">
        <label className="flex items-center gap-2"><input type="checkbox" name="track_batches" value="true" defaultChecked={!!product?.track_batches} /> Track batches or lots</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="track_expiry" value="true" defaultChecked={!!product?.track_expiry} /> Track expiry dates (implies batches)</label>
      </div>
      <div className="sm:col-span-2"><Button type="submit">{submitLabel}</Button></div>
    </form>
  );
}
