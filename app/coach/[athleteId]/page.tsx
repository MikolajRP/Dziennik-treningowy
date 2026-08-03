import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  fetchCategoriesReadOnly,
  fetchCoachGrantForAthlete,
  fetchCycles,
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

  const [workouts, categories, cycles] = await Promise.all([
    fetchWorkouts(supabase, athleteId),
    fetchCategoriesReadOnly(supabase, athleteId),
    fetchCycles(supabase, athleteId),
  ]);

  return (
    <CoachAthleteView
      athleteEmail={grant.athleteEmail}
      workouts={workouts}
      categories={categories}
      cycles={cycles}
      canViewReports={grant.canViewReports}
    />
  );
}
