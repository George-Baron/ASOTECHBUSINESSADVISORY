import type { ReactNode } from "react";
import { AppShell } from "@asotech/ui";
import { signOut } from "@asotech/supabase/auth";
import { requireOrg } from "@asotech/supabase/server";
import { switchOrg } from "../../lib/actions";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/reports", label: "Reports" },
  { href: "/audit-findings", label: "Audit findings" },
  { href: "/reconciliation", label: "Reconciliation" },
  { href: "/deliverables", label: "Deliverables" },
  { href: "/corrective-actions", label: "Corrective actions" },
  { href: "/support", label: "Support" },
];

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const { session, org } = await requireOrg();
  return (
    <AppShell appName="Client Portal" nav={NAV} orgName={org.name} user={session.fullName ?? session.email} signOutAction={signOut}>
      {session.memberships.length > 1 && (
        <form action={switchOrg} className="mb-4 flex items-center gap-2 text-sm">
          <label htmlFor="organization_id" className="font-semibold text-navy">Organisation</label>
          <select id="organization_id" name="organization_id" defaultValue={org.organization_id} className="rounded-lg border border-navy-200 bg-white px-2 py-1.5">
            {session.memberships.map((m) => <option key={m.organization_id} value={m.organization_id}>{m.name}</option>)}
          </select>
          <button className="rounded-lg border border-navy-100 px-3 py-1.5 font-semibold text-navy hover:bg-navy-50">Switch</button>
        </form>
      )}
      {children}
    </AppShell>
  );
}
