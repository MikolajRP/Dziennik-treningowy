"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart3, BookOpen, CalendarDays, Check, HeartPulse, HelpCircle, History, LogOut, NotebookPen, Pencil, StickyNote, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/auth/actions";
import {
  addPlanEntry,
  deleteCoachNote,
  deleteCycleRow,
  deletePlanEntry,
  deleteRace,
  saveCoachNote,
  saveCycleRow,
  saveRace,
  saveWorkoutCoachComment,
  updateAthleteName,
  updatePlanEntry,
} from "@/lib/data";
import type { WorkoutCoachCommentState } from "@/lib/data";
import { addDays, emptyDraft, todayISO } from "@/lib/calculations";
import { collectKnownPlanNotes } from "@/lib/planCalculations";
import { LATEST_CHANGELOG_DATE } from "@/lib/changelog";
import { coachTutorialSeenKey } from "@/lib/onboarding";
import { FONT_DISPLAY, FONT_MONO, HEALTH, INK, INK_SOFT, MUSTARD, PAPER, PLANNER, RACE, TEAL, gridBg, inputStyle } from "@/lib/design";
import type { Category, CoachNote, Cycle, HealthEntry, PlanEntry, Period, Race, Workout } from "@/lib/types";
import { useReportsData } from "@/lib/useReportsData";
import { useSyncedState } from "@/lib/useSyncedState";
import { LogTab } from "./LogTab";
import { StatsTab } from "./StatsTab";
import { PlanTab } from "./PlanTab";
import { NotesTab } from "./NotesTab";
import { HealthTab, type HealthSubTab } from "./HealthTab";
import { EMPTY_HEALTH_DRAFT } from "./HealthEntryForm";
import { CoachHelpModal } from "./CoachHelpModal";
import { FloatingNoteWidget } from "./FloatingNoteWidget";
import { CoachHomePanel } from "./HomePanel";
import { PaperTabNav } from "./PaperTabNav";
import { AthleteProfileCard } from "./AthleteProfileCard";
import { IconBtn } from "./atoms";
import type { CircuitElementHandlers } from "./CircuitEditor";

const noop = () => {};

