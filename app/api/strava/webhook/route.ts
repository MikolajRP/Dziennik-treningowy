import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { importStravaActivity } from "@/lib/strava";

// Strava's one-time subscription handshake: echo back hub.challenge if the
// verify token matches. See app/api/strava/setup-webhook/route.ts, which
// registers this URL as the subscription's callback.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN && challenge) {
    return NextResponse.json({ "hub.challenge": challenge });
  }
  return NextResponse.json({ error: "verification failed" }, { status: 403 });
}

interface StravaWebhookEvent {
  object_type: "activity" | "athlete";
  object_id: number;
  aspect_type: "create" | "update" | "delete";
  owner_id: number;
}

// New-activity (and delete) notifications from Strava. No user session
// exists here — Strava calls this directly — so we use the service-role
// client and look up the owning user by their Strava athlete id.
export async function POST(request: NextRequest) {
  const event = (await request.json()) as StravaWebhookEvent;

  // Always 200 quickly for anything we don't act on, per Strava's webhook
  // contract (non-2xx or timeouts trigger retries).
  if (event.object_type !== "activity") {
    return NextResponse.json({ ok: true });
  }

  const supabase = createAdminClient();
  const { data: connection } = await supabase
    .from("strava_connections")
    .select("user_id")
    .eq("strava_athlete_id", event.owner_id)
    .maybeSingle();

  if (!connection) {
    return NextResponse.json({ ok: true });
  }

  if (event.aspect_type === "create") {
    try {
      await importStravaActivity(supabase, connection.user_id, event.object_id);
    } catch (err) {
      // Unique-constraint hit (already imported) is fine to ignore; log
      // anything else so it's visible in Vercel's function logs.
      const code = (err as { code?: string })?.code;
      if (code !== "23505") console.error("Strava import failed", err);
    }
  } else if (event.aspect_type === "delete") {
    const { data: activity } = await supabase
      .from("strava_activities")
      .select("id, workout_id")
      .eq("strava_activity_id", event.object_id)
      .maybeSingle();
    if (activity) {
      await supabase.from("strava_activities").delete().eq("id", activity.id);
      const { data: remaining } = await supabase
        .from("workouts")
        .select("id, exercises, strava_activities(id)")
        .eq("id", activity.workout_id)
        .maybeSingle();
      const hasExercises = remaining && Array.isArray(remaining.exercises) && remaining.exercises.length > 0;
      const hasOtherActivities =
        remaining && Array.isArray(remaining.strava_activities) && remaining.strava_activities.length > 0;
      if (remaining && !hasExercises && !hasOtherActivities) {
        await supabase.from("workouts").delete().eq("id", remaining.id);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
