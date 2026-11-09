import type { Row } from "./ctx";
import { one } from "./ctx";

export async function loadProjects(sb: any): Promise<Row[]> {
  const { data } = await sb.from("software_projects").select("id, organization_id, name, stage, status").order("created_at", { ascending: false });
  return (data ?? []) as Row[];
}
export async function loadOrgs(sb: any): Promise<Row[]> {
  const { data } = await sb.from("organizations").select("id, name, slug, kind, created_at").neq("kind", "internal").order("name");
  return (data ?? []) as Row[];
}
export const orgNameMap = (orgs: Row[]): Map<string, string> => new Map(orgs.map((o: Row) => [o.id as string, o.name as string]));
export const byId = (rows: Row[]): Map<string, Row> => new Map(rows.map((r: Row) => [r.id as string, r]));

export async function loadServices(sb: any): Promise<Row[]> {
  const { data } = await sb.from("service_catalogue").select("id, title").order("sort_order");
  return (data ?? []) as Row[];
}

export const REQUEST_KINDS = {
  consultation: { table: "consultation_requests", label: "Consultation" },
  proposal: { table: "proposal_requests", label: "Proposal" },
  contact: { table: "contact_messages", label: "Contact" },
  service: { table: "service_requests", label: "Service" },
} as const;
export type RequestKind = keyof typeof REQUEST_KINDS;
export const isRequestKind = (k: string): k is RequestKind => k in REQUEST_KINDS;

export interface InboxItem { kind: RequestKind; id: string; name: string; email: string; summary: string; status: string; created_at: string }

export async function loadInbox(sb: any, limit = 100): Promise<InboxItem[]> {
  const kinds = Object.keys(REQUEST_KINDS) as RequestKind[];
  const results = await Promise.all(kinds.map((k) => sb.from(REQUEST_KINDS[k].table).select("*").order("created_at", { ascending: false }).limit(limit)));
  const items: InboxItem[] = [];
  kinds.forEach((k, i) => {
    for (const r of ((results[i].data ?? []) as Row[])) {
      const summary = k === "proposal" ? r.scope : k === "contact" ? (r.subject ?? r.message) : (r.message ?? (k === "consultation" ? `Meeting: ${String(r.meeting_mode ?? "").replace("_", " ")}` : ""));
      items.push({ kind: k, id: r.id, name: r.full_name, email: r.email, summary: String(summary ?? "").slice(0, 140), status: r.status, created_at: r.created_at });
    }
  });
  return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
export { one };
