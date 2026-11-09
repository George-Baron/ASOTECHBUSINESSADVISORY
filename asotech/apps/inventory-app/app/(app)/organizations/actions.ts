"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireSession, ORG_COOKIE_NAME } from "@asotech/supabase/server";

export async function switchOrganisation(fd: FormData) {
  const session = await requireSession();
  const id = typeof fd.get("id") === "string" ? (fd.get("id") as string) : "";
  if (!session.memberships.some((m) => m.organization_id === id)) redirect("/organizations?error=" + encodeURIComponent("You are not a member of that organisation."));
  (await cookies()).set(ORG_COOKIE_NAME, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/dashboard");
}
