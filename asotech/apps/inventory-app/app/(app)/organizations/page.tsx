import { Button, Card, Field, Input, PageHeader, StatusBadge } from "@asotech/ui";
import { ROLE_LABELS } from "@asotech/business-logic";
import { requireOrg } from "@asotech/supabase/server";
import { Flash } from "../../../lib/flash";
import { createOrganisation } from "../../onboarding/actions";
import { switchOrganisation } from "./actions";

export const metadata = { title: "Organisations" };

export default async function OrganizationsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const { session, org } = await requireOrg();
  return (
    <>
      <PageHeader title="Organisations" description="Everything in this app belongs to one organisation. Switch between yours or create another." />
      <Flash sp={sp} />
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        {session.memberships.map((m) => (
          <Card key={m.organization_id}>
            <div className="flex items-start justify-between gap-2"><h2 className="font-bold text-navy">{m.name}</h2>{m.organization_id === org.organization_id && <StatusBadge status="active" />}</div>
            <p className="mt-1 text-sm text-slate2">Your role: {ROLE_LABELS[m.role]}</p>
            {m.organization_id !== org.organization_id && <form action={switchOrganisation} className="mt-3"><input type="hidden" name="id" value={m.organization_id} /><Button size="sm" variant="secondary">Switch to this organisation</Button></form>}
          </Card>
        ))}
      </div>
      <Card className="max-w-md"><h2 className="mb-3 font-bold text-navy">Create another organisation</h2>
        <form action={createOrganisation} className="space-y-3"><Field label="Business name" name="name"><Input id="name" name="name" required minLength={2} maxLength={200} /></Field><Button>Create organisation</Button></form></Card>
    </>
  );
}
