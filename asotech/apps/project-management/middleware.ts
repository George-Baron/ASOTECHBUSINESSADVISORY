import type { NextRequest } from "next/server";
import { updateSession } from "@asotech/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request, ["/login", "/register", "/forgot-password", "/reset-password", "/auth/", "/api/", "/forbidden"]);
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.svg|logo.svg|icon.svg).*)"] };
