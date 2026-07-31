import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client that bypasses RLS. Only for the Strava webhook route,
// which is called by Strava directly and has no user session to scope
// queries to auth.uid() with.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
