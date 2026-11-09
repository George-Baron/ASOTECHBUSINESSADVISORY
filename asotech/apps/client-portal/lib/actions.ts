"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireSession, ORG_COOKIE_NAME } from "@asotech/supabase/server";
import { back, ctx, field, friendly } from "./ctx";

export async function switchOrg(fd: FormData) {
  const session = await requireSession();
  const id = field(fd, "organization_id");
  if (session.memberships.some((m) => m.organization_id === id)) {
    (await cookies()).set(ORG_COOKIE_NAME, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  redirect("/dashboard");
}

/** Client approval of a deliverable, quotation or milestone. The database re-checks role and state. */
export async function decide(fd: FormData) {
  const { sb, orgId } = await ctx();
  const entity = field(fd, "entity");
  const id = field(fd, "id");
  const approve = field(fd, "approve") === "true";
  const note = field(fd, "note") || null;
  const returnTo = field(fd, "return_to");
  const path = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard";
  if (!["deliverable", "quotation", "milestone"].includes(entity) || !/^[0-9a-f-]{36}$/i.test(id)) back(path, "error", "Invalid request");
  const { error } = await sb.rpc("client_decide", { p_org: orgId, p_entity: entity, p_id: id, p_approve: approve, p_note: note });
  if (error) back(path, "error", friendly(error));
  back(path, "notice", approve ? "Approved. Thank you." : "Your response has been recorded.");
}
