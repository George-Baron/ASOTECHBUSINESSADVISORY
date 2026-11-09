import { Button, Card, Field, Input, PageHeader, Select, StatusBadge, EmptyState } from "@asotech/ui";
import { ctx } from "../../../lib/ctx";
import { Flash } from "../../../lib/flash";
import type { AnyRow } from "../../../components/core-util";
import { addLocation, addWarehouse, setLocationActive, setWarehouseActive } from "./actions";

export const metadata = { title: "Warehouses & bins" };

export default async function WarehousesPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const c = await ctx();
  const [{ data: wh }, { data: locs }] = await Promise.all([
    c.sb.from("warehouses").select("id, code, name, address, is_active").eq("organization_id", c.orgId).order("code"),
    c.sb.from("locations").select("id, warehouse_id, code, name, location_type, is_active").eq("organization_id", c.orgId).order("code").limit(5000),
  ]);
  const warehouses = (wh ?? []) as AnyRow[];
  const locations = (locs ?? []) as AnyRow[];
  const manage = c.can("warehouses.manage");

  return (
    <>
      <PageHeader title="Warehouses & bin locations" description="Stock is held in bin locations. Every movement names the bins it leaves and enters." />
      <Flash sp={sp} />
      {manage && (
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-3 font-bold text-navy">Add warehouse</h2>
            <form action={addWarehouse} className="space-y-3">
              <Field label="Code" name="code" hint="e.g. LAG-MAIN"><Input id="code" name="code" required maxLength={20} /></Field>
              <Field label="Name" name="name"><Input id="name" name="name" required maxLength={120} /></Field>
              <Field label="Address (optional)" name="address"><Input id="address" name="address" maxLength={300} /></Field>
              <Button>Add warehouse</Button>
            </form>
          </Card>
          <Card>
            <h2 className="mb-3 font-bold text-navy">Add bin / location</h2>
            {warehouses.length === 0 ? <p className="text-sm text-slate2">Add a warehouse first.</p> : (
              <form action={addLocation} className="space-y-3">
                <Field label="Warehouse" name="warehouse_id">
                  <Select id="warehouse_id" name="warehouse_id" required>{warehouses.filter((w) => w.is_active).map((w) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}</Select>
                </Field>
                <Field label="Bin code" name="code" hint="e.g. A-01-03"><Input id="code2" name="code" required maxLength={30} /></Field>
                <Field label="Description (optional)" name="name"><Input id="name2" name="name" maxLength={120} /></Field>
                <Field label="Type" name="location_type">
                  <Select id="location_type" name="location_type" defaultValue="bin">
                    {["bin", "zone", "receiving", "quarantine", "dispatch", "shop_floor"].map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                  </Select>
                </Field>
                <Button>Add location</Button>
              </form>
            )}
          </Card>
        </div>
      )}
      {warehouses.length === 0 ? <EmptyState title="No warehouses yet">Add your first warehouse, then its bin locations, before posting stock.</EmptyState> : (
        <div className="space-y-6">
          {warehouses.map((w) => {
            const mine = locations.filter((l) => l.warehouse_id === w.id);
            return (
              <Card key={w.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-navy">{w.code} · {w.name} {!w.is_active && <StatusBadge status="cancelled" />}</h2>
                    {w.address && <p className="text-sm text-slate2">{w.address}</p>}
                  </div>
                  {manage && (
                    <form action={setWarehouseActive}>
                      <input type="hidden" name="id" value={w.id} /><input type="hidden" name="active" value={w.is_active ? "false" : "true"} />
                      <Button variant="ghost" size="sm">{w.is_active ? "Deactivate" : "Reactivate"}</Button>
                    </form>
                  )}
                </div>
                {mine.length === 0 ? <p className="mt-3 text-sm text-slate2">No bins yet.</p> : (
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {mine.map((l) => (
                      <li key={l.id} className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2 text-sm">
                        <span><span className="font-semibold">{l.code}</span> <span className="text-slate2">{l.name ?? ""} · {String(l.location_type).replace("_", " ")}</span>{!l.is_active && <span className="ml-1 text-bad"> (inactive)</span>}</span>
                        {manage && (
                          <form action={setLocationActive}>
                            <input type="hidden" name="id" value={l.id} /><input type="hidden" name="active" value={l.is_active ? "false" : "true"} />
                            <button className="text-xs font-semibold text-navy underline">{l.is_active ? "Deactivate" : "Reactivate"}</button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
