import { redirect } from "next/navigation";
import { createServer, requireOrg } from "@asotech/supabase/server";

/** Per-request context: RLS-scoped client, signed-in user, active client organisation. */
export async function ctx() {
  const { session, org } = await requireOrg();
  const sb = await createServer();
  return { sb, session, org, orgId: org.organization_id, role: org.role };
}

export function back(path: string, kind: "error" | "notice", message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(message)}`);
  throw new Error("unreachable");
}

export const field = (fd: FormData, key: string): string => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
};

export const todayIso = (): string => new Date().toISOString().slice(0, 10);

export function friendly(err: { message?: string; code?: string } | null | undefined): string {
  if (!err) return "Something went wrong";
  const m = err.message ?? "";
  if (err.code === "42501" || /permission denied|row-level security/i.test(m)) return "You do not have permission to do that.";
  if (err.code === "23514") return "One of the values is not allowed.";
  if (err.code === "P0001" || err.code === "P0002" || /^[A-Z]/.test(m)) return m.split("\n")[0].slice(0, 240);
  return "That could not be completed. Please try again.";
}

export const STAGES = ["discovery", "design", "development", "testing", "deployment", "support"] as const;
