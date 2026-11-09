import type { ReactNode } from "react";
import { AppShell } from "@asotech/ui";
import { signOut } from "@asotech/supabase/auth";
import { staffCtx } from "../../lib/ctx";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/requests", label: "Requests inbox" },
  { href: "/clients", label: "Clients" },
  { href: "/consulting-projects", label: "Consulting projects" },
  { href: "/software-projects", label: "Software projects" },
  { href: "/requirements", label: "Requirements" },
  { href: "/quotations", label: "Quotations" },
  { href: "/milestones", label: "Milestones" },
  { href: "/deliverables", label: "Deliverables" },
  { href: "/tasks", label: "Tasks" },
  { href: "/approvals", label: "Client approvals" },
];

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const { session } = await staffCtx();
  return <AppShell appName="Project management" nav={NAV} user={session.fullName ?? session.email} signOutAction={signOut}>{children}</AppShell>;
}
