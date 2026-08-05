import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Sends the coach a Supabase "invite" email with a link straight into the
// app. Requires a logged-in caller (the athlete) so this can't be used as an
// open spam-invite endpoint; the actual coach_access grant row is created
// separately, client-side, via inviteCoach() — this route only triggers the
// email.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "missing email" }, { status: 400 });
  }

  const admin = createAdminClient();
  const redirectTo = `${request.nextUrl.origin}/auth/confirm`;
  const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });

  if (error) {
    // A coach who already has an account (e.g. coaches someone else too)
    // can't be re-invited by Supabase — that's fine, they'll see the
    // pending grant next time they log in with their existing account.
    if (error.status === 422 || /already/i.test(error.message)) {
      return NextResponse.json({ sent: false, reason: "already_registered" });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sent: true });
}
