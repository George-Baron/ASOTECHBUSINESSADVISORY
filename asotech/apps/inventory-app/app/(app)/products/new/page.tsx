import { Card, PageHeader } from "@asotech/ui";
import { ctx } from "../../../../lib/ctx";
import { Flash } from "../../../../lib/flash";
import { NoAccess } from "../../../../components/core-noaccess";
import { ProductForm } from "../../../../components/product-form";
import { saveProduct } from "../actions";

export const metadata = { title: "Add product" };
export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const c = await ctx();
  if (!c.can("products.manage")) return <NoAccess what="product management" />;
  const [cats, uoms] = await Promise.all([
    c.sb.from("product_categories").select("id, name").eq("organization_id", c.orgId).order("name"),
    c.sb.from("units_of_measure").select("id, code, name").eq("organization_id", c.orgId).order("code"),
  ]);
  return (
    <>
      <PageHeader title="Add product" />
      <Flash sp={sp} />
      <Card><ProductForm action={saveProduct} categories={cats.data ?? []} uoms={uoms.data ?? []} showBarcode submitLabel="Create product" /></Card>
    </>
  );
}
