import { redirect } from "next/navigation";
import { createAdmin, createServer, requireStaff } from "@asotech/supabase/server";

export type Row = Record<string, any>;

/** Per-request context: verified ASOTECH staff user and an RLS-scoped client (is_staff() policies apply). */
export async function staffCtx() {
  const session = await requireStaff();
  const sb = await createServer();
  return { sb, session };
}

/** Redirect to a path with a one-shot message in the query string (shown by <Flash />). */
export function back(path: string, kind: "error" | "notice", message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(message)}`);
  throw new Error("unreachable");
}

export const field = (fd: FormData, key: string): string => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string): boolean => UUID_RE.test(v);
export const optUuid = (fd: FormData, key: string): string | null => {
  const v = field(fd, key);
  return v !== "" && isUuid(v) ? v : null;
};
export const dateField = (fd: FormData, key: string): string | null => {
  const v = field(fd, key);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};
export const numField = (fd: FormData, key: string): number | null => {
  const v = field(fd, key).replace(/,/g, "");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};
export function oneOf<T extends string>(v: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}
/** Only same-site relative paths may be used as post-action targets (no open redirects). */
export function safeReturn(v: string, fallback: string): string {
  return v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : fallback;
}
/** PostgREST embeds may come back as an object or a one-element array. */
export function one<T>(x: T | T[] | null | undefined): T | null {
  if (Array.isArray(x)) return x[0] ?? null;
  return x ?? null;
}
export const today = (): string => new Date().toISOString().slice(0, 10);

/** Postgres/RPC error -> short user-facing message (never leaks SQL internals). */
export function friendly(err: { message?: string; code?: string } | null | undefined): string {
  if (!err) return "Something went wrong";
  const m = err.message ?? "";
  if (err.code === "42501" || /permission denied|row-level security/i.test(m)) return "You do not have permission to do that.";
  if (err.code === "23505") return "That already exists.";
  if (err.code === "23503") return "That refers to a record that does not exist or belongs to another organisation.";
  if (err.code === "23514") return "One of the values is not allowed.";
  if (err.code === "P0001" || err.code === "P0002" || /^[A-Z]/.test(m)) return m.split("\n")[0].slice(0, 240);
  return "That could not be completed. Please try again.";
}

/**
 * Staff users for assignee/PM pickers. platform_staff has no API grants (by design), so this reads it with
 * the service-role key AFTER requireStaff() has passed. Without the key it degrades to the signed-in user only.
 */
export async function staffUsers(self: { userId: string; fullName: string | null; email: string }): Promise<Array<{ id: string; name: string }>> {
  const fallback = [{ id: self.userId, name: self.fullName ?? self.email }];
  try {
    const admin = createAdmin();
    const { data: staff } = await admin.from("platform_staff").select("user_id").eq("is_active", true);
    const ids = ((staff ?? []) as Row[]).map((s: Row) => s.user_id as string);
    if (!ids.length) return fallback;
    const { data: profiles } = await admin.from("user_profiles").select("id, full_name").in("id", ids);
    const names = new Map(((profiles ?? []) as Row[]).map((p: Row) => [p.id as string, (p.full_name as string | null) ?? null]));
    return ids.map((id: string) => ({ id, name: names.get(id) ?? (id === self.userId ? self.email : id.slice(0, 8)) }));
  } catch {
    return fallback;
  }
}
