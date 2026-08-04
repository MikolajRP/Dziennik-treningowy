"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart3, BookOpen, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addPlanEntry, deleteCycleRow, deletePlanEntry, saveCycleRow, updatePlanEntry } from "@/lib/data";
import { addDays, emptyDraft, todayISO } from "@/lib/calculations";
import { FONT_DISPLAY, FONT_MONO, INK, INK_SOFT, MUSTARD, gridBg } from "@/lib/design";
import type { Cycle, PlanEntry, Period, Workout } from "@/lib/types";
import { useReportsData } from "@/lib/useReportsData";
import { useSyncedState } from "@/lib/useSyncedState";
import { LogTab } from "./LogTab";
import { ReportsTab } from "./ReportsTab";
import { PlanTab } from "./PlanTab";
import type { CircuitElementHandlers } from "./CircuitEditor";

const noop = () => {};

export function CoachAthleteView({
  athleteUserId,
  coachUserId,
  athleteEmail,
  workouts,
  categories,
  initialCycles,
  initialPlanEntries,
  canViewReports,
  canEditPlan,
}: {
  athleteUserId: string;
  coachUserId: string;
  athleteEmail: string;
  workouts: Workout[];
  categories: string[];
  initialCycles: Cycle[];
  initialPlanEntries: PlanEntry[];
  canViewReports: boolean;
  canEditPlan: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [tab, setTab] = useState<"log" | "reports" | "plan">("plan");

  // The app never syncs live — re-pull everything (via the server component
  // above us) whenever the tab/installed app comes back to the foreground.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") router.refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  const [period, setPeriod] = useState<Period>("week");
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [customStart, setCustomStart] = useState(addDays(todayISO(), -29));
  const [customEnd, setCustomEnd] = useState(todayISO());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [planError, setPlanError] = useState<string | null>(null);
  const SAVE_ERROR = "Nie udało się zapisać — spróbuj ponownie.";

  const [cycles, setCycles] = useSyncedState<Cycle[]>(initialCycles);
  const [showCycleForm, setShowCycleForm] = useState(false);
  const [cycleDraft, setCycleDraftState] = useState<Cycle>({
    id: "",
    name: "",
    type: "mezocykl",
    start: todayISO(),
    end: addDays(todayISO(), 27),
  });
  function setCycleDraft(updater: (c: Cycle) => Cycle) {
    setCycleDraftState(updater);
  }
  async function saveCycle() {
    if (!cycleDraft.name.trim()) return;
    setPlanError(null);
    try {
      const saved = await saveCycleRow(supabase, athleteUserId, cycleDraft);
      setCycles((prev) => (cycleDraft.id ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved]));
      setShowCycleForm(false);
      setCycleDraftState({ id: "", name: "", type: "mezocykl", start: todayISO(), end: addDays(todayISO(), 27) });
    } catch {
      setPlanError(SAVE_ERROR);
    }
  }
  async function deleteCycle(id: string) {
    setPlanError(null);
    try {
      await deleteCycleRow(supabase, id);
      setCycles((prev) => prev.filter((c) => c.id !== id));
      if (selectedCycleId === id) setSelectedCycleId(null);
    } catch {
      setPlanError(SAVE_ERROR);
    }
  }

  const [planEntries, setPlanEntries] = useSyncedState<PlanEntry[]>(initialPlanEntries);
  async function handleAddEntry(date: string) {
    setPlanError(null);
    try {
      const entry = await addPlanEntry(supabase, athleteUserId, coachUserId, {
        date,
        slot: "full",
        category: categories[0] ?? "",
        notes: "",
      });
      setPlanEntries((prev) => [...prev, entry]);
    } catch {
      setPlanError(SAVE_ERROR);
    }
  }
  async function handleAddSecond(date: string, firstEntryId: string) {
    setPlanError(null);
    try {
      await updatePlanEntry(supabase, firstEntryId, { slot: "am" });
      setPlanEntries((prev) => prev.map((e) => (e.id === firstEntryId ? { ...e, slot: "am" } : e)));
      const entry = await addPlanEntry(supabase, athleteUserId, coachUserId, {
        date,
        slot: "pm",
        category: categories[0] ?? "",
        notes: "",
      });
      setPlanEntries((prev) => [...prev, entry]);
    } catch {
      setPlanError(SAVE_ERROR);
    }
  }
  async function handleUpdateEntry(id: string, patch: { category?: string; notes?: string }) {
    setPlanError(null);
    setPlanEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    try {
      await updatePlanEntry(supabase, id, patch);
    } catch {
      setPlanError(SAVE_ERROR);
    }
  }
  async function handleDeleteEntry(id: string) {
    setPlanError(null);
    try {
      await deletePlanEntry(supabase, id);
      setPlanEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      setPlanError(SAVE_ERROR);
    }
  }

  function jumpToWorkout(workoutId: string) {
    setTab("log");
    setExpandedId(workoutId);
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.getElementById(`workout-${workoutId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    });
  }

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
    thisWeekTonnage,
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

  const emptyCircuitHandlers = (): CircuitElementHandlers => ({
    add: noop,
    update: noop,
    remove: noop,
    toggleUnilateral: noop,
    addSet: noop,
    updateSet: noop,
    removeSet: noop,
  });

  return (
    <div className="min-h-screen pb-10" style={gridBg}>
      <div className="sticky top-0 z-10 px-4 pt-4 pb-2" style={{ ...gridBg, borderBottom: `2px solid ${INK}` }}>
        <div className="flex items-baseline justify-between">
          <div>
            <Link
              href="/"
              className="flex items-center gap-1 text-xs mb-1"
              style={{ fontFamily: FONT_MONO, color: INK_SOFT }}
            >
              <ArrowLeft size={13} /> Powrót
            </Link>
            <h1 className="text-xl tracking-wide uppercase" style={{ fontFamily: FONT_DISPLAY, color: INK, fontWeight: 700 }}>
              {athleteEmail}
            </h1>
          </div>
        </div>
        <div className="flex gap-4 mt-3">
          <button
            onClick={() => setTab("plan")}
            className="flex items-center gap-1.5 pb-2 text-sm"
            style={{ fontFamily: FONT_MONO, color: tab === "plan" ? INK : INK_SOFT, borderBottom: tab === "plan" ? `2px solid ${MUSTARD}` : "2px solid transparent" }}
          >
            <CalendarDays size={14} /> PLAN
          </button>
          <button
            onClick={() => setTab("log")}
            className="flex items-center gap-1.5 pb-2 text-sm"
            style={{ fontFamily: FONT_MONO, color: tab === "log" ? INK : INK_SOFT, borderBottom: tab === "log" ? `2px solid ${MUSTARD}` : "2px solid transparent" }}
          >
            <BookOpen size={14} /> DZIENNIK
          </button>
          {canViewReports && (
            <button
              onClick={() => setTab("reports")}
              className="flex items-center gap-1.5 pb-2 text-sm"
              style={{ fontFamily: FONT_MONO, color: tab === "reports" ? INK : INK_SOFT, borderBottom: tab === "reports" ? `2px solid ${MUSTARD}` : "2px solid transparent" }}
            >
              <BarChart3 size={14} /> RAPORTY
            </button>
          )}
        </div>
      </div>

      <div className="px-4 mt-4">
        {tab === "log" && (
          <LogTab
            readOnly
            showForm={false}
            startNew={noop}
            draft={emptyDraft(categories)}
            setDraft={noop}
            categories={categories}
            newCategory=""
            setNewCategory={noop}
            addCategory={noop}
            addExercise={noop}
            updateExercise={noop}
            removeExercise={noop}
            addSet={noop}
            updateSet={noop}
            removeSet={noop}
            toggleUnilateral={noop}
            circuitElementHandlers={emptyCircuitHandlers}
            saveWorkout={noop}
            cancelForm={noop}
            editingId={null}
            sortedWorkouts={sortedWorkouts}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            startEdit={noop}
            startDuplicate={noop}
            confirmDeleteId={null}
            setConfirmDeleteId={noop}
            deleteWorkout={noop}
            prIds={prIds}
            thisWeekTonnage={thisWeekTonnage}
            formError={null}
            saveStatus={null}
            knownExerciseNames={knownExerciseNames}
            mergeSourceId={null}
            setMergeSourceId={noop}
            onMergeConfirm={noop}
            onDetachActivity={noop}
          />
        )}

        {tab === "reports" && canViewReports && (
          <ReportsTab
            readOnly
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
            showCycleForm={false}
            setShowCycleForm={noop}
            cycleDraft={{ id: "", name: "", type: "mezocykl", start: todayISO(), end: addDays(todayISO(), 27) }}
            setCycleDraft={noop}
            saveCycle={noop}
            deleteCycle={noop}
          />
        )}

        {tab === "plan" && (
          <PlanTab
            planEntries={planEntries}
            workouts={workouts}
            categories={categories}
            cycles={cycles}
            editable={canEditPlan}
            onAddEntry={handleAddEntry}
            onAddSecond={handleAddSecond}
            onUpdateEntry={handleUpdateEntry}
            onDeleteEntry={handleDeleteEntry}
            onJumpToWorkout={jumpToWorkout}
            showCycleForm={showCycleForm}
            setShowCycleForm={setShowCycleForm}
            cycleDraft={cycleDraft}
            setCycleDraft={setCycleDraft}
            saveCycle={saveCycle}
            deleteCycle={deleteCycle}
            error={planError}
          />
        )}
      </div>
    </div>
  );
}
