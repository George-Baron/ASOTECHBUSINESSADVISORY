import { Button, Card, DataTable, Field, Input, PageHeader, Select, StatusBadge } from "@asotech/ui";
import { ROLE_LABELS } from "@asotech/business-logic";
import type { OrgRole } from "@asotech/types";
import { ctx } from "../../../lib/ctx";
import { Flash } from "../../../lib/flash";
import { NoAccess } from "../../../components/common";
import { profileNames, type AnyRow } from "../../../components/core-util";
import { addMember, changeRole, saveOrganisation, setMemberActive } from "./actions";

export const metadata = { title: "Settings & team" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const sp = await searchParams;
  const c = await ctx();
  if (!c.can("members.manage")) return <NoAccess what="settings" />;
  const [{ data: org }, { data: mem }] = await Promise.all([
    c.sb.from("organizations").select("name, currency, allow_negative_stock").eq("id", c.orgId).maybeSingle(),
    c.sb.from("organization_members").select("id, user_id, role, is_active").eq("organization_id", c.orgId).order("created_at"),
  ]);
  const members = (mem ?? []) as AnyRow[];
  const names = await profileNames(c.sb, members.map((m) => m.user_id));
  const roles: OrgRole[] = c.role === "owner" ? ["owner", "admin", "manager", "stock_counter", "auditor", "viewer"] : ["manager", "stock_counter", "auditor", "viewer"];
  const editable = (m: AnyRow) => c.role === "owner" || !["owner", "admin"].includes(m.role);
  return (
    <>
      <PageHeader title="Settings & team" />
      <Flash sp={sp} />
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold text-navy">Organisation</h2>
          <form action={saveOrganisation} className="space-y-3">
            <Field label="Business name" name="name"><Input id="name" name="name" defaultValue={org?.name} required maxLength={200} /></Field>
            <Field label="Currency" name="currency"><Input id="currency" name="currency" defaultValue={org?.currency ?? "NGN"} maxLength={3} /></Field>
            <label className="flex items-start gap-2 text-sm text-navy"><input type="checkbox" name="allow_negative_stock" defaultChecked={!!org?.allow_negative_stock} className="mt-1 h-4 w-4 accent-navy" /><span>Allow stock to go negative<br /><span className="text-xs text-slate2">Not recommended. Leave off so issues beyond available stock are rejected.</span></span></label>
            <Button>Save</Button>
          </form>
        </Card>
        <Card>
          <h2 className="mb-3 font-bold text-navy">Add a team member</h2>
          <p className="mb-3 text-sm text-slate2">They must have registered an account first.</p>
          <form action={addMember} className="space-y-3">
            <Field label="Email" name="email"><Input id="email" name="email" type="email" required /></Field>
            <Field label="Role" name="role"><Select id="role" name="role" defaultValue="manager">{roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</Select></Field>
            <Button>Add member</Button>
          </form>
        </Card>
      </div>
      <h2 className="mb-3 text-lg font-bold text-navy">Team</h2>
      <DataTable columns={[{ key: "n", header: "Name" }, { key: "r", header: "Role" }, { key: "s", header: "Status" }, { key: "a", header: "" }]}
        rows={members.map((m) => ({
          n: <>{names[m.user_id] ?? "User"}{m.user_id === c.session.userId && <span className="ml-1 text-xs text-slate2">(you)</span>}</>,
          r: editable(m) && m.user_id !== c.session.userId ? (
            <form action={changeRole} className="flex items-center gap-2"><input type="hidden" name="id" value={m.id} /><Select name="role" defaultValue={m.role} aria-label="Role" className="!py-1.5">{roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</Select><Button size="sm" variant="ghost">Save</Button></form>
          ) : ROLE_LABELS[m.role as OrgRole],
          s: <StatusBadge status={m.is_active ? "active" : "cancelled"} />,
          a: editable(m) && m.user_id !== c.session.userId ? <form action={setMemberActive}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="active" value={m.is_active ? "false" : "true"} /><button className="text-xs font-semibold text-navy underline">{m.is_active ? "Deactivate" : "Reactivate"}</button></form> : null,
        }))} />
    </>
  );
}
