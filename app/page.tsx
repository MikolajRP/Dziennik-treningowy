import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  fetchAthletesForCoach,
  fetchCategories,
  fetchCoachGrantsAsAthlete,
  fetchCycles,
  fetchPendingInvitesForMe,
  fetchPlanEntries,
  fetchStravaConnected,
  fetchWorkouts,
} from "@/lib/data";
import { Journal } from "@/components/Journal";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // A coach account (this user has at least one accepted athlete) goes
  // straight to that athlete's page — no "pick a podopieczny" step, since
  // right now a coach only ever manages one athlete at a time.
  const athletesForCoach = await fetchAthletesForCoach(supabase, user.id);
  if (athletesForCoach.length > 0) {
    redirect(`/coach/${athletesForCoach[0].athleteUserId}`);
  }

  const [workouts, categories, cycles, stravaConnected, coachGrants, pendingInvites, planEntries] =
    await Promise.all([
      fetchWorkouts(supabase),
      fetchCategories(supabase, user.id),
      fetchCycles(supabase),
      fetchStravaConnected(supabase),
      fetchCoachGrantsAsAthlete(supabase, user.id),
      user.email ? fetchPendingInvitesForMe(supabase, user.email) : Promise.resolve([]),
      fetchPlanEntries(supabase, user.id),
    ]);

  return (
    <Journal
      userId={user.id}
      userEmail={user.email ?? ""}
      initialWorkouts={workouts}
      initialCategories={categories}
      initialCycles={cycles}
      initialStravaConnected={stravaConnected}
      initialCoachGrants={coachGrants}
      initialPendingInvites={pendingInvites}
      initialAthletesForCoach={athletesForCoach}
      initialPlanEntries={planEntries}
    />
  );
}
