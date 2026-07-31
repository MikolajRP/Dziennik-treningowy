import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchStravaStreams, getValidAccessToken } from "@/lib/strava";

// On-demand proxy for one activity's time-series data (pace/HR/elevation),
// used only when a run's detail view is actually expanded — not stored,
// unlike the summary fields cached on import.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data: activity, error } = await supabase
    .from("strava_activities")
    .select("strava_activity_id")
    .eq("id", id)
    .single();
  if (error || !activity) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    const accessToken = await getValidAccessToken(supabase, user.id);
    const streams = await fetchStravaStreams(activity.strava_activity_id, accessToken);
    return NextResponse.json(streams);
  } catch {
    return NextResponse.json({ error: "Nie udało się pobrać danych ze Stravy." }, { status: 502 });
  }
}
