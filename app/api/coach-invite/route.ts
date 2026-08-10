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
  let { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });

  if (error && (error.status === 422 || /already/i.test(error.message))) {
    // Supabase refuses to re-invite an email that already has an auth.users
    // row — including one from a PREVIOUS invite the coach never actually
    // opened/accepted. That's the common case (someone asks to resend), so
    // look the user up and, if they've genuinely never signed in, delete the
    // stale unclaimed invite and send a fresh one instead of silently giving
    // up. coach_access matches a pending grant by coach_email, not by user
    // id, so recreating the auth user here doesn't orphan anything.
    const { data: list, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = listError ? null : list.users.find((u) => u.email?.toLowerCase() === email);
    if (existing && !existing.last_sign_in_at) {
      await admin.auth.admin.deleteUser(existing.id);
      ({ error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo }));
    } else {
      // A real, already-claimed account — nothing to resend; they'll see
      // the pending grant next time they log in with that existing account.
      return NextResponse.json({ sent: false, reason: "already_registered" });
    }
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sent: true });
}
