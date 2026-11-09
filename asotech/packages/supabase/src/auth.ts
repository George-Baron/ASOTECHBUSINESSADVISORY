"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServer } from "./server";

/** Only same-site relative paths are allowed as post-login targets (prevents open redirects). */
export async function safeNext(next: FormDataEntryValue | string | null | undefined, fallback = "/dashboard"): Promise<string> {
  const v = typeof next === "string" ? next : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : fallback;
}

const clean = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");
const enc = (s: string) => encodeURIComponent(s);

export async function signIn(formData: FormData) {
  const email = clean(formData.get("email")).toLowerCase();
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : "";
  const next = await safeNext(formData.get("next"));
  if (!email || !password) redirect(`/login?error=${enc("Enter your email and password")}`);
  const sb = await createServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  // Generic message: do not reveal whether the account exists.
  if (error) redirect(`/login?error=${enc("Incorrect email or password")}&next=${enc(next)}`);
  redirect(next);
}

export async function signUp(formData: FormData) {
  const email = clean(formData.get("email")).toLowerCase();
  const fullName = clean(formData.get("full_name"));
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : "";
  if (fullName.length < 2) redirect(`/register?error=${enc("Enter your full name")}`);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect(`/register?error=${enc("Enter a valid email address")}`);
  if (password.length < 10) redirect(`/register?error=${enc("Use a password of at least 10 characters")}`);
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const sb = await createServer();
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { full_name: fullName }, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) redirect(`/register?error=${enc("We could not create that account. Try signing in or resetting your password.")}`);
  if (data.session) redirect("/dashboard");
  redirect(`/login?notice=${enc("Check your email to confirm your account, then sign in.")}`);
}

export async function requestPasswordReset(formData: FormData) {
  const email = clean(formData.get("email")).toLowerCase();
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  if (email) {
    const sb = await createServer();
    await sb.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/reset-password` });
  }
  redirect(`/login?notice=${enc("If that email is registered, a reset link is on its way.")}`);
}

export async function updatePassword(formData: FormData) {
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : "";
  if (password.length < 10) redirect(`/reset-password?error=${enc("Use a password of at least 10 characters")}`);
  const sb = await createServer();
  const { error } = await sb.auth.updateUser({ password });
  if (error) redirect(`/reset-password?error=${enc("Could not update the password. Request a new link.")}`);
  redirect(`/login?notice=${enc("Password updated. Sign in with your new password.")}`);
}

export async function signOut() {
  const sb = await createServer();
  await sb.auth.signOut();
  redirect("/login");
}
