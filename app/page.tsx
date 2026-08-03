import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  fetchAthletesForCoach,
  fetchCategories,
  fetchCoachGrantsAsAthlete,
  fetchCycles,
  fetchPendingInvitesForMe,
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

  const [workouts, categories, cycles, stravaConnected, coachGrants, pendingInvites, athletesForCoach] =
    await Promise.all([
      fetchWorkouts(supabase),
      fetchCategories(supabase, user.id),
      fetchCycles(supabase),
      fetchStravaConnected(supabase),
      fetchCoachGrantsAsAthlete(supabase, user.id),
      user.email ? fetchPendingInvitesForMe(supabase, user.email) : Promise.resolve([]),
      fetchAthletesForCoach(supabase, user.id),
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
    />
  );
}
