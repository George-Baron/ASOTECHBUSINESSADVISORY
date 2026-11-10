import { NextResponse, type NextRequest } from "next/server";
import { createServer } from "./server";

/** Route handler body for /auth/callback (email confirmation and password reset links). */
export async function handleAuthCallback(request: NextRequest) {
  const url = new URL(request.url);
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";
  if (code) {
    const sb = await createServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(base + next, url.origin));
  }
  return NextResponse.redirect(new URL(base + "/login?error=" + encodeURIComponent("That link is invalid or has expired"), url.origin));
}
