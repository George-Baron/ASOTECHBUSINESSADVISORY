import type { NextRequest } from "next/server";
import { handleAuthCallback } from "@asotech/supabase/callback";

export const GET = (request: NextRequest) => handleAuthCallback(request);
