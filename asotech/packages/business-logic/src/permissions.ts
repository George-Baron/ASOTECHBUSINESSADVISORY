import type { OrgRole, Permission } from "@asotech/types";

/** Mirrors database/seed-reference.sql. The database is the enforcement point; this drives the UI only. */
export const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  owner: ["products.manage", "warehouses.manage", "movements.post", "stocktake.run", "reconciliation.prepare", "approvals.decide", "procurement.manage", "members.manage", "integrations.manage", "billing.view", "audit.view", "reports.view"],
  admin: ["products.manage", "warehouses.manage", "movements.post", "stocktake.run", "reconciliation.prepare", "approvals.decide", "procurement.manage", "members.manage", "integrations.manage", "billing.view", "audit.view", "reports.view"],
  manager: ["products.manage", "warehouses.manage", "movements.post", "stocktake.run", "reconciliation.prepare", "procurement.manage", "reports.view"],
  stock_counter: ["stocktake.count"],
  auditor: ["audit.view", "reports.view", "reconciliation.prepare"],
  viewer: ["reports.view"],
  client: [],
};

export const can = (role: OrgRole | null | undefined, permission: Permission): boolean =>
  !!role && ROLE_PERMISSIONS[role].includes(permission);

export const ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Owner", admin: "Administrator", manager: "Manager", stock_counter: "Stock counter",
  auditor: "Auditor", viewer: "Viewer", client: "Client",
};
