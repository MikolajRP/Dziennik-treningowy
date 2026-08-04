import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const STRAVA_API = "https://www.strava.com/api/v3";

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  athlete?: { id: number };
}

export async function exchangeStravaCode(code: string): Promise<StravaTokenResponse> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`);
  return res.json();
}

async function refreshStravaToken(refreshToken: string): Promise<StravaTokenResponse> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`);
  return res.json();
}

interface ConnectionRow {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

// Returns a valid access token for the given user, refreshing (and
// persisting the refresh) if the stored token is expired or close to it.
export async function getValidAccessToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("strava_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  const row = data as ConnectionRow;

  const expiresAt = new Date(row.expires_at).getTime();
  const soon = Date.now() + 5 * 60 * 1000;
  if (expiresAt > soon) return row.access_token;

  const refreshed = await refreshStravaToken(row.refresh_token);
  await supabase
    .from("strava_connections")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
    })
    .eq("user_id", userId);
  return refreshed.access_token;
}

async function stravaGet(path: string, accessToken: string) {
  const res = await fetch(`${STRAVA_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Strava API ${path} failed: ${res.status}`);
  return res.json();
}

export function fetchStravaActivity(activityId: number | string, accessToken: string) {
  return stravaGet(`/activities/${activityId}`, accessToken);
}

export async function fetchStravaHrZones(
  activityId: number | string,
  accessToken: string
): Promise<{ min: number; max: number; time: number }[] | null> {
  try {
    const zones = await stravaGet(`/activities/${activityId}/zones`, accessToken);
    const hr = (zones as Array<{ type: string; distribution_buckets: unknown }>).find(
      (z) => z.type === "heartrate"
    );
    return (hr?.distribution_buckets as { min: number; max: number; time: number }[]) ?? null;
  } catch {
    // athlete has no HR zones configured, or activity has no HR data — not fatal
    return null;
  }
}

export function fetchStravaStreams(activityId: number | string, accessToken: string) {
  const keys = "time,distance,heartrate,altitude,velocity_smooth,latlng";
  return stravaGet(`/activities/${activityId}/streams?keys=${keys}&key_by_type=true`, accessToken);
}

interface StravaDetailedActivity {
  name: string;
  type: string;
  start_date: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  splits_metric?: unknown;
  map?: { summary_polyline?: string };
}

// Fetches a Strava activity + its HR zones, and writes both a new `workouts`
// row and its linked `strava_activities` row. Used by the webhook (new
// activity notifications) — every import gets its own standalone workout;
// merging into other workouts is a separate, manual step (see lib/data.ts).
//
// Strava redelivers webhook events that didn't get a fast-enough response,
// so this has to be safe to call twice for the same activity: it checks
// for an existing row first (fast path), and if a duplicate still slips
// through the race, it deletes the workout it just created instead of
// leaving an orphaned empty one behind.
export async function importStravaActivity(
  supabase: SupabaseClient,
  userId: string,
  stravaActivityId: number,
  category = "Cardio"
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("strava_activities")
    .select("id")
    .eq("strava_activity_id", stravaActivityId)
    .maybeSingle();
  if (existing) return null;

  const accessToken = await getValidAccessToken(supabase, userId);
  const activity = (await fetchStravaActivity(stravaActivityId, accessToken)) as StravaDetailedActivity;
  const hrZones = await fetchStravaHrZones(stravaActivityId, accessToken);
  const workoutDate = activity.start_date.slice(0, 10);

  // If a coach planned something for this date, use their description as
  // the imported workout's name — saves the athlete re-typing what it was.
  const { data: planEntry } = await supabase
    .from("plan_entries")
    .select("notes")
    .eq("athlete_user_id", userId)
    .eq("date", workoutDate)
    .order("slot", { ascending: true })
    .limit(1)
    .maybeSingle();
  const planName = planEntry?.notes?.trim() || null;

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .insert({
      user_id: userId,
      date: workoutDate,
      category,
      name: planName,
      notes: "",
      exercises: [],
    })
    .select("id")
    .single();
  if (workoutError) throw workoutError;

  const { error: activityError } = await supabase.from("strava_activities").insert({
    user_id: userId,
    workout_id: workout.id,
    strava_activity_id: stravaActivityId,
    name: activity.name,
    type: activity.type,
    start_date: activity.start_date,
    distance_m: activity.distance,
    moving_time_s: activity.moving_time,
    elapsed_time_s: activity.elapsed_time,
    elevation_gain_m: activity.total_elevation_gain,
    average_speed_mps: activity.average_speed,
    average_heartrate: activity.average_heartrate ?? null,
    max_heartrate: activity.max_heartrate ?? null,
    splits_metric: activity.splits_metric ?? null,
    hr_zones: hrZones,
    polyline: activity.map?.summary_polyline ?? null,
  });
  if (activityError) {
    // Lost the race against a concurrent duplicate delivery — the other
    // call owns this activity now, so don't leave this empty workout behind.
    await supabase.from("workouts").delete().eq("id", workout.id);
    const code = (activityError as { code?: string }).code;
    if (code !== "23505") throw activityError;
    return null;
  }

  return workout.id as string;
}
