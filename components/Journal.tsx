"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, BookOpen, CalendarDays, Dumbbell, LogOut, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/auth/actions";
import {
  acceptCoachInvite,
  addCategoryRow,
  attachStravaActivities,
  deleteCycleRow,
  deleteWorkoutRow,
  detachStravaActivity,
  inviteCoach,
  revokeCoachAccess,
  saveCycleRow,
  saveWorkout as saveWorkoutRow,
  updateCoachPermissions,
} from "@/lib/data";
import { StravaConnect } from "./StravaConnect";
import { CoachTab } from "./CoachTab";
import { PlanTab } from "./PlanTab";
import {
  addDays,
  addExerciseToList,
  addSetInList,
  emptyDraft,
  isLeafExerciseValid,
  cleanLeafExercise,
  removeExerciseFromList,
  removeSetInList,
  todayISO,
  toggleUnilateralInList,
  updateExerciseInList,
  updateSetInList,
} from "@/lib/calculations";
import { FONT_DISPLAY, FONT_MONO, INK, INK_SOFT, MUSTARD, gridBg } from "@/lib/design";
import type { Circuit, CoachAccess, Cycle, LeafExercise, LeafKind, PlanEntry, Period, Race, Workout, WorkoutExercise } from "@/lib/types";
import { useReportsData } from "@/lib/useReportsData";
import { useSyncedState } from "@/lib/useSyncedState";
import { LogTab } from "./LogTab";
import { ReportsTab } from "./ReportsTab";
import type { CircuitElementHandlers } from "./CircuitEditor";

