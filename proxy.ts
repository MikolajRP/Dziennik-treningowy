import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|api/strava/webhook|api/garmin/cron-sync|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
