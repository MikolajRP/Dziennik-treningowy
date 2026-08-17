import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/crypto";
import {
  enrichStravaActivitiesWithGarmin,
  friendlyGarminError,
  garminLogin,
  garminRestoreSession,
  syncGarminHealthEntryForToday,
  type GarminTokens,
} from "@/lib/garmin";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: connection, error: fetchError } = await supabase
    .from("garmin_connections")
    .select("username_encrypted, password_encrypted, oauth1_token, oauth2_token")
    .eq("user_id", user.id)
    .maybeSingle();
  if (fetchError || !connection) {
    return NextResponse.json({ error: "Garmin nie jest połączony." }, { status: 400 });
  }

  const username = decryptSecret(connection.username_encrypted);
  const password = decryptSecret(connection.password_encrypted);

  let client;
  let tokens: GarminTokens;
  try {
    if (connection.oauth1_token && connection.oauth2_token) {
      ({ client, tokens } = await garminRestoreSession(username, password, {
        oauth1: connection.oauth1_token,
        oauth2: connection.oauth2_token,
      }));
    } else {
      ({ client, tokens } = await garminLogin(username, password));
    }
  } catch {
    // Cached session no longer works — one full re-login before giving up.
    try {
      ({ client, tokens } = await garminLogin(username, password));
    } catch (err) {
      const message = friendlyGarminError(err);
      await supabase.from("garmin_connections").update({ last_sync_error: message }).eq("user_id", user.id);
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  try {
    const { syncedFields } = await syncGarminHealthEntryForToday(supabase, user.id, client);
    const { enrichedCount } = await enrichStravaActivitiesWithGarmin(supabase, user.id, client);
    await supabase
      .from("garmin_connections")
      .update({ oauth1_token: tokens.oauth1, oauth2_token: tokens.oauth2, last_synced_at: new Date().toISOString(), last_sync_error: null })
      .eq("user_id", user.id);
    return NextResponse.json({ synced: true, syncedFields, enrichedCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("garmin_connections")
      .update({ oauth1_token: tokens.oauth1, oauth2_token: tokens.oauth2, last_sync_error: message })
      .eq("user_id", user.id);
    return NextResponse.json({ error: "Nie udało się pobrać danych z Garmina — spróbuj ponownie później." }, { status: 500 });
  }
}
