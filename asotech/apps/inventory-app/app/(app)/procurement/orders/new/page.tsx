import { Alert, Button, Card, Field, Input, LinkButton, PageHeader, Select, Textarea } from "@asotech/ui";
import { withBase } from "@asotech/utilities";
import { ctx } from "../../../../../lib/ctx";
import { Flash } from "../../../../../lib/flash";
import { NoAccess } from "../../../../../components/common";
import type { AnyRow } from "../../../../../components/core-util";
import { createPurchaseOrder } from "../../actions";

export const metadata = { title: "New purchase order" };

export default async function NewPoPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const c = await ctx();
  if (!c.can("procurement.manage")) return <NoAccess what="creating purchase orders" />;
  const { data } = await c.sb.from("suppliers").select("id, name").eq("organization_id", c.orgId).eq("is_active", true).order("name");
  const suppliers = (data ?? []) as AnyRow[];
  return (
    <>
      <PageHeader title="New purchase order" actions={<LinkButton href="/procurement" variant="ghost" size="sm">Cancel</LinkButton>} />
      <Flash sp={sp} />
      {suppliers.length === 0 ? <Alert tone="warn" title="Add a supplier first">Purchase orders need a supplier. <a className="font-semibold underline" href={withBase("/procurement/suppliers")}>Add one</a>.</Alert> : (
        <form action={createPurchaseOrder} className="space-y-6">
          <Card>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Supplier" name="supplier_id"><Select id="supplier_id" name="supplier_id" required>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
              <Field label="Expected delivery" name="expected_date"><Input id="expected_date" name="expected_date" type="date" /></Field>
              <div className="md:col-span-2"><Field label="Notes" name="notes"><Textarea id="notes" name="notes" className="!min-h-[70px]" maxLength={1000} /></Field></div>
            </div>
          </Card>
          <Card>
            <h2 className="mb-3 font-bold text-navy">Lines</h2>
            <div className="space-y-3">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 md:grid-cols-[3fr_1fr_1fr]">
                  <Input name={`sku_${i}`} aria-label={`Line ${i + 1} SKU or barcode`} placeholder="SKU or barcode" className="col-span-3 md:col-span-1" />
                  <Input name={`qty_${i}`} aria-label={`Line ${i + 1} quantity`} inputMode="decimal" placeholder="Qty" />
                  <Input name={`cost_${i}`} aria-label={`Line ${i + 1} unit cost`} inputMode="decimal" placeholder="Unit cost" />
                </div>
              ))}
            </div>
          </Card>
          <Button size="lg">Save draft</Button>
        </form>
      )}
    </>
  );
}