export function Journal({
  userId,
  userEmail,
  initialWorkouts,
  initialCategories,
  initialCycles,
  initialStravaConnected,
  initialCoachGrants,
  initialPendingInvites,
  initialAthletesForCoach,
  initialPlanEntries,
  initialRaces,
}: {
  userId: string;
  userEmail: string;
  initialWorkouts: Workout[];
  initialCategories: string[];
  initialCycles: Cycle[];
  initialStravaConnected: boolean;
  initialCoachGrants: CoachAccess[];
  initialPendingInvites: CoachAccess[];
  initialAthletesForCoach: CoachAccess[];
  initialPlanEntries: PlanEntry[];
  initialRaces: Race[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [tab, setTab] = useState<"log" | "reports" | "plan" | "coach">("log");
  const [workouts, setWorkouts] = useSyncedState<Workout[]>(initialWorkouts);
  const [cycles, setCycles] = useSyncedState<Cycle[]>(initialCycles);
  const [categories, setCategories] = useSyncedState<string[]>(initialCategories);
  const [planEntries] = useSyncedState<PlanEntry[]>(initialPlanEntries);
  const [races] = useSyncedState<Race[]>(initialRaces);
  // Reflects the server's fresh read on this page load — the Strava OAuth
  // callback does a full server-driven redirect back to "/", so this is
  // already up to date without needing client-side state.
  const stravaConnected = initialStravaConnected;
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);

  const [coachGrants, setCoachGrants] = useSyncedState<CoachAccess[]>(initialCoachGrants);
  const [pendingInvites, setPendingInvites] = useSyncedState<CoachAccess[]>(initialPendingInvites);
  const [athletesForCoach] = useSyncedState<CoachAccess[]>(initialAthletesForCoach);
  const [newCoachEmail, setNewCoachEmail] = useState("");

  useEffect(() => {
    if (window.location.search.includes("strava=")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // The app never syncs live — re-pull everything (via the server component
  // above us) whenever the tab/installed app comes back to the foreground,
  // so switching away and back is enough to see e.g. a plan a coach just
  // added, without needing a hard reload.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") router.refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraftState] = useState<Workout>(emptyDraft(initialCategories));
  const [newCategory, setNewCategory] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saving" | null>(null);

  const [period, setPeriod] = useState<Period>("week");
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [customStart, setCustomStart] = useState(addDays(todayISO(), -29));
  const [customEnd, setCustomEnd] = useState(todayISO());
  const [showCycleForm, setShowCycleForm] = useState(false);
  const [cycleDraft, setCycleDraftState] = useState<Cycle>({
    id: "",
    name: "",
    type: "mezocykl",
    start: todayISO(),
    end: addDays(todayISO(), 27),
  });

  function setDraft(updater: (d: Workout) => Workout) {
    setDraftState(updater);
  }
  function setCycleDraft(updater: (c: Cycle) => Cycle) {
    setCycleDraftState(updater);
  }

  // ---------- top-level draft editing ----------
  function addExercise(kind: LeafKind | "circuit") {
    setDraft((d) => ({ ...d, exercises: addExerciseToList(d.exercises, kind) }));
  }
  function updateExercise(id: string, patch: Partial<WorkoutExercise>) {
    setDraft((d) => ({ ...d, exercises: updateExerciseInList(d.exercises, id, patch) }));
  }
  function removeExercise(id: string) {
    setDraft((d) => ({ ...d, exercises: removeExerciseFromList(d.exercises, id) }));
  }
  function toggleUnilateral(id: string) {
    setDraft((d) => ({ ...d, exercises: toggleUnilateralInList(d.exercises as LeafExercise[], id) }));
  }
  function addSet(id: string) {
    setDraft((d) => ({ ...d, exercises: addSetInList(d.exercises as LeafExercise[], id) }));
  }
  function updateSet(id: string, idx: number, field: string, value: string) {
    setDraft((d) => ({ ...d, exercises: updateSetInList(d.exercises as LeafExercise[], id, idx, field, value) }));
  }
  function removeSet(id: string, idx: number) {
    setDraft((d) => ({ ...d, exercises: removeSetInList(d.exercises as LeafExercise[], id, idx) }));
  }

  // ---------- circuit + nested element editing ----------
  function updateCircuit(circuitId: string, updater: (c: Circuit) => Circuit) {
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((ex) => (ex.id === circuitId && ex.kind === "circuit" ? updater(ex) : ex)),
    }));
  }
  function circuitElementHandlers(circuitId: string): CircuitElementHandlers {
    return {
      add: (kind) => updateCircuit(circuitId, (c) => ({ ...c, elements: addExerciseToList(c.elements, kind) as LeafExercise[] })),
      update: (elId, patch) => updateCircuit(circuitId, (c) => ({ ...c, elements: updateExerciseInList(c.elements, elId, patch) as LeafExercise[] })),
      remove: (elId) => updateCircuit(circuitId, (c) => ({ ...c, elements: removeExerciseFromList(c.elements, elId) as LeafExercise[] })),
      toggleUnilateral: (elId) => updateCircuit(circuitId, (c) => ({ ...c, elements: toggleUnilateralInList(c.elements, elId) })),
      addSet: (elId) => updateCircuit(circuitId, (c) => ({ ...c, elements: addSetInList(c.elements, elId) })),
      updateSet: (elId, idx, field, value) => updateCircuit(circuitId, (c) => ({ ...c, elements: updateSetInList(c.elements, elId, idx, field, value) })),
      removeSet: (elId, idx) => updateCircuit(circuitId, (c) => ({ ...c, elements: removeSetInList(c.elements, elId, idx) })),
    };
  }

  function startNew() {
    setDraftState(emptyDraft(categories));
    setEditingId(null);
    setFormError(null);
    setSaveStatus(null);
    setShowForm(true);
  }
  function startEdit(w: Workout) {
    setDraftState(JSON.parse(JSON.stringify(w)));
    setEditingId(w.id);
    setFormError(null);
    setSaveStatus(null);
    setShowForm(true);
    setExpandedId(null);
  }
  function startDuplicate(w: Workout) {
    const copy = JSON.parse(JSON.stringify(w)) as Workout;
    copy.date = todayISO();
    setDraftState(copy);
    setEditingId(null); // saving creates a new workout rather than overwriting the original
    setFormError(null);
    setSaveStatus(null);
    setShowForm(true);
    setExpandedId(null);
  }
  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setFormError(null);
    setSaveStatus(null);
    setDraftState(emptyDraft(categories));
  }

  async function handleSaveWorkout() {
    const cleanedExercises = draft.exercises
      .map((ex) => {
        if (ex.kind === "circuit") {
          const elements = ex.elements.map(cleanLeafExercise).filter(isLeafExerciseValid);
          return { ...ex, elements };
        }
        return cleanLeafExercise(ex);
      })
      .filter((ex) => (ex.kind === "circuit" ? ex.elements.length > 0 : isLeafExerciseValid(ex)));

    const hasStravaActivity = (draft.stravaActivities?.length ?? 0) > 0;
    if (cleanedExercises.length === 0 && !hasStravaActivity) {
      setFormError("Dodaj przynajmniej jedno ćwiczenie z nazwą i wypełnioną serią (albo minutami), zanim zapiszesz trening.");
      return;
    }
    setFormError(null);
    setSaveStatus("saving");

    const cleaned: Workout = { ...draft, exercises: cleanedExercises };
    try {
      const saved = await saveWorkoutRow(supabase, userId, cleaned, editingId);
      setWorkouts((prev) => {
        const next = editingId ? prev.map((w) => (w.id === editingId ? saved : w)) : [...prev, saved];
        next.sort((a, b) => (a.date < b.date ? 1 : -1));
        return next;
      });
      setSaveStatus(null);
      cancelForm();
    } catch {
      setSaveStatus(null);
      setFormError("Nie udało się zapisać treningu — spróbuj ponownie.");
    }
  }

  async function deleteWorkout(id: string) {
    try {
      await deleteWorkoutRow(supabase, id);
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
    } finally {
      setConfirmDeleteId(null);
    }
  }

  async function handleMergeConfirm(sourceId: string, targetId: string) {
    try {
      const merged = await attachStravaActivities(supabase, sourceId, targetId);
      setWorkouts((prev) => prev.filter((w) => w.id !== sourceId).map((w) => (w.id === targetId ? merged : w)));
    } finally {
      setMergeSourceId(null);
    }
  }

  async function handleDetachActivity(activityRowId: string) {
    const { newWorkout, sourceWorkoutId, sourceDeleted } = await detachStravaActivity(
      supabase,
      userId,
      activityRowId,
      "Cardio"
    );
    setWorkouts((prev) => {
      const withoutDetached = prev.map((w) =>
        w.id === sourceWorkoutId
          ? { ...w, stravaActivities: (w.stravaActivities ?? []).filter((a) => a.id !== activityRowId) }
          : w
      );
      const next = sourceDeleted ? withoutDetached.filter((w) => w.id !== sourceWorkoutId) : withoutDetached;
      return [...next, newWorkout];
    });
  }

  async function addCategory() {
    const v = newCategory.trim();
    if (!v || categories.includes(v)) return;
    await addCategoryRow(supabase, userId, v);
    setCategories((prev) => [...prev, v]);
    setDraft((d) => ({ ...d, category: v }));
    setNewCategory("");
  }

  // ---------- coach access ----------
  async function handleInviteCoach() {
    const email = newCoachEmail.trim().toLowerCase();
    if (!email) return;
    try {
      const grant = await inviteCoach(supabase, userId, userEmail, email);
      setCoachGrants((prev) => [...prev, grant]);
      setNewCoachEmail("");
    } catch {
      // most likely: already invited this email (unique constraint) — ignore
    }
  }
  async function handleAcceptInvite(id: string) {
    const grant = await acceptCoachInvite(supabase, id, userId);
    setPendingInvites((prev) => prev.filter((p) => p.id !== id));
    setCoachGrants((prev) => [...prev, grant]);
  }
  async function handleTogglePermission(id: string, field: "canViewWorkouts" | "canViewReports" | "canEditPlan", value: boolean) {
    setCoachGrants((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)));
    await updateCoachPermissions(supabase, id, { [field]: value });
  }
  async function handleRevokeCoach(id: string) {
    await revokeCoachAccess(supabase, id);
    setCoachGrants((prev) => prev.filter((g) => g.id !== id));
  }

  // ---------- cycles ----------
  async function saveCycle() {
    if (!cycleDraft.name.trim()) return;
    const saved = await saveCycleRow(supabase, userId, userId, cycleDraft);
    setCycles((prev) => (cycleDraft.id ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved]));
    setShowCycleForm(false);
    setCycleDraftState({ id: "", name: "", type: "mezocykl", start: todayISO(), end: addDays(todayISO(), 27) });
  }
  async function deleteCycle(id: string) {
    await deleteCycleRow(supabase, id);
    setCycles((prev) => prev.filter((c) => c.id !== id));
    if (selectedCycleId === id) setSelectedCycleId(null);
  }

  // ---------- training plan (read-only for the athlete) ----------
  function jumpToWorkout(workoutId: string) {
    setTab("log");
    setExpandedId(workoutId);
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.getElementById(`workout-${workoutId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    });
  }

  // ---------- derived ----------
  const {
    prIds,
    knownExerciseNames,
    sortedWorkouts,
    rangeStart,
    rangeEnd,
    filtered,
    tonnageByCat,
    plyoByCat,
    isometricByCat,
    functionalByCat,
    aerobicByCat,
    totalTonnage,
    totalPlyoReps,
    totalIsometricTUT,
    totalFunctionalMinutes,
    totalAerobicMinutes,
    weeklySeries,
    totalRunningKm,
    totalRunningMinutes,
    weeklyRunningKmSeries,
    kmByActivityType,
    timeByActivityType,
    hrZones,
    totalOverallMinutes,
    tonnageByMuscleGroup,
    thisWeekRunning,
    last12WeeksRunning,
  } = useReportsData(workouts, cycles, period, selectedCycleId, customStart, customEnd);

  return (
    <div className="min-h-screen pb-10" style={gridBg}>
      <div className="sticky top-0 z-10 px-4 pt-4 pb-2" style={{ ...gridBg, borderBottom: `2px solid ${INK}` }}>
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl tracking-wide uppercase" style={{ fontFamily: FONT_DISPLAY, color: INK, fontWeight: 700 }}>
            Dziennik Treningowy
          </h1>
          <div className="flex items-center gap-3">
            <StravaConnect connected={stravaConnected} />
            <Dumbbell size={20} color={INK} />
            <button
              onClick={() => signOut()}
              title="Wyloguj"
              className="flex items-center gap-1 text-xs"
              style={{ fontFamily: FONT_MONO, color: INK_SOFT }}
            >
              <LogOut size={14} /> Wyloguj
            </button>
          </div>
        </div>
        <div className="flex gap-4 mt-3">
          <button
            onClick={() => setTab("log")}
            className="flex items-center gap-1.5 pb-2 text-sm"
            style={{ fontFamily: FONT_MONO, color: tab === "log" ? INK : INK_SOFT, borderBottom: tab === "log" ? `2px solid ${MUSTARD}` : "2px solid transparent" }}
          >
            <BookOpen size={14} /> DZIENNIK
          </button>
          <button
            onClick={() => setTab("reports")}
            className="flex items-center gap-1.5 pb-2 text-sm"
            style={{ fontFamily: FONT_MONO, color: tab === "reports" ? INK : INK_SOFT, borderBottom: tab === "reports" ? `2px solid ${MUSTARD}` : "2px solid transparent" }}
          >
            <BarChart3 size={14} /> RAPORTY
          </button>
          <button
            onClick={() => setTab("plan")}
            className="flex items-center gap-1.5 pb-2 text-sm"
            style={{ fontFamily: FONT_MONO, color: tab === "plan" ? INK : INK_SOFT, borderBottom: tab === "plan" ? `2px solid ${MUSTARD}` : "2px solid transparent" }}
          >
            <CalendarDays size={14} /> PLAN
          </button>
          <button
            onClick={() => setTab("coach")}
            className="flex items-center gap-1.5 pb-2 text-sm"
            style={{ fontFamily: FONT_MONO, color: tab === "coach" ? INK : INK_SOFT, borderBottom: tab === "coach" ? `2px solid ${MUSTARD}` : "2px solid transparent" }}
          >
            <Users size={14} /> TRENER
            {pendingInvites.length > 0 && (
              <span
                className="rounded-full text-[10px] px-1.5"
                style={{ fontFamily: FONT_MONO, background: "#A6402F", color: "#fff" }}
              >
                {pendingInvites.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 mt-4">
        {tab === "log" && (
          <LogTab
            showForm={showForm}
            startNew={startNew}
            draft={draft}
            setDraft={setDraft}
            categories={categories}
            newCategory={newCategory}
            setNewCategory={setNewCategory}
            addCategory={addCategory}
            addExercise={addExercise}
            updateExercise={updateExercise}
            removeExercise={removeExercise}
            addSet={addSet}
            updateSet={updateSet}
            removeSet={removeSet}
            toggleUnilateral={toggleUnilateral}
            circuitElementHandlers={circuitElementHandlers}
            saveWorkout={handleSaveWorkout}
            cancelForm={cancelForm}
            editingId={editingId}
            sortedWorkouts={sortedWorkouts}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            startEdit={startEdit}
            startDuplicate={startDuplicate}
            confirmDeleteId={confirmDeleteId}
            setConfirmDeleteId={setConfirmDeleteId}
            deleteWorkout={deleteWorkout}
            prIds={prIds}
            thisWeekKm={thisWeekRunning.km}
            formError={formError}
            saveStatus={saveStatus}
            knownExerciseNames={knownExerciseNames}
            mergeSourceId={mergeSourceId}
            setMergeSourceId={setMergeSourceId}
            onMergeConfirm={handleMergeConfirm}
            onDetachActivity={handleDetachActivity}
          />
        )}

        {tab === "reports" && (
          <ReportsTab
            period={period}
            setPeriod={setPeriod}
            cycles={cycles}
            selectedCycleId={selectedCycleId}
            setSelectedCycleId={setSelectedCycleId}
            customStart={customStart}
            setCustomStart={setCustomStart}
            customEnd={customEnd}
            setCustomEnd={setCustomEnd}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            totalTonnage={totalTonnage}
            totalPlyoReps={totalPlyoReps}
            totalIsometricTUT={totalIsometricTUT}
            totalFunctionalMinutes={totalFunctionalMinutes}
            totalAerobicMinutes={totalAerobicMinutes}
            filteredCount={filtered.length}
            tonnageByCat={tonnageByCat}
            plyoByCat={plyoByCat}
            isometricByCat={isometricByCat}
            functionalByCat={functionalByCat}
            aerobicByCat={aerobicByCat}
            weeklySeries={weeklySeries}
            totalRunningKm={totalRunningKm}
            totalRunningMinutes={totalRunningMinutes}
            weeklyRunningKmSeries={weeklyRunningKmSeries}
            kmByActivityType={kmByActivityType}
            timeByActivityType={timeByActivityType}
            hrZones={hrZones}
            totalOverallMinutes={totalOverallMinutes}
            tonnageByMuscleGroup={tonnageByMuscleGroup}
            thisWeekRunning={thisWeekRunning}
            last12WeeksRunning={last12WeeksRunning}
            showCycleForm={showCycleForm}
            setShowCycleForm={setShowCycleForm}
            cycleDraft={cycleDraft}
            setCycleDraft={setCycleDraft}
            saveCycle={saveCycle}
            deleteCycle={deleteCycle}
          />
        )}

        {tab === "plan" && (
          <PlanTab
            planEntries={planEntries}
            workouts={workouts}
            cycles={cycles}
            coachNotes={[]}
            editable={false}
            knownPlanNotes={[]}
            onAddEntry={() => {}}
            onAddSecond={() => {}}
            onUpdateEntry={() => {}}
            onDeleteEntry={() => {}}
            onJumpToWorkout={jumpToWorkout}
            onSaveNote={() => {}}
            races={races}
            onSaveRace={() => {}}
            onDeleteRace={() => {}}
            showCycleForm={showCycleForm}
            setShowCycleForm={setShowCycleForm}
            cycleDraft={cycleDraft}
            setCycleDraft={setCycleDraft}
            saveCycle={saveCycle}
            deleteCycle={deleteCycle}
          />
        )}

        {tab === "coach" && (
          <CoachTab
            coachGrants={coachGrants}
            pendingInvites={pendingInvites}
            athletesForCoach={athletesForCoach}
            newCoachEmail={newCoachEmail}
            setNewCoachEmail={setNewCoachEmail}
            onInvite={handleInviteCoach}
            onAccept={handleAcceptInvite}
            onTogglePermission={handleTogglePermission}
            onRevoke={handleRevokeCoach}
          />
        )}
      </div>
    </div>
  );
}
