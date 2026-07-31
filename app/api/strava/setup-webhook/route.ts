import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// One-time setup: visit this URL once, logged in, after deploying, to
// register this app's webhook with Strava. Not reachable from the sandbox
// this app was built in (network policy blocks api.strava.com from there),
// so it has to be triggered from a real browser — see README.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Zaloguj się do aplikacji, zanim to otworzysz." }, { status: 401 });
  }

  const callbackUrl = `${request.nextUrl.origin}/api/strava/webhook`;
  const res = await fetch("https://www.strava.com/api/v3/push_subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      callback_url: callbackUrl,
      verify_token: process.env.STRAVA_WEBHOOK_VERIFY_TOKEN,
    }),
  });
  const body = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      {
        ok: false,
        status: res.status,
        stravaResponse: body,
        note: "Jeśli błąd mówi, że subskrypcja już istnieje — wszystko jest już skonfigurowane, nic więcej nie musisz robić.",
      },
      { status: res.status }
    );
  }
  return NextResponse.json({ ok: true, subscription: body });
}
