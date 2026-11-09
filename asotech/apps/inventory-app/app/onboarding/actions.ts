"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServer, requireSession, ORG_COOKIE_NAME } from "@asotech/supabase/server";
import { slugify } from "@asotech/utilities";

export async function createOrganisation(fd: FormData) {
  await requireSession();
  const name = typeof fd.get("name") === "string" ? (fd.get("name") as string).trim() : "";
  if (name.length < 2 || name.length > 200) redirect(`/onboarding?error=${encodeURIComponent("Enter your business name (2 to 200 characters).")}`);
  const base = slugify(name) || "business";
  const sb = await createServer();
  let id: string | null = null;
  for (let attempt = 0; attempt < 4 && !id; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await sb.rpc("create_organization", { p_name: name, p_slug: slug });
    if (!error) id = data as string;
    else if (error.code !== "23505") redirect(`/onboarding?error=${encodeURIComponent("Could not create the organisation. Please try again.")}`);
  }
  if (!id) redirect(`/onboarding?error=${encodeURIComponent("Could not create a unique organisation address. Try a slightly different name.")}`);
  (await cookies()).set(ORG_COOKIE_NAME, id!, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/dashboard?notice=" + encodeURIComponent("Organisation created. Your 14-day trial has started."));
}
