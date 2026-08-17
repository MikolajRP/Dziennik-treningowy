import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GarminConnect } from "garmin-connect";
import type { IOauth1Token, IOauth2Token } from "garmin-connect/dist/garmin/types";
import { todayISO } from "./calculations";
import { fetchHealthEntries, saveHealthEntry } from "./data";

export interface GarminTokens {
  oauth1: IOauth1Token;
  oauth2: IOauth2Token;
}

// Garmin's real developer API needs partner approval, so this drives
// Garmin Connect's own unofficial web API instead — same login a browser
// session would use. login() throws on bad credentials, a locked account,
// or (unhandled by the library — see handleMFA in its HttpClient) when the
// account has two-factor login enabled.
export async function garminLogin(username: string, password: string): Promise<{ client: GarminConnect; tokens: GarminTokens }> {
  const client = new GarminConnect({ username, password });
  await client.login();
  return { client, tokens: client.exportToken() as GarminTokens };
}

// Reuses a cached session (oauth2, silently refreshed from oauth1 by the
// library on the first request if expired) instead of a fresh username/
// password login — falls back to garminLogin only when the caller catches
// this throwing.
export async function garminRestoreSession(username: string, password: string, tokens: GarminTokens): Promise<{ client: GarminConnect; tokens: GarminTokens }> {
  const client = new GarminConnect({ username, password });
  client.loadToken(tokens.oauth1, tokens.oauth2);
  await client.getUserProfile(); // cheap call that proves the session still works
  return { client, tokens: client.exportToken() as GarminTokens };
}

export interface GarminHealthSnapshot {
  sleepHours?: number;
  sleepQuality?: number;
  hrv?: number;
  restingHr?: number;
  weightKg?: number;
}

// Each field is fetched defensively: Garmin doesn't have every metric for
// every day (no weigh-in that day, watch not worn overnight, ...), and this
// unofficial API throws on an empty response — one missing field should
// never fail the whole sync.
export async function fetchGarminHealthSnapshot(client: GarminConnect, date: Date): Promise<GarminHealthSnapshot> {
  const snapshot: GarminHealthSnapshot = {};

  try {
    const sleep = await client.getSleepData(date);
    const seconds = sleep.dailySleepDTO?.sleepTimeSeconds;
    if (typeof seconds === "number" && seconds > 0) snapshot.sleepHours = Math.round((seconds / 3600) * 10) / 10;
    const score = sleep.dailySleepDTO?.sleepScores?.overall?.value;
    if (typeof score === "number") snapshot.sleepQuality = score;
    if (typeof sleep.avgOvernightHrv === "number" && sleep.avgOvernightHrv > 0) snapshot.hrv = Math.round(sleep.avgOvernightHrv);
    if (typeof sleep.restingHeartRate === "number" && sleep.restingHeartRate > 0) snapshot.restingHr = Math.round(sleep.restingHeartRate);
  } catch {
    // no sleep data for this day — leave those fields unset
  }

  if (snapshot.restingHr === undefined) {
    try {
      const hr = await client.getHeartRate(date);
      if (typeof hr.restingHeartRate === "number" && hr.restingHeartRate > 0) snapshot.restingHr = Math.round(hr.restingHeartRate);
    } catch {
      // no heart-rate data for this day either
    }
  }

  try {
    const weight = await client.getDailyWeightData(date);
    const entries = weight.dateWeightList ?? [];
    const latest = entries[entries.length - 1];
    if (latest && typeof latest.weight === "number" && latest.weight > 0) {
      // Garmin's weight API reports grams.
      snapshot.weightKg = Math.round((latest.weight / 1000) * 10) / 10;
    }
  } catch {
    // no weigh-in for this day
  }

  return snapshot;
}

// The library's own error messages are English and reference its internal
// terms ("Ticket") — translate the few known cases into something a user
// can actually act on.
export function friendlyGarminError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/Ticket not found or MFA/i.test(message)) {
    return "Logowanie nie powiodło się — jeśli masz włączoną weryfikację dwuetapową (MFA) na koncie Garmin, ta integracja jej nie obsługuje i trzeba ją tymczasowo wyłączyć na connect.garmin.com.";
  }
  if (/AccountLocked/i.test(message)) {
    return "Konto Garmin jest zablokowane — zaloguj się raz na connect.garmin.com, żeby je odblokować, i spróbuj ponownie.";
  }
  if (/Update Phone Number/i.test(message)) {
    return "Garmin prosi o potwierdzenie numeru telefonu — zaloguj się raz na connect.garmin.com, żeby to zrobić, i spróbuj ponownie.";
  }
  return "Nie udało się połączyć z Garmin Connect — sprawdź e-mail i hasło.";
}

const SNAPSHOT_FIELD_LABEL: Record<keyof GarminHealthSnapshot, string> = {
  sleepHours: "sen",
  sleepQuality: "jakość snu",
  hrv: "HRV",
  restingHr: "tętno spoczynkowe",
  weightKg: "waga",
};

// Pulls today's snapshot and merges it into today's health entry — Garmin
// only ever supplies the objective fields; wellbeing/notes stay whatever
// the athlete already entered (or their defaults, on a brand-new entry).
export async function syncGarminHealthEntryForToday(
  supabase: SupabaseClient,
  userId: string,
  client: GarminConnect
): Promise<{ syncedFields: string[] }> {
  const snapshot = await fetchGarminHealthSnapshot(client, new Date());
  const syncedFields = (Object.keys(snapshot) as (keyof GarminHealthSnapshot)[]).filter((k) => snapshot[k] !== undefined);

  if (syncedFields.length === 0) return { syncedFields: [] };

  const today = todayISO();
  const existingEntries = await fetchHealthEntries(supabase, userId);
  const existing = existingEntries.find((e) => e.date === today) ?? null;

  await saveHealthEntry(
    supabase,
    userId,
    {
      date: today,
      sleepHours: snapshot.sleepHours ?? existing?.sleepHours ?? 0,
      sleepQuality: snapshot.sleepQuality ?? existing?.sleepQuality ?? 50,
      hrv: snapshot.hrv ?? existing?.hrv ?? 0,
      restingHr: snapshot.restingHr ?? existing?.restingHr ?? 0,
      weightKg: snapshot.weightKg ?? existing?.weightKg ?? 0,
      wellbeing: existing?.wellbeing ?? 5,
      notes: existing?.notes ?? "",
    },
    existing?.id ?? null
  );

  return { syncedFields: syncedFields.map((k) => SNAPSHOT_FIELD_LABEL[k]) };
}
