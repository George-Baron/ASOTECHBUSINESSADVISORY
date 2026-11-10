import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { OrgRole } from "@asotech/types";

/** Request-scoped client acting as the signed-in user: Row Level Security applies. */
export async function createServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list: Array<{ name: string; value: string; options?: any }>) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch { /* called from a Server Component: the middleware refreshes the session instead */ }
      },
    },
  });
}

/** Service-role client. SERVER ONLY, bypasses RLS. Use solely in webhook/intake routes after authenticating the caller. */
export function createAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export interface Session {
  userId: string; email: string; fullName: string | null; isStaff: boolean;
  memberships: Array<{ organization_id: string; role: OrgRole; name: string; slug: string; kind: string }>;
}

/** Verified user (getUser validates the JWT with Supabase; never trust getSession on the server). */
export async function getSession(): Promise<Session | null> {
  const sb = await createServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const [{ data: members }, { data: staff }, { data: profile }] = await Promise.all([
    sb.from("organization_members").select("organization_id, role, organizations(name, slug, kind)").eq("user_id", user.id).eq("is_active", true),
    sb.rpc("is_staff"),
    sb.from("user_profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  type Row = { organization_id: string; role: OrgRole; organizations: { name: string; slug: string; kind: string } | { name: string; slug: string; kind: string }[] | null };
  const memberships = ((members ?? []) as Row[]).map((m) => {
    const o = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
    return { organization_id: m.organization_id, role: m.role, name: o?.name ?? "Organisation", slug: o?.slug ?? "", kind: o?.kind ?? "saas" };
  });
  return { userId: user.id, email: user.email ?? "", fullName: profile?.full_name ?? null, isStaff: staff === true, memberships };
}

export async function requireSession(loginPath = "/login"): Promise<Session> {
  const s = await getSession();
  if (!s) return redirect(loginPath);
  return s;
}

export async function requireStaff(loginPath = "/login"): Promise<Session> {
  const s = await requireSession(loginPath);
  if (!s.isStaff) return redirect("/forbidden");
  return s;
}

const ORG_COOKIE = "asotech_org";

/** Active organisation: the cookie value if the user belongs to it, else their first membership. */
export async function requireOrg(loginPath = "/login"): Promise<{ session: Session; org: Session["memberships"][number] }> {
  const session = await requireSession(loginPath);
  const store = await cookies();
  const wanted = store.get(ORG_COOKIE)?.value;
  const org = session.memberships.find((m) => m.organization_id === wanted) ?? session.memberships[0];
  if (!org) return redirect("/onboarding");
  return { session, org };
}

export const ORG_COOKIE_NAME = ORG_COOKIE;
