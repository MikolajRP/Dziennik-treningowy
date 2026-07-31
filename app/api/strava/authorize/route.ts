import { NextResponse, type NextRequest } from "next/server";

// Redirects to Strava's OAuth consent screen. Kept server-side so the
// client ID never has to be exposed as a NEXT_PUBLIC_ env var.
export async function GET(request: NextRequest) {
  const redirectUri = `${request.nextUrl.origin}/api/strava/callback`;
  const url = new URL("https://www.strava.com/oauth/authorize");
  url.searchParams.set("client_id", process.env.STRAVA_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "activity:read_all");
  url.searchParams.set("approval_prompt", "auto");
  return NextResponse.redirect(url);
}
