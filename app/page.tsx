import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchCategories, fetchCycles, fetchWorkouts } from "@/lib/data";
import { Journal } from "@/components/Journal";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [workouts, categories, cycles] = await Promise.all([
    fetchWorkouts(supabase),
    fetchCategories(supabase, user.id),
    fetchCycles(supabase),
  ]);

  return (
    <Journal
      userId={user.id}
      initialWorkouts={workouts}
      initialCategories={categories}
      initialCycles={cycles}
    />
  );
}
