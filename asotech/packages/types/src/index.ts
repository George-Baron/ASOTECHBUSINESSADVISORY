// Hand-maintained domain types. Regenerate full table types with `npm run db:types` (database.generated.ts).

export type OrgRole = "owner" | "admin" | "manager" | "stock_counter" | "auditor" | "viewer" | "client";
export type MovementType =
  | "opening_balance" | "receipt" | "issue" | "transfer"
  | "adjustment_in" | "adjustment_out" | "return_in" | "return_out";
export type RequestStatus = "new" | "in_review" | "contacted" | "scheduled" | "proposal_sent" | "won" | "lost" | "closed";
export type CountSessionStatus = "draft" | "counting" | "review" | "reconciling" | "approved" | "posted" | "cancelled";
export type ProjectStage = "discovery" | "design" | "development" | "testing" | "deployment" | "support";

export interface Organization {
  id: string; name: string; slug: string;
  kind: "saas" | "consulting_client" | "internal";
  currency: string; allow_negative_stock: boolean; created_at: string;
}
export interface Membership { organization_id: string; role: OrgRole; organizations?: Pick<Organization, "id" | "name" | "slug" | "kind"> }

export interface Product {
  id: string; organization_id: string; sku: string; name: string; description: string | null;
  category_id: string | null; uom_id: string | null; track_batches: boolean; track_expiry: boolean;
  reorder_level: number; cost_price: number; sale_price: number; is_active: boolean; external_ref: string | null;
}
export interface Warehouse { id: string; organization_id: string; code: string; name: string; address: string | null; is_active: boolean }
export interface Location { id: string; organization_id: string; warehouse_id: string; code: string; name: string | null; location_type: string; is_active: boolean }
export interface Balance { product_id: string; location_id: string; batch_id: string | null; quantity: number }
export interface StockMovement {
  id: string; organization_id: string; movement_type: MovementType; reference: string;
  approval: "not_required" | "pending" | "approved" | "rejected"; notes: string | null; created_at: string; created_by: string | null;
}
export interface MovementLineInput {
  product_id: string; quantity: number; from_location_id?: string | null; to_location_id?: string | null;
  batch_id?: string | null; unit_cost?: number | null;
}
export interface CountLine {
  id: string; session_id: string; product_id: string; location_id: string; batch_id: string | null;
  snapshot_qty: number | null; counted_qty: number | null; first_count_qty: number | null;
  variance_qty: number | null; status: "pending" | "counted" | "recount" | "verified"; assigned_to: string | null;
}
export interface ServiceDefinition {
  slug: string; title: string; category: string; summary: string;
  offerings: string[]; deliverables: string[]; sortOrder: number;
}

export type Permission =
  | "products.manage" | "warehouses.manage" | "movements.post" | "stocktake.run" | "stocktake.count"
  | "reconciliation.prepare" | "approvals.decide" | "procurement.manage" | "members.manage"
  | "integrations.manage" | "billing.view" | "audit.view" | "reports.view";
