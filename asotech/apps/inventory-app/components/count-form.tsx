import { Button, Card, Field, Input, Select, Textarea } from "@asotech/ui";
import { createSession } from "../app/(app)/stocktaking/actions";
import type { AnyRow } from "./core-util";

/** Create-count form shared by Stocktaking (full/spot) and Cycle counting. */
export function CreateCountForm({ countType, warehouses, locations, categories }: {
  countType: "full" | "cycle"; warehouses: AnyRow[]; locations: AnyRow[]; categories: AnyRow[];
}) {
  const wcode = new Map(warehouses.map((w) => [w.id, w.code]));
  return (
    <Card className="mb-8">
      <h2 className="mb-1 font-bold text-navy">{countType === "cycle" ? "Start a cycle count" : "Start a stocktake"}</h2>
      <p className="mb-4 text-sm text-slate2">
        {countType === "cycle"
          ? "Count a selection of products or bins. Choose a category, list SKUs, or pick bins."
          : "System quantities are snapshotted when the count starts. Leave the bin list empty to count the whole warehouse."}
      </p>
      <form action={createSession} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="count_type" value={countType} />
        <Field label="Name" name="name"><Input id="name" name="name" required maxLength={120} placeholder={countType === "cycle" ? "e.g. Fast movers, week 45" : "e.g. Year-end stocktake 2026"} /></Field>
        <Field label="Warehouse" name="warehouse_id">
          <Select id="warehouse_id" name="warehouse_id" required>{warehouses.filter((w) => w.is_active).map((w) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}</Select>
        </Field>
        <Field label="Bins (optional)" name="location_ids" hint="Hold Ctrl or Cmd to select several.">
          <Select id="location_ids" name="location_ids" multiple size={6}>{locations.map((l) => <option key={l.id} value={l.id}>{wcode.get(l.warehouse_id)} · {l.code}</option>)}</Select>
        </Field>
        <div className="space-y-4">
          <Field label="Category (optional)" name="category_id">
            <Select id="category_id" name="category_id" defaultValue=""><option value="">Any category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          </Field>
          <Field label="SKUs or barcodes (optional)" name="skus" hint="One per line or comma separated.">
            <Textarea id="skus" name="skus" className="!min-h-[84px]" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-navy md:col-span-2">
          <input type="checkbox" name="blind" defaultChecked className="h-4 w-4 accent-navy" />
          Blind count: counters do not see the system quantity
        </label>
        <div className="md:col-span-2"><Button disabled={warehouses.length === 0}>Start count</Button></div>
      </form>
    </Card>
  );
}
