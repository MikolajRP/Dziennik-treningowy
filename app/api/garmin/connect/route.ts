import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/crypto";
import { enrichStravaActivitiesWithGarmin, friendlyGarminError, garminLogin, syncGarminHealthEntryForToday } from "@/lib/garmin";

// Tests the given Garmin Connect login, stores it (encrypted) if it works,
// and immediately runs one sync so the athlete sees data land right away
// instead of having to separately hit "Synchronizuj teraz" afterwards.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!username || !password) {
    return NextResponse.json({ error: "Podaj e-mail i hasło do Garmin Connect." }, { status: 400 });
  }

  let client;
  let tokens;
  try {
    ({ client, tokens } = await garminLogin(username, password));
  } catch (err) {
    return NextResponse.json({ error: friendlyGarminError(err) }, { status: 400 });
  }

  const { error: upsertError } = await supabase.from("garmin_connections").upsert({
    user_id: user.id,
    username_encrypted: encryptSecret(username),
    password_encrypted: encryptSecret(password),
    oauth1_token: tokens.oauth1,
    oauth2_token: tokens.oauth2,
    last_synced_at: null,
    last_sync_error: null,
  });
  if (upsertError) {
    return NextResponse.json({ error: "Nie udało się zapisać połączenia — spróbuj ponownie." }, { status: 500 });
  }

  try {
    const { syncedFields } = await syncGarminHealthEntryForToday(supabase, user.id, client);
    const { enrichedCount } = await enrichStravaActivitiesWithGarmin(supabase, user.id, client);
    await supabase.from("garmin_connections").update({ last_synced_at: new Date().toISOString(), last_sync_error: null }).eq("user_id", user.id);
    return NextResponse.json({ connected: true, syncedFields, enrichedCount });
  } catch (err) {
    // The connection itself is good even if this first sync failed —
    // record the error but still report success so the UI shows "connected".
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from("garmin_connections").update({ last_sync_error: message }).eq("user_id", user.id);
    return NextResponse.json({ connected: true, syncedFields: [], syncError: message });
  }
}
