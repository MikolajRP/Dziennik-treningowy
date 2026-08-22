import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrichStravaActivitiesWithGarmin, establishGarminClient, syncGarminHealthEntryForToday } from "@/lib/garmin";

// Filling in the health card right after waking up is often *before*
// Garmin's servers have finished processing the night's sleep session from
// the watch — resting HR tends to already be available then, but sleep/HRV
// aren't yet, so the sync triggered by that save only picks up part of the
// snapshot. Rather than the athlete having to remember to hit "Synchronizuj
// teraz" again later, this cron re-runs the same sync for every connected
// account once the data has had time to show up. Scheduled in vercel.json;
// CRON_SECRET (set by Vercel automatically as a Bearer token when the env
// var exists) keeps this from being a public, unauthenticated bulk-login
// endpoint.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: connections, error } = await supabase
    .from("garmin_connections")
    .select("user_id, username_encrypted, password_encrypted, oauth1_token, oauth2_token");
  if (error || !connections) {
    return NextResponse.json({ error: "Nie udało się pobrać listy połączeń." }, { status: 500 });
  }

  let synced = 0;
  for (const connection of connections) {
    try {
      const { client, tokens } = await establishGarminClient(connection);
      await syncGarminHealthEntryForToday(supabase, connection.user_id, client);
      await enrichStravaActivitiesWithGarmin(supabase, connection.user_id, client);
      await supabase
        .from("garmin_connections")
        .update({ oauth1_token: tokens.oauth1, oauth2_token: tokens.oauth2, last_synced_at: new Date().toISOString(), last_sync_error: null })
        .eq("user_id", connection.user_id);
      synced++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await supabase.from("garmin_connections").update({ last_sync_error: message }).eq("user_id", connection.user_id);
    }
  }

  return NextResponse.json({ synced, total: connections.length });
}
