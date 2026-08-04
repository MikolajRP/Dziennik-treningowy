import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  fetchCategoriesReadOnly,
  fetchCoachGrantForAthlete,
  fetchCoachNotes,
  fetchCycles,
  fetchPlanEntries,
  fetchWorkouts,
} from "@/lib/data";
import { CoachAthleteView } from "@/components/CoachAthleteView";

export default async function CoachAthletePage({
  params,
}: {
  params: Promise<{ athleteId: string }>;
}) {
  const { athleteId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const grant = await fetchCoachGrantForAthlete(supabase, user.id, athleteId);
  if (!grant || !grant.canViewWorkouts) notFound();

  const [workouts, categories, cycles, planEntries, coachNotes] = await Promise.all([
    fetchWorkouts(supabase, athleteId),
    fetchCategoriesReadOnly(supabase, athleteId),
    fetchCycles(supabase, athleteId),
    fetchPlanEntries(supabase, athleteId),
    fetchCoachNotes(supabase, athleteId),
  ]);

  return (
    <CoachAthleteView
      athleteUserId={athleteId}
      coachUserId={user.id}
      coachAccessId={grant.id}
      athleteEmail={grant.athleteEmail}
      athleteName={grant.athleteName}
      workouts={workouts}
      categories={categories}
      initialCycles={cycles}
      initialPlanEntries={planEntries}
      initialCoachNotes={coachNotes}
      canViewReports={grant.canViewReports}
      canEditPlan={grant.canEditPlan}
    />
  );
}
