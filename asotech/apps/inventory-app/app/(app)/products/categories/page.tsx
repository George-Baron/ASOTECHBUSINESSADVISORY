import { Button, Card, DataTable, Field, Input, PageHeader, Select } from "@asotech/ui";
import { ctx } from "../../../../lib/ctx";
import { Flash } from "../../../../lib/flash";
import type { AnyRow } from "../../../../components/core-util";
import { addCategory, addUom, deleteCategory, deleteUom } from "../actions";

export const metadata = { title: "Categories and units" };
export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const c = await ctx();
  const [cats, uoms] = await Promise.all([
    c.sb.from("product_categories").select("id, name, parent_id").eq("organization_id", c.orgId).order("name"),
    c.sb.from("units_of_measure").select("id, code, name").eq("organization_id", c.orgId).order("code"),
  ]);
  const catRows = (cats.data ?? []) as AnyRow[];
  const parentName = new Map(catRows.map((r) => [r.id as string, r.name as string]));
  const canManage = c.can("products.manage");
  const canDelete = c.role === "owner" || c.role === "admin";
  const del = (action: (fd: FormData) => Promise<void>, id: string) => canDelete ? (
    <form action={action}><input type="hidden" name="id" value={id} /><button className="text-xs font-semibold text-bad hover:underline">Delete</button></form>
  ) : "";
  return (
    <>
      <PageHeader title="Categories and units" description="Group products and define the units you count them in." />
      <Flash sp={sp} />
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-navy">Categories</h2>
          {canManage && (
            <Card><form action={addCategory} className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" name="name"><Input id="name" name="name" required maxLength={120} /></Field>
              <Field label="Parent (optional)" name="parent_id"><Select id="parent_id" name="parent_id" defaultValue=""><option value="">None</option>{catRows.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field>
              <div className="sm:col-span-2"><Button type="submit" size="sm">Add category</Button></div>
            </form></Card>
          )}
          <DataTable empty="No categories yet." columns={[{ key: "n", header: "Name" }, { key: "p", header: "Parent" }, { key: "a", header: "" }]}
            rows={catRows.map((r) => ({ n: r.name, p: parentName.get(r.parent_id) ?? "–", a: del(deleteCategory, r.id) }))} />
        </section>
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-navy">Units of measure</h2>
          {canManage && (
            <Card><form action={addUom} className="grid gap-3 sm:grid-cols-2">
              <Field label="Code" name="code"><Input id="code" name="code" required maxLength={20} placeholder="EA" /></Field>
              <Field label="Name" name="name"><Input id="name" name="name" required placeholder="Each" /></Field>
              <div className="sm:col-span-2"><Button type="submit" size="sm">Add unit</Button></div>
            </form></Card>
          )}
          <DataTable empty="No units yet." columns={[{ key: "c", header: "Code" }, { key: "n", header: "Name" }, { key: "a", header: "" }]}
            rows={((uoms.data ?? []) as AnyRow[]).map((r) => ({ c: r.code, n: r.name, a: del(deleteUom, r.id) }))} />
        </section>
      </div>
    </>
  );
}
