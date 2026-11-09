import { Button, Card, DataTable, Field, Input, PageHeader, StatusBadge } from "@asotech/ui";
import { ctx } from "../../../../lib/ctx";
import { Flash } from "../../../../lib/flash";
import { NoAccess } from "../../../../components/common";
import { ProcurementNav } from "../../../../components/procurement-nav";
import type { AnyRow } from "../../../../components/core-util";
import { saveSupplier, setSupplierActive } from "../actions";

export const metadata = { title: "Suppliers" };

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const c = await ctx();
  if (c.role === "stock_counter" || c.role === "client") return <NoAccess what="suppliers" />;
  const { data } = await c.sb.from("suppliers").select("*").eq("organization_id", c.orgId).order("name").limit(500);
  const rows = (data ?? []) as AnyRow[];
  const manage = c.can("procurement.manage");
  return (
    <>
      <PageHeader title="Suppliers" />
      <ProcurementNav />
      <Flash sp={sp} />
      {manage && (
        <Card className="mb-8">
          <h2 className="mb-3 font-bold text-navy">Add supplier</h2>
          <form action={saveSupplier} className="grid gap-3 md:grid-cols-2">
            <Field label="Name" name="name"><Input id="name" name="name" required maxLength={200} /></Field>
            <Field label="Contact person" name="contact_name"><Input id="contact_name" name="contact_name" maxLength={120} /></Field>
            <Field label="Email" name="email"><Input id="email" name="email" type="email" maxLength={254} /></Field>
            <Field label="Phone" name="phone"><Input id="phone" name="phone" maxLength={30} /></Field>
            <div className="md:col-span-2"><Field label="Address" name="address"><Input id="address" name="address" maxLength={300} /></Field></div>
            <div><Button>Save supplier</Button></div>
          </form>
        </Card>
      )}
      <DataTable empty="No suppliers yet."
        columns={[{ key: "n", header: "Supplier" }, { key: "c", header: "Contact" }, { key: "p", header: "Phone" }, { key: "s", header: "Status" }, ...(manage ? [{ key: "a", header: "" }] : [])]}
        rows={rows.map((s) => ({
          n: s.name, c: [s.contact_name, s.email].filter(Boolean).join(" · ") || "–", p: s.phone ?? "–", s: <StatusBadge status={s.is_active ? "active" : "cancelled"} />,
          a: manage ? <form action={setSupplierActive}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="active" value={s.is_active ? "false" : "true"} /><button className="text-xs font-semibold text-navy underline">{s.is_active ? "Deactivate" : "Reactivate"}</button></form> : null,
        }))} />
    </>
  );
}
