import Link from "next/link";
import { Button, Card, DataTable, Field, Input, PageHeader } from "@asotech/ui";
import { formatDate } from "@asotech/utilities";
import { staffCtx } from "../../../lib/ctx";
import { loadOrgs } from "../../../lib/data";
import { Flash } from "../../../lib/flash";
import { createClient } from "./actions";

export const metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string; new?: string; email?: string }> }) {
  const sp = await searchParams;
  const { sb } = await staffCtx();
  const orgs = await loadOrgs(sb);
  return (
    <>
      <PageHeader title="Clients" description="Client organisations that can sign in to the client portal." />
      <Flash sp={sp} />
      {sp.email && <p className="mb-4 text-sm text-slate2">Creating a client from a request. After creating it, add <strong>{sp.email}</strong> as a member once they have registered.</p>}
      <Card className="mb-8 max-w-2xl">
        <form action={createClient} className="grid gap-4 sm:grid-cols-2">
          <Field label="Organisation name" name="name"><Input id="name" name="name" required minLength={2} maxLength={120} defaultValue={sp.new ?? ""} /></Field>
          <Field label="Short name (URL-safe)" name="slug" hint="Optional; made from the name if blank."><Input id="slug" name="slug" maxLength={60} /></Field>
          <div className="sm:col-span-2"><Button>Create client</Button></div>
        </form>
      </Card>
      <DataTable empty="No clients yet."
        columns={[{ key: "n", header: "Organisation" }, { key: "s", header: "Short name" }, { key: "c", header: "Created" }]}
        rows={orgs.map((o) => ({ n: <Link className="font-semibold hover:underline" href={`/clients/${o.id}`}>{o.name}</Link>, s: o.slug, c: formatDate(o.created_at) }))} />
    </>
  );
}
