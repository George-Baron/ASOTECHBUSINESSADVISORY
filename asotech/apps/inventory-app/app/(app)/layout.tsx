import type { ReactNode } from "react";
import { AppShell } from "@asotech/ui";
import { signOut } from "@asotech/supabase/auth";
import { requireOrg } from "@asotech/supabase/server";
import { can } from "@asotech/business-logic";
import { ROLE_LABELS } from "@asotech/business-logic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { session, org } = await requireOrg();
  const counterOnly = org.role === "stock_counter";
  const nav = counterOnly
    ? [{ href: "/stocktaking", label: "My count sheets" }]
    : [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/products", label: "Products" },
        { href: "/warehouses", label: "Warehouses & bins" },
        { href: "/movements", label: "Stock movements" },
        { href: "/stocktaking", label: "Stocktaking" },
        { href: "/cycle-counting", label: "Cycle counting" },
        { href: "/reconciliation", label: "Reconciliation" },
        { href: "/approvals", label: "Approvals" },
        { href: "/procurement", label: "Procurement" },
        { href: "/expiry", label: "Batches & expiry" },
        { href: "/reports", label: "Reports" },
        ...(can(org.role, "integrations.manage") ? [{ href: "/integrations", label: "Integrations" }] : []),
        ...(can(org.role, "billing.view") ? [{ href: "/subscriptions", label: "Subscription" }] : []),
        ...(can(org.role, "audit.view") ? [{ href: "/audit-logs", label: "Audit log" }] : []),
        { href: "/organizations", label: "Organisations" },
        ...(can(org.role, "members.manage") ? [{ href: "/settings", label: "Settings & team" }] : []),
      ];
  return (
    <AppShell appName="Inventory" nav={nav} orgName={`${org.name} · ${ROLE_LABELS[org.role]}`} user={session.fullName ?? session.email} signOutAction={signOut}>
      {children}
    </AppShell>
  );
}
