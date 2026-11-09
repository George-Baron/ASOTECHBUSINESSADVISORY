import { randomUUID } from "node:crypto";
import { Alert, Button, Card, Field, Input, LinkButton, PageHeader, Select, Textarea } from "@asotech/ui";
import { ctx } from "../../../../lib/ctx";
import { Flash } from "../../../../lib/flash";
import { NoAccess } from "../../../../components/common";
import type { AnyRow } from "../../../../components/core-util";
import { postMovement } from "../actions";

export const metadata = { title: "New stock movement" };
const ROWS = 8;

export default async function NewMovementPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string; type?: string }> }) {
  const sp = await searchParams;
  const c = await ctx();
  if (!c.can("movements.post")) return <NoAccess what="posting stock movements" />;
  const [{ data: locs }, { data: whs }] = await Promise.all([
    c.sb.from("locations").select("id, code, warehouse_id").eq("organization_id", c.orgId).eq("is_active", true).order("code").limit(2000),
    c.sb.from("warehouses").select("id, code").eq("organization_id", c.orgId),
  ]);
  const wcode = new Map(((whs ?? []) as AnyRow[]).map((w) => [w.id, w.code]));
  const locations = (locs ?? []) as AnyRow[];
  const idem = randomUUID(); // one key per rendered form: a double-click or retry posts only once
  const isAdmin = c.role === "owner" || c.role === "admin";
  const type = sp.type ?? "receipt";

  return (
    <>
      <PageHeader title="New stock movement" description="Fill in the bins that apply to the movement type, then list the products. Blank rows are ignored."
        actions={<LinkButton href="/movements" variant="ghost" size="sm">Cancel</LinkButton>} />
      <Flash sp={sp} />
      {locations.length === 0 ? <Alert tone="warn" title="Add a warehouse and bin first">Stock is held in bin locations. Create them under Warehouses & bins.</Alert> : (
        <form action={postMovement} className="space-y-6">
          <input type="hidden" name="idem" value={idem} />
          <Card>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Movement type" name="movement_type">
                <Select id="movement_type" name="movement_type" defaultValue={type}>
                  <option value="receipt">Receipt (stock in, e.g. from supplier)</option>
                  <option value="issue">Issue (stock out, e.g. sale or use)</option>
                  <option value="transfer">Transfer (bin to bin)</option>
                  <option value="return_in">Return in (from customer)</option>
                  <option value="return_out">Return out (to supplier)</option>
                  {isAdmin && <option value="opening_balance">Opening balance (administrators)</option>}
                </Select>
              </Field>
              <Field label="Reference" name="reference" hint="Optional. Generated if left blank (e.g. delivery note or invoice number)."><Input id="reference" name="reference" maxLength={80} /></Field>
              <Field label="From bin" name="from_location_id" hint="Needed for issue, transfer and return out.">
                <Select id="from_location_id" name="from_location_id" defaultValue=""><option value="">None</option>{locations.map((l) => <option key={l.id} value={l.id}>{wcode.get(l.warehouse_id)} · {l.code}</option>)}</Select>
              </Field>
              <Field label="To bin" name="to_location_id" hint="Needed for receipt, transfer, return in and opening balance.">
                <Select id="to_location_id" name="to_location_id" defaultValue=""><option value="">None</option>{locations.map((l) => <option key={l.id} value={l.id}>{wcode.get(l.warehouse_id)} · {l.code}</option>)}</Select>
              </Field>
            </div>
          </Card>
          <Card>
            <h2 className="mb-1 font-bold text-navy">Products</h2>
            <p className="mb-4 text-xs text-slate2">Enter the SKU or scan the barcode. Batch number is needed for batch-tracked products; expiry date is needed when creating a new batch of an expiry-tracked product.</p>
            <div className="space-y-3">
              {Array.from({ length: ROWS }, (_, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 md:grid-cols-[2fr_1fr_1fr_1.2fr_1.2fr]">
                  <Input name={`sku_${i}`} aria-label={`Line ${i + 1} SKU or barcode`} placeholder="SKU or barcode" className="col-span-2 md:col-span-1" />
                  <Input name={`qty_${i}`} aria-label={`Line ${i + 1} quantity`} inputMode="decimal" placeholder="Qty" />
                  <Input name={`cost_${i}`} aria-label={`Line ${i + 1} unit cost`} inputMode="decimal" placeholder="Unit cost" />
                  <Input name={`batch_${i}`} aria-label={`Line ${i + 1} batch`} placeholder="Batch no." />
                  <Input name={`expiry_${i}`} aria-label={`Line ${i + 1} expiry`} type="date" />
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <Field label="Notes (optional)" name="notes"><Textarea id="notes" name="notes" maxLength={1000} className="!min-h-[80px]" /></Field>
          </Card>
          <Button size="lg">Post to ledger</Button>
        </form>
      )}
    </>
  );
}
