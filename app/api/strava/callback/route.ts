import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeStravaCode } from "@/lib/strava";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  if (error || !code) {
    redirect("/?strava=error");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  let ok = true;
  try {
    const tokens = await exchangeStravaCode(code);
    if (!tokens.athlete) throw new Error("Missing athlete in Strava token response");

    const { error: upsertError } = await supabase.from("strava_connections").upsert({
      user_id: user.id,
      strava_athlete_id: tokens.athlete.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(tokens.expires_at * 1000).toISOString(),
    });
    if (upsertError) throw upsertError;
  } catch {
    ok = false;
  }

  redirect(ok ? "/?strava=connected" : "/?strava=error");
}