export function CoachAthleteView({
  athleteUserId,
  coachUserId,
  coachAccessId,
  athleteEmail,
  athleteName,
  workouts,
  categories,
  initialCycles,
  initialPlanEntries,
  initialCoachNotes,
  initialRaces,
  initialHealthEntries,
  initialWorkoutCoachComments,
  canViewReports,
  canEditPlan,
}: {
  athleteUserId: string;
  coachUserId: string;
  coachAccessId: string;
  athleteEmail: string;
  athleteName: string | null;
  workouts: Workout[];
  categories: Category[];
  initialCycles: Cycle[];
  initialPlanEntries: PlanEntry[];
  initialCoachNotes: CoachNote[];
  initialRaces: Race[];
  initialHealthEntries: HealthEntry[];
  initialWorkoutCoachComments: Record<string, WorkoutCoachCommentState>;
  canViewReports: boolean;
  canEditPlan: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  // Same two-level navigation as the athlete's own Journal: a home panel of
  // tiles, with "Plan" as the one tile that leads into a navigable cluster
  // (Plan/Statystyki/Dziennik/Notatki) and Zdrowie/Statystyki reachable
  // directly as standalone destinations too.
  const [view, setView] = useState<"home" | "cluster" | "health" | "stats">("home");
  const [clusterTab, setClusterTab] = useState<"plan" | "stats" | "log" | "notes">("plan");
  const [showNoteWidget, setShowNoteWidget] = useState(false);
  // Normally local to HealthTab, lifted here only so the desktop side-tab
  // nav's "Zdrowie" flyout (Statystyki/Historia) can read and drive it.
  const [healthSubTab, setHealthSubTab] = useState<HealthSubTab>("stats");

  const [fading, setFading] = useState(false);
  function startTileTransition() {
    setFading(true);
  }
  function afterFade(setter: () => void, delayMs: number) {
    setTimeout(() => {
      setter();
      requestAnimationFrame(() => requestAnimationFrame(() => setFading(false)));
    }, delayMs);
  }
  function goHome() {
    setFading(true);
    afterFade(() => setView("home"), 180);
  }
  const [healthEntries] = useSyncedState<HealthEntry[]>(initialHealthEntries);
  const healthByDate = useMemo(() => {
    const map: Record<string, HealthEntry> = {};
    healthEntries.forEach((h) => (map[h.date] = h));
    return map;
  }, [healthEntries]);

  // The app never syncs live — re-pull everything (via the server component
  // above us) whenever the tab/installed app comes back to the foreground.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") router.refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  // ---------- help / onboarding ----------
  const [showHelp, setShowHelp] = useState(false);
  const [hasUnreadChangelog, setHasUnreadChangelog] = useState(false);
  const tutorialSeenKey = coachTutorialSeenKey(coachUserId);
  const changelogSeenKey = `coachChangelogSeen:${coachUserId}`;
  useEffect(() => {
    // localStorage only exists client-side, so this can't be read during the
    // initial (server) render — it has to be synchronized here, once, after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!localStorage.getItem(tutorialSeenKey)) setShowHelp(true);
    const lastSeenChangelog = localStorage.getItem(changelogSeenKey);
    if (lastSeenChangelog !== LATEST_CHANGELOG_DATE) setHasUnreadChangelog(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function closeHelp() {
    setShowHelp(false);
    setHasUnreadChangelog(false);
    localStorage.setItem(tutorialSeenKey, "1");
    localStorage.setItem(changelogSeenKey, LATEST_CHANGELOG_DATE);
  }

  const [period, setPeriod] = useState<Period>("week");
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [customStart, setCustomStart] = useState(addDays(todayISO(), -29));
  const [customEnd, setCustomEnd] = useState(todayISO());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [planError, setPlanError] = useState<string | null>(null);
  const SAVE_ERROR = "Nie udało się zapisać — spróbuj ponownie.";

  // ---------- athlete display name ----------
  const [displayName, setDisplayName] = useSyncedState<string | null>(athleteName);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(displayName ?? "");
  async function saveAthleteName() {
    const trimmed = nameInput.trim();
    setDisplayName(trimmed || null);
    setEditingName(false);
    try {
      await updateAthleteName(supabase, coachAccessId, trimmed);
    } catch {
      setPlanError(SAVE_ERROR);
    }
  }

  // ---------- cycles ----------
  const [cycles, setCycles] = useSyncedState<Cycle[]>(initialCycles);
  const [showCycleForm, setShowCycleForm] = useState(false);
  const [cycleDraft, setCycleDraftState] = useState<Cycle>({
    id: "",
    name: "",
    type: "mezocykl",
    start: todayISO(),
    end: addDays(todayISO(), 27),
    color: null,
    notes: "",
    visibleToAthlete: true,
  });
  function setCycleDraft(updater: (c: Cycle) => Cycle) {
    setCycleDraftState(updater);
  }
  const emptyCycleDraft = (): Cycle => ({
    id: "",
    name: "",
    type: "mezocykl",
    start: todayISO(),
    end: addDays(todayISO(), 27),
    color: null,
    notes: "",
    visibleToAthlete: true,
  });
  async function saveCycle() {
    if (!cycleDraft.name.trim()) return;
    setPlanError(null);
    try {
      const saved = await saveCycleRow(supabase, athleteUserId, coachUserId, cycleDraft);
      setCycles((prev) => (cycleDraft.id ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved]));
      setShowCycleForm(false);
      setCycleDraftState(emptyCycleDraft());
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

  // ---------- plan entries ----------
  const [planEntries, setPlanEntries] = useSyncedState<PlanEntry[]>(initialPlanEntries);
  const knownPlanNotes = useMemo(() => collectKnownPlanNotes(planEntries), [planEntries]);
  async function handleAddEntry(date: string) {
    setPlanError(null);
    try {
      const entry = await addPlanEntry(supabase, athleteUserId, coachUserId, {
        date,
        slot: "full",
        category: "",
        notes: "",
        isDraft: true,
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
        category: "",
        notes: "",
        isDraft: true,
      });
      setPlanEntries((prev) => [...prev, entry]);
    } catch {
      setPlanError(SAVE_ERROR);
    }
  }
  async function handleUpdateEntry(id: string, patch: { notes?: string; guidance?: string; isDraft?: boolean }) {
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

  // ---------- private coach notes ----------
  const [coachNotes, setCoachNotes] = useSyncedState<CoachNote[]>(initialCoachNotes);
  async function handleSaveNote(date: string, text: string, existingId?: string) {
    setPlanError(null);
    try {
      const saved = await saveCoachNote(supabase, athleteUserId, coachUserId, { id: existingId, date, text });
      setCoachNotes((prev) => (existingId ? prev.map((n) => (n.id === saved.id ? saved : n)) : [saved, ...prev]));
    } catch {
      setPlanError(SAVE_ERROR);
    }
  }
  async function handleDeleteNote(id: string) {
    setPlanError(null);
    try {
      await deleteCoachNote(supabase, id);
      setCoachNotes((prev) => prev.filter((n) => n.id !== id));
    } catch {
      setPlanError(SAVE_ERROR);
    }
  }

  // ---------- workout comments (athlete-visible, unlike coach notes) ----------
  const [workoutCoachComments, setWorkoutCoachComments] =
    useSyncedState<Record<string, WorkoutCoachCommentState>>(initialWorkoutCoachComments);
  async function handleSaveWorkoutComment(workoutId: string, text: string) {
    // `unread` only matters for the athlete's own read-tracking; saving
    // resets it (mirrors the server, which does the same on upsert).
    setWorkoutCoachComments((prev) => ({ ...prev, [workoutId]: { text, unread: true } }));
    try {
      await saveWorkoutCoachComment(supabase, workoutId, athleteUserId, coachUserId, text);
    } catch {
      setPlanError(SAVE_ERROR);
    }
  }

  // ---------- races ----------
  const [races, setRaces] = useSyncedState<Race[]>(initialRaces);
  async function handleSaveRace(date: string, name: string, existingId?: string) {
    setPlanError(null);
    try {
      const saved = await saveRace(supabase, athleteUserId, coachUserId, { id: existingId, date, name });
      setRaces((prev) => (existingId ? prev.map((r) => (r.id === saved.id ? saved : r)) : [...prev, saved]));
    } catch {
      setPlanError(SAVE_ERROR);
    }
  }
  async function handleDeleteRace(id: string) {
    setPlanError(null);
    try {
      await deleteRace(supabase, id);
      setRaces((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setPlanError(SAVE_ERROR);
    }
  }

  function jumpToWorkout(workoutId: string) {
    setClusterTab("log");
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

  // Home-panel profile strip: the two most recent health entries (for the
  // HRV/samopoczucie trend arrows) and the single most recent workout —
  // independent of the report period filter above, always "right now."
  const sortedHealthEntries = useMemo(() => [...healthEntries].sort((a, b) => (a.date < b.date ? 1 : -1)), [healthEntries]);
  const latestHealthEntry = sortedHealthEntries[0] ?? null;
  const previousHealthEntry = sortedHealthEntries[1] ?? null;
  const lastWorkout = sortedWorkouts[0] ?? null;

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
      <div className={`sticky top-0 z-10 px-4 ${view !== "home" ? "lg:pr-28" : ""} pt-4 pb-2`} style={{ ...gridBg, borderBottom: `2px solid ${INK}` }}>
        {view !== "home" && (
          <button
            onClick={goHome}
            className="flex items-center gap-1 text-xs mb-1.5"
            style={{ fontFamily: FONT_MONO, color: INK_SOFT }}
          >
            <ArrowLeft size={14} /> Powrót
          </button>
        )}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => signOut()}
            title="Wyloguj"
            className="flex items-center gap-1 text-xs"
            style={{ fontFamily: FONT_MONO, color: INK_SOFT }}
          >
            <LogOut size={14} /> Wyloguj
          </button>
          <button onClick={() => setShowHelp(true)} title="Pomoc" className="relative p-1">
            <HelpCircle size={22} color={INK_SOFT} />
            {hasUnreadChangelog && (
              <div className="absolute top-0 right-0 rounded-full" style={{ width: 8, height: 8, background: RACE }} />
            )}
          </button>
        </div>
        <div className="flex items-center justify-end mt-1.5">
          <button
            onClick={() => setShowNoteWidget(true)}
            className="flex items-center gap-1 text-xs"
            style={{ fontFamily: FONT_MONO, color: INK_SOFT }}
          >
            <NotebookPen size={14} /> Dodaj notatkę
          </button>
        </div>
        {view !== "home" && (
          <div className="mt-2">
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveAthleteName()}
                  placeholder="Imię i nazwisko zawodnika"
                  className="px-2 py-1 rounded text-sm"
                  style={inputStyle}
                />
                <IconBtn onClick={saveAthleteName} title="Zapisz">
                  <Check size={16} />
                </IconBtn>
              </div>
            ) : (
              <button
                onClick={() => {
                  setNameInput(displayName ?? "");
                  setEditingName(true);
                }}
                className="flex items-center gap-1.5"
              >
                <h1 className="text-xl tracking-wide uppercase" style={{ fontFamily: FONT_DISPLAY, color: INK, fontWeight: 700 }}>
                  {displayName || athleteEmail}
                </h1>
                <Pencil size={13} color={INK_SOFT} />
              </button>
            )}
          </div>
        )}
        {view === "home" && (
          <h1
            className="tracking-wide uppercase text-center"
            style={{ fontFamily: FONT_DISPLAY, color: INK, fontWeight: 700, fontSize: 54, lineHeight: 1.05, margin: "30px 0 24px" }}
          >
            Dziennik
            <br />
            Treningowy
          </h1>
        )}
        {view === "cluster" && (
          <div className="flex gap-4 mt-3 overflow-x-auto lg:hidden" style={{ scrollbarWidth: "none" }}>
            <button
              onClick={() => setClusterTab("plan")}
              className="flex items-center gap-1.5 pb-2 text-sm shrink-0"
              style={{ fontFamily: FONT_MONO, color: clusterTab === "plan" ? INK : INK_SOFT, borderBottom: clusterTab === "plan" ? `2px solid ${MUSTARD}` : "2px solid transparent" }}
            >
              <CalendarDays size={14} /> PLAN
            </button>
            {canViewReports && (
              <button
                onClick={() => setClusterTab("stats")}
                className="flex items-center gap-1.5 pb-2 text-sm shrink-0"
                style={{ fontFamily: FONT_MONO, color: clusterTab === "stats" ? INK : INK_SOFT, borderBottom: clusterTab === "stats" ? `2px solid ${MUSTARD}` : "2px solid transparent" }}
              >
                <BarChart3 size={14} /> STATYSTYKI
              </button>
            )}
            <button
              onClick={() => setClusterTab("log")}
              className="flex items-center gap-1.5 pb-2 text-sm shrink-0"
              style={{ fontFamily: FONT_MONO, color: clusterTab === "log" ? INK : INK_SOFT, borderBottom: clusterTab === "log" ? `2px solid ${MUSTARD}` : "2px solid transparent" }}
            >
              <BookOpen size={14} /> DZIENNIK
            </button>
            <button
              onClick={() => setClusterTab("notes")}
              className="flex items-center gap-1.5 pb-2 text-sm shrink-0"
              style={{ fontFamily: FONT_MONO, color: clusterTab === "notes" ? INK : INK_SOFT, borderBottom: clusterTab === "notes" ? `2px solid ${MUSTARD}` : "2px solid transparent" }}
            >
              <StickyNote size={14} /> NOTATKI
            </button>
          </div>
        )}
      </div>

      {view !== "home" && (
        <PaperTabNav
          tabs={[
            {
              id: "plan",
              label: "Plan",
              icon: <CalendarDays size={16} />,
              accent: PLANNER,
              active: view === "cluster",
              onOpen: () => {
                startTileTransition();
                afterFade(() => {
                  setView("cluster");
                  setClusterTab("plan");
                }, 180);
              },
              subtabs: [
                { id: "plan-sub", label: "Plan", icon: <CalendarDays size={14} />, accent: MUSTARD, active: clusterTab === "plan", onOpen: () => setClusterTab("plan") },
                ...(canViewReports
                  ? [{ id: "stats-sub", label: "Statystyki", icon: <BarChart3 size={14} />, accent: MUSTARD, active: clusterTab === "stats", onOpen: () => setClusterTab("stats") }]
                  : []),
                { id: "log-sub", label: "Dziennik", icon: <BookOpen size={14} />, accent: MUSTARD, active: clusterTab === "log", onOpen: () => setClusterTab("log") },
                { id: "notes-sub", label: "Notatki", icon: <StickyNote size={14} />, accent: MUSTARD, active: clusterTab === "notes", onOpen: () => setClusterTab("notes") },
              ],
            },
            {
              id: "health",
              label: "Zdrowie",
              icon: <HeartPulse size={16} />,
              accent: HEALTH,
              active: view === "health",
              onOpen: () => {
                startTileTransition();
                afterFade(() => setView("health"), 180);
              },
              subtabs: [
                { id: "health-stats", label: "Statystyki", icon: <TrendingUp size={14} />, accent: MUSTARD, active: healthSubTab === "stats", onOpen: () => setHealthSubTab("stats") },
                { id: "health-history", label: "Historia", icon: <History size={14} />, accent: MUSTARD, active: healthSubTab === "history", onOpen: () => setHealthSubTab("history") },
              ],
            },
            ...(canViewReports
              ? [
                  {
                    id: "stats",
                    label: "Statystyki",
                    icon: <BarChart3 size={16} />,
                    accent: TEAL,
                    active: view === "stats" || (view === "cluster" && clusterTab === "stats"),
                    onOpen: () => {
                      startTileTransition();
                      afterFade(() => setView("stats"), 180);
                    },
                  },
                ]
              : []),
          ]}
        />
      )}

      <div className={`px-4 ${view !== "home" ? "lg:pr-28" : ""} mt-4`}>
        {view === "home" && (
          <div className="w-full max-w-[400px] mx-auto">
            <AthleteProfileCard
              latestHealth={latestHealthEntry}
              previousHealth={previousHealthEntry}
              lastWorkout={lastWorkout}
              onOpenZdrowie={() => {
                startTileTransition();
                afterFade(() => setView("health"), 180);
              }}
            />
            <CoachHomePanel
              planEntries={planEntries}
              workouts={workouts}
              races={races}
              healthEntries={healthEntries}
              last12WeeksRunning={last12WeeksRunning}
              onOpenPlan={() =>
                afterFade(() => {
                  setView("cluster");
                  setClusterTab("plan");
                }, 0)
              }
              onOpenZdrowie={() => afterFade(() => setView("health"), 0)}
              onOpenStatystyki={() => afterFade(() => setView("stats"), 0)}
              onTransitionStart={startTileTransition}
              canViewReports={canViewReports}
            />
          </div>
        )}

        {view === "cluster" && clusterTab === "log" && (
          <LogTab
            readOnly
            showForm={false}
            startNew={noop}
            draft={emptyDraft()}
            setDraft={noop}
            categories={categories}
            newCategoryDrafts={{ bieganie: "", inne: "", silownia: "" }}
            setNewCategoryDraft={noop}
            addCategory={noop}
            addExercise={noop}
            updateExercise={noop}
            removeExercise={noop}
            reorderExercise={noop}
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
            thisWeekKm={thisWeekRunning.km}
            formError={null}
            saveStatus={null}
            knownExerciseNames={knownExerciseNames}
            mergeSourceId={null}
            setMergeSourceId={noop}
            onMergeConfirm={noop}
            onReorderWorkouts={noop}
            onDetachActivity={noop}
            onReorderActivities={noop}
            onMarkCommentRead={noop}
            coachComments={workoutCoachComments}
            coachCommentEditable={canEditPlan}
            onSaveCoachComment={handleSaveWorkoutComment}
          />
        )}

        {view === "health" && (
          <HealthTab
            readOnly
            healthEntries={healthEntries}
            editingId={null}
            draft={EMPTY_HEALTH_DRAFT}
            setDraft={noop}
            startEdit={noop}
            cancelEdit={noop}
            saveEntry={noop}
            deleteEntry={noop}
            saving={false}
            formError={null}
            confirmDeleteId={null}
            setConfirmDeleteId={noop}
            subTab={healthSubTab}
            onSubTabChange={setHealthSubTab}
          />
        )}

        {(view === "stats" || (view === "cluster" && clusterTab === "stats")) && canViewReports && (
          <StatsTab
            readOnly
            showHealthSubTab
            workouts={workouts}
            healthEntries={healthEntries}
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
            cycleDraft={emptyCycleDraft()}
            setCycleDraft={noop}
            saveCycle={noop}
            deleteCycle={noop}
          />
        )}

        {view === "cluster" && clusterTab === "plan" && (
          <PlanTab
            planEntries={planEntries}
            workouts={workouts}
            cycles={cycles}
            races={races}
            coachNotes={coachNotes}
            editable={canEditPlan}
            knownPlanNotes={knownPlanNotes}
            onAddEntry={handleAddEntry}
            onAddSecond={handleAddSecond}
            onUpdateEntry={handleUpdateEntry}
            onDeleteEntry={handleDeleteEntry}
            onJumpToWorkout={jumpToWorkout}
            onSaveNote={handleSaveNote}
            onSaveRace={handleSaveRace}
            onDeleteRace={handleDeleteRace}
            showCycleForm={showCycleForm}
            setShowCycleForm={setShowCycleForm}
            cycleDraft={cycleDraft}
            setCycleDraft={setCycleDraft}
            saveCycle={saveCycle}
            deleteCycle={deleteCycle}
            error={planError}
            coachUserId={coachUserId}
            healthByDate={healthByDate}
          />
        )}

        {view === "cluster" && clusterTab === "notes" && (
          <NotesTab notes={coachNotes} onSaveNote={handleSaveNote} onDeleteNote={handleDeleteNote} />
        )}
      </div>

      <CoachHelpModal open={showHelp} onClose={closeHelp} />
      <FloatingNoteWidget open={showNoteWidget} onClose={() => setShowNoteWidget(false)} notes={coachNotes} onSaveNote={handleSaveNote} />

      <div
        className="fixed inset-0"
        style={{
          background: PAPER,
          opacity: fading ? 1 : 0,
          pointerEvents: "none",
          transition: "opacity 220ms ease",
          zIndex: 50,
        }}
      />
    </div>
  );
}
