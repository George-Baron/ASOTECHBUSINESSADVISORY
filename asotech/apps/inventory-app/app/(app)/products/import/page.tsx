import { LinkButton, PageHeader } from "@asotech/ui";
import { ctx } from "../../../../lib/ctx";
import { Flash } from "../../../../lib/flash";
import { NoAccess } from "../../../../components/common";
import { ImportWizard } from "./ImportWizard";

export const metadata = { title: "Import products" };

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const c = await ctx();
  if (!c.can("products.manage")) return <NoAccess what="product import" />;
  return (
    <>
      <PageHeader title="Import products" description="Upload a CSV or Excel (.xlsx) file. You will see a preview and any errors before anything is saved."
        actions={<><LinkButton href="/products/import/template" variant="ghost" size="sm">Download template</LinkButton><LinkButton href="/products" variant="ghost" size="sm">Back to products</LinkButton></>} />
      <Flash sp={sp} />
      <ImportWizard />
    </>
  );
}
