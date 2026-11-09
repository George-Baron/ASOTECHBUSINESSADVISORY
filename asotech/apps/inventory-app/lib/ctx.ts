import { redirect } from "next/navigation";
import { createServer, requireOrg } from "@asotech/supabase/server";
import { can } from "@asotech/business-logic";
import type { Permission } from "@asotech/types";

/** Per-request context for server components and actions: RLS-scoped client, user, active organisation, role. */
export async function ctx() {
  const { session, org } = await requireOrg();
  const sb = await createServer();
  return { sb, session, org, orgId: org.organization_id, role: org.role, can: (p: Permission) => can(org.role, p) };
}

/** Redirect back to a page with a one-shot message in the query string (shown by <Flash />). */
export function back(path: string, kind: "error" | "notice", message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(message)}`);
  throw new Error("unreachable");
}

export const field = (fd: FormData, key: string): string => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
};

/** Postgres/RPC error -> short user-facing message (never leaks SQL internals). */
export function friendly(err: { message?: string; code?: string } | null | undefined): string {
  if (!err) return "Something went wrong";
  const m = err.message ?? "";
  if (err.code === "42501" || /permission denied|row-level security/i.test(m)) return "You do not have permission to do that.";
  if (err.code === "23505") return "That already exists.";
  if (err.code === "23503") return "That refers to a record that does not exist or belongs to another organisation.";
  if (err.code === "23514") return "One of the values is not allowed.";
  if (err.code === "P0003") return "Your subscription is inactive. Renew it to continue posting transactions.";
  if (err.code === "P0002" || err.code === "P0001" || /^[A-Z]/.test(m)) return m.split("\n")[0].slice(0, 240);
  return "That could not be completed. Please try again.";
}
