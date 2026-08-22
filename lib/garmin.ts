import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GarminConnect } from "garmin-connect";
import type { IOauth1Token, IOauth2Token } from "garmin-connect/dist/garmin/types";
import type { IActivity } from "garmin-connect/dist/garmin/types/activity";
import { todayISO } from "./calculations";
import { fetchHealthEntries, fetchStravaActivitiesMissingGarminEnrichment, saveGarminActivityEnrichment, saveHealthEntry } from "./data";

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
// never fail the whole sync. `debug` collects, per field, either the raw
// error or (when the call succeeds but none of the expected fields are
// there — this API is reverse-engineered, so its response shape is a
// best guess) the actual top-level keys that came back, so a silent
// mismatch is diagnosable instead of just quietly producing nothing.
export async function fetchGarminHealthSnapshot(
  client: GarminConnect,
  date: Date
): Promise<{ snapshot: GarminHealthSnapshot; debug: string[] }> {
  const snapshot: GarminHealthSnapshot = {};
  const debug: string[] = [];

  try {
    const sleep = await client.getSleepData(date);
    const seconds = sleep.dailySleepDTO?.sleepTimeSeconds;
    if (typeof seconds === "number" && seconds > 0) snapshot.sleepHours = Math.round((seconds / 3600) * 10) / 10;
    const score = sleep.dailySleepDTO?.sleepScores?.overall?.value;
    if (typeof score === "number") snapshot.sleepQuality = score;
    if (typeof sleep.avgOvernightHrv === "number" && sleep.avgOvernightHrv > 0) snapshot.hrv = Math.round(sleep.avgOvernightHrv);
    if (typeof sleep.restingHeartRate === "number" && sleep.restingHeartRate > 0) snapshot.restingHr = Math.round(sleep.restingHeartRate);
    if (snapshot.sleepHours === undefined && snapshot.hrv === undefined) {
      const topKeys = Object.keys(sleep ?? {}).join(", ") || "(brak)";
      const dtoKeys = sleep?.dailySleepDTO ? Object.keys(sleep.dailySleepDTO).join(", ") : "(brak dailySleepDTO)";
      debug.push(`sen/HRV: odpowiedź bez oczekiwanych pól — klucze: ${topKeys}; dailySleepDTO: ${dtoKeys}`);
    }
  } catch (err) {
    debug.push(`sen/HRV — błąd zapytania: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (snapshot.restingHr === undefined) {
    try {
      const hr = await client.getHeartRate(date);
      if (typeof hr.restingHeartRate === "number" && hr.restingHeartRate > 0) snapshot.restingHr = Math.round(hr.restingHeartRate);
    } catch (err) {
      debug.push(`tętno spoczynkowe — błąd zapytania: ${err instanceof Error ? err.message : String(err)}`);
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
    // waga zostaje ręczna — brak wpisu wagi u Garmina tego dnia to normalka, nie warto o tym ostrzegać
  }

  return { snapshot, debug };
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
): Promise<{ syncedFields: string[]; debug: string[] }> {
  const { snapshot, debug } = await fetchGarminHealthSnapshot(client, new Date());
  const syncedFields = (Object.keys(snapshot) as (keyof GarminHealthSnapshot)[]).filter((k) => snapshot[k] !== undefined);

  if (syncedFields.length === 0) return { syncedFields: [], debug };

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

  return { syncedFields: syncedFields.map((k) => SNAPSHOT_FIELD_LABEL[k]), debug };
}

// Strava and Garmin activities share no common ID, so a synced Strava
// activity is matched to the Garmin activity that started closest to the
// same instant — same watch, same GPS-synced clock, so a few minutes of
// tolerance easily covers upload/rounding differences without risking a
// mismatch against a different real activity nearby in time.
const GARMIN_MATCH_TOLERANCE_MS = 3 * 60 * 1000;
const GARMIN_ENRICHMENT_LOOKBACK_DAYS = 14;

export async function enrichStravaActivitiesWithGarmin(
  supabase: SupabaseClient,
  userId: string,
  client: GarminConnect
): Promise<{ enrichedCount: number }> {
  const since = new Date(Date.now() - GARMIN_ENRICHMENT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const pending = await fetchStravaActivitiesMissingGarminEnrichment(supabase, userId, since);
  if (pending.length === 0) return { enrichedCount: 0 };

  let garminActivities: IActivity[];
  try {
    garminActivities = await client.getActivities(0, 50);
  } catch {
    return { enrichedCount: 0 };
  }

  const usedGarminIds = new Set<number>();
  let enrichedCount = 0;

  for (const activity of pending) {
    const targetMs = new Date(activity.startDate).getTime();
    let best: IActivity | null = null;
    let bestDiff = Infinity;
    for (const ga of garminActivities) {
      if (usedGarminIds.has(ga.activityId) || typeof ga.beginTimestamp !== "number") continue;
      const diff = Math.abs(ga.beginTimestamp - targetMs);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = ga;
      }
    }
    if (!best || bestDiff > GARMIN_MATCH_TOLERANCE_MS) continue;
    usedGarminIds.add(best.activityId);

    await saveGarminActivityEnrichment(supabase, activity.id, {
      garminActivityId: best.activityId,
      vo2max: typeof best.vO2MaxValue === "number" ? best.vO2MaxValue : undefined,
      trainingEffectAerobic: typeof best.aerobicTrainingEffect === "number" ? best.aerobicTrainingEffect : undefined,
      trainingEffectAnaerobic: typeof best.anaerobicTrainingEffect === "number" ? best.anaerobicTrainingEffect : undefined,
      trainingEffectLabel: typeof best.trainingEffectLabel === "string" ? best.trainingEffectLabel : undefined,
      trainingLoad: typeof best.activityTrainingLoad === "number" ? best.activityTrainingLoad : undefined,
      avgRespirationRate: typeof best.avgRespirationRate === "number" ? best.avgRespirationRate : undefined,
      avgStress: typeof best.avgStress === "number" ? best.avgStress : undefined,
    });
    enrichedCount++;
  }

  return { enrichedCount };
}
