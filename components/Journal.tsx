"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart3, BookOpen, CalendarClock, CalendarDays, Dumbbell, HeartPulse, History, Link2, LogOut, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/auth/actions";
import {
  acceptCoachInvite,
  addCategoryRow,
  attachStravaActivities,
  deleteCycleRow,
  deleteHealthEntryRow,
  deletePersonalEventRow,
  deleteWorkoutRow,
  detachStravaActivity,
  disconnectStrava,
  inviteCoach,
  markWorkoutCommentRead,
  reorderPersonalEventsForDay,
  reorderStravaActivitiesInWorkout,
  reorderWorkoutsInDay,
  revokeCoachAccess,
  saveCycleRow,
  saveHealthEntry as saveHealthEntryRow,
  savePersonalEvent,
  saveWorkout as saveWorkoutRow,
  sendCoachInviteEmail,
  updateCoachPermissions,
} from "@/lib/data";
import type { GarminConnectionStatus, WorkoutCoachCommentState } from "@/lib/data";
import { StravaConnect } from "./StravaConnect";
import { ExportDataButton } from "./ExportDataButton";
import { ExportReminderBanner } from "./ExportReminderBanner";
import { HomePanel } from "./HomePanel";
import { PaperTabNav } from "./PaperTabNav";
import { ConnectionsTab } from "./ConnectionsTab";
import { CoachHelpModal } from "./CoachHelpModal";
import { HealthGate } from "./HealthGate";
import type { HealthDraft } from "./HealthEntryForm";
import { HealthTab, type HealthSubTab } from "./HealthTab";
import { PlanTab } from "./PlanTab";
import { PlannerTab, emptyEventDraft, type EventDraft } from "./PlannerTab";
import {
  addDays,
  addExerciseToList,
  addSetInList,
  emptyDraft,
  isLeafExerciseValid,
  cleanLeafExercise,
  removeExerciseFromList,
  removeSetInList,
  reorderExerciseInList,
  reorderPersonalEventInList,
  reorderStravaActivityInList,
  reorderWorkoutInList,
  todayISO,
  toggleUnilateralInList,
  updateExerciseInList,
  updateSetInList,
} from "@/lib/calculations";
import { latestHealthEntry } from "@/lib/healthCalculations";
import { FONT_DISPLAY, FONT_MONO, HEALTH, INK, INK_SOFT, MUSTARD, PAPER, PLANNER, TEAL, gridBg } from "@/lib/design";
import { coachTutorialSeenKey, newCoachWelcomeSeenKey } from "@/lib/onboarding";
import type { Category, CategoryGroup, Circuit, CoachAccess, Cycle, HealthEntry, LeafExercise, LeafKind, PersonalEvent, PlanEntry, Period, Race, Workout, WorkoutExercise } from "@/lib/types";
import { useReportsData } from "@/lib/useReportsData";
import { useSyncedState } from "@/lib/useSyncedState";
import { LogTab } from "./LogTab";
import { StatsTab } from "./StatsTab";
import type { CircuitElementHandlers } from "./CircuitEditor";

function emptyHealthDraft(entries: HealthEntry[]): HealthDraft {
  const latest = latestHealthEntry(entries);
  return {
    date: todayISO(),
    weightKg: latest ? String(latest.weightKg) : "",
    wellbeing: latest?.wellbeing ?? 5,
    notes: "",
  };
}

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
  initialHealthEntries,
  initialPersonalEvents,
  initialWorkoutCoachComments,
  initialGarminStatus,
}: {
  userId: string;
  userEmail: string;
  initialWorkouts: Workout[];
  initialCategories: Category[];
  initialCycles: Cycle[];
  initialStravaConnected: boolean;
  initialCoachGrants: CoachAccess[];
  initialPendingInvites: CoachAccess[];
  initialAthletesForCoach: CoachAccess[];
  initialPlanEntries: PlanEntry[];
  initialRaces: Race[];
  initialHealthEntries: HealthEntry[];
  initialPersonalEvents: PersonalEvent[];
  initialWorkoutCoachComments: Record<string, WorkoutCoachCommentState>;
  initialGarminStatus: GarminConnectionStatus;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  // The app opens on a home panel of big tiles; "Dziennik" is the only tile
  // that leads into a navigable cluster (its own tab bar) — Planner,
  // Zdrowie, and Połączenia are standalone destinations reachable only from
  // the home panel, with no way to hop sideways into the other tabs.
  const [view, setView] = useState<"home" | "cluster" | "planner" | "health" | "connections">("home");
  const [clusterTab, setClusterTab] = useState<"log" | "plan" | "stats" | "health">("log");

  // A soft crossfade layered on top of the home panel's tile-zoom (and,
  // in reverse, the "powrót" return): the overlay fades to opaque, the
  // view swaps underneath it while hidden, then it fades back out —
  // masks the instant swap so it reads as one continuous dissolve
  // instead of a hard cut.
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
  const [workouts, setWorkouts] = useSyncedState<Workout[]>(initialWorkouts);
  const [cycles, setCycles] = useSyncedState<Cycle[]>(initialCycles);
  const [categories, setCategories] = useSyncedState<Category[]>(initialCategories);
  const [planEntries] = useSyncedState<PlanEntry[]>(initialPlanEntries);
  const [races] = useSyncedState<Race[]>(initialRaces);
  // The text itself is coach-written and read-only here — only `unread`
  // ever changes from this side, flipped by handleMarkCommentRead below.
  const [workoutCoachComments, setWorkoutCoachComments] =
    useSyncedState<Record<string, WorkoutCoachCommentState>>(initialWorkoutCoachComments);
  async function handleMarkCommentRead(workoutId: string) {
    setWorkoutCoachComments((prev) =>
      prev[workoutId] ? { ...prev, [workoutId]: { ...prev[workoutId], unread: false } } : prev
    );
    try {
      await markWorkoutCommentRead(supabase, workoutId);
    } catch {
      // best-effort — the badge just re-appears after the next refresh if this failed
    }
  }

  // ---------- health (daily wellness check-in) ----------
  const [healthEntries, setHealthEntries] = useSyncedState<HealthEntry[]>(initialHealthEntries);
  // GarminConnect.tsx mutates via its own API routes and calls router.refresh()
  // afterwards — this just picks up the freshly re-fetched server value.
  const [garminStatus] = useSyncedState<GarminConnectionStatus>(initialGarminStatus);
  const hasTodayHealthEntry = healthEntries.some((h) => h.date === todayISO());
  const [editingHealthId, setEditingHealthId] = useState<string | null>(null);
  const [healthDraft, setHealthDraft] = useState<HealthDraft>(() => emptyHealthDraft(initialHealthEntries));
  const [healthSaving, setHealthSaving] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [confirmDeleteHealthId, setConfirmDeleteHealthId] = useState<string | null>(null);
  // Normally local to HealthTab, lifted here only so the desktop side-tab
  // nav's "Zdrowie" flyout (Statystyki/Historia) can read and drive it.
  const [healthSubTab, setHealthSubTab] = useState<HealthSubTab>("stats");

  function startHealthEdit(entry: HealthEntry) {
    setHealthDraft({
      date: entry.date,
      weightKg: String(entry.weightKg),
      wellbeing: entry.wellbeing,
      notes: entry.notes,
    });
    setEditingHealthId(entry.id);
    setHealthError(null);
  }
  function cancelHealthEdit() {
    setEditingHealthId(null);
    setHealthError(null);
  }
  async function handleSaveHealthEntry() {
    setHealthSaving(true);
    setHealthError(null);
    try {
      // Sleep/HRV/resting HR aren't in the form anymore (Garmin supplies
      // them) — carry over whatever this date already has instead of
      // clobbering it, defaulting to 0 for a brand-new entry that a Garmin
      // sync (triggered below) will fill in moments later. Weight stays
      // manual (raw text in the draft, comma or dot — see
      // HealthEntryForm.tsx), falling back the same way when left blank or
      // unparseable.
      const existingForDate = healthEntries.find((h) => h.date === healthDraft.date);
      const weightParsed = Number(healthDraft.weightKg.trim().replace(",", "."));
      const weightKg = healthDraft.weightKg.trim() !== "" && !Number.isNaN(weightParsed) ? weightParsed : (existingForDate?.weightKg ?? 0);
      const saved = await saveHealthEntryRow(
        supabase,
        userId,
        {
          date: healthDraft.date,
          sleepHours: existingForDate?.sleepHours ?? 0,
          sleepQuality: existingForDate?.sleepQuality ?? 50,
          hrv: existingForDate?.hrv ?? 0,
          restingHr: existingForDate?.restingHr ?? 0,
          weightKg,
          wellbeing: healthDraft.wellbeing,
          notes: healthDraft.notes,
        },
        editingHealthId
      );
      setHealthEntries((prev) => (editingHealthId ? prev.map((h) => (h.id === saved.id ? saved : h)) : [saved, ...prev]));
      setEditingHealthId(null);
      if (healthDraft.date === todayISO() && garminStatus.connected) {
        fetch("/api/garmin/sync", { method: "POST" })
          .then(() => router.refresh())
          .catch(() => {});
      }
    } catch {
      setHealthError("Nie udało się zapisać karty zdrowia — spróbuj ponownie.");
    } finally {
      setHealthSaving(false);
    }
  }
  async function handleDeleteHealthEntry(id: string) {
    try {
      await deleteHealthEntryRow(supabase, id);
      setHealthEntries((prev) => prev.filter((h) => h.id !== id));
    } finally {
      setConfirmDeleteHealthId(null);
    }
  }

  // ---------- planner (month/week calendar) ----------
  const [personalEvents, setPersonalEvents] = useSyncedState<PersonalEvent[]>(initialPersonalEvents);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [showAddEventForm, setShowAddEventFormState] = useState(false);
  const [eventDraft, setEventDraft] = useState<EventDraft>(emptyEventDraft());
  const [eventError, setEventError] = useState<string | null>(null);

  function setShowAddEventForm(open: boolean) {
    if (open) {
      setEventDraft(emptyEventDraft());
      setEditingEventId(null);
      setEventError(null);
    }
    setShowAddEventFormState(open);
  }
  function startEventEdit(event: PersonalEvent) {
    setEventDraft({ time: event.time ?? "", endTime: event.endTime ?? "", title: event.title, color: event.color, notes: event.notes });
    setEditingEventId(event.id);
    setShowAddEventFormState(false);
    setEventError(null);
  }
  function cancelEventForm() {
    setEditingEventId(null);
    setShowAddEventFormState(false);
    setEventError(null);
  }
  async function handleSaveEvent(date: string) {
    const title = eventDraft.title.trim();
    if (!title) return;
    const existing = editingEventId ? personalEvents.find((e) => e.id === editingEventId) : undefined;
    const untimedCount = personalEvents.filter((e) => e.date === date && !e.time).length;
    try {
      const saved = await savePersonalEvent(
        supabase,
        userId,
        {
          date,
          time: eventDraft.time || null,
          endTime: eventDraft.time ? eventDraft.endTime || null : null,
          title,
          color: eventDraft.color,
          notes: eventDraft.notes,
          done: existing?.done ?? false,
          sortOrder: existing?.sortOrder ?? untimedCount,
        },
        editingEventId
      );
      setPersonalEvents((prev) => (editingEventId ? prev.map((e) => (e.id === saved.id ? saved : e)) : [...prev, saved]));
      cancelEventForm();
    } catch {
      setEventError("Nie udało się zapisać wydarzenia — spróbuj ponownie.");
    }
  }
  async function handleDeleteEvent(id: string) {
    await deletePersonalEventRow(supabase, id);
    setPersonalEvents((prev) => prev.filter((e) => e.id !== id));
    if (editingEventId === id) cancelEventForm();
  }
  async function handleToggleEventDone(event: PersonalEvent) {
    const nextDone = !event.done;
    setPersonalEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, done: nextDone } : e)));
    try {
      await savePersonalEvent(
        supabase,
        userId,
        {
          date: event.date,
          time: event.time,
          endTime: event.endTime,
          title: event.title,
          color: event.color,
          notes: event.notes,
          done: nextDone,
          sortOrder: event.sortOrder,
        },
        event.id
      );
    } catch {
      // best-effort — local toggle is already applied; worst case it resyncs on next refresh
    }
  }
  async function handleReorderEvents(activeId: string, overId: string) {
    const active = personalEvents.find((e) => e.id === activeId);
    const over = personalEvents.find((e) => e.id === overId);
    if (!active || !over || active.date !== over.date) return;
    const dayUntimed = personalEvents.filter((e) => e.date === active.date && !e.time).sort((a, b) => a.sortOrder - b.sortOrder);
    const reordered = reorderPersonalEventInList(dayUntimed, activeId, overId);
    const newOrderById = new Map(reordered.map((e, i) => [e.id, i]));
    setPersonalEvents((prev) => prev.map((e) => (newOrderById.has(e.id) ? { ...e, sortOrder: newOrderById.get(e.id)! } : e)));
    try {
      await reorderPersonalEventsForDay(supabase, reordered.map((e) => e.id));
    } catch {
      // best-effort — local order is already applied; worst case it resyncs on next refresh
    }
  }

  // The Strava OAuth callback does a full server-driven redirect back to
  // "/", so this only needs router.refresh() (not its own mutation path)
  // to reflect a fresh connect — but disconnecting from Połączenia is a
  // plain client-side action, hence still a synced (not static) value.
  const [stravaConnected] = useSyncedState<boolean>(initialStravaConnected);
  async function handleDisconnectStrava() {
    await disconnectStrava(supabase);
    router.refresh();
  }
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);

  const [coachGrants, setCoachGrants] = useSyncedState<CoachAccess[]>(initialCoachGrants);
  const [pendingInvites, setPendingInvites] = useSyncedState<CoachAccess[]>(initialPendingInvites);
  const [athletesForCoach] = useSyncedState<CoachAccess[]>(initialAthletesForCoach);
  const [newCoachEmail, setNewCoachEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.search.includes("strava=")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // A brand-new coach who just clicked their invite email lands here (they
  // have no active grant yet, so they're not redirected into /coach/...) —
  // greet them with the same tutorial a coach sees later, with the pending
  // invite front and center so they don't have to go hunting for the accept
  // button buried in the Coach tab.
  const [showWelcome, setShowWelcome] = useState(false);
  const welcomeSeenKey = newCoachWelcomeSeenKey(userId);
  useEffect(() => {
    // localStorage only exists client-side, so this can't be read during the
    // initial (server) render — it has to be synchronized here, once, after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (pendingInvites.length > 0 && !localStorage.getItem(welcomeSeenKey)) setShowWelcome(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function closeWelcome() {
    setShowWelcome(false);
    localStorage.setItem(welcomeSeenKey, "1");
  }

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
  const [draft, setDraftState] = useState<Workout>(emptyDraft());
  const [newCategoryDrafts, setNewCategoryDrafts] = useState<Record<CategoryGroup, string>>({
    bieganie: "",
    inne: "",
    silownia: "",
  });
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
  function reorderExercise(activeId: string, overId: string) {
    setDraft((d) => ({ ...d, exercises: reorderExerciseInList(d.exercises, activeId, overId) }));
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
    setDraftState(emptyDraft());
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
    setDraftState(emptyDraft());
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

  async function handleReorderWorkouts(activeId: string, overId: string) {
    const active = workouts.find((w) => w.id === activeId);
    const over = workouts.find((w) => w.id === overId);
    if (!active || !over || active.date !== over.date) return;
    const dayItems = workouts.filter((w) => w.date === active.date).sort((a, b) => a.sortOrder - b.sortOrder);
    const reordered = reorderWorkoutInList(dayItems, activeId, overId);
    const newOrderById = new Map(reordered.map((w, i) => [w.id, i]));
    setWorkouts((prev) => prev.map((w) => (newOrderById.has(w.id) ? { ...w, sortOrder: newOrderById.get(w.id)! } : w)));
    try {
      await reorderWorkoutsInDay(supabase, reordered.map((w) => w.id));
    } catch {
      // best-effort — local order is already applied; worst case it resyncs on next refresh
    }
  }

  async function handleReorderActivities(workoutId: string, activeId: string, overId: string) {
    const workout = workouts.find((w) => w.id === workoutId);
    if (!workout?.stravaActivities) return;
    const reordered = reorderStravaActivityInList(workout.stravaActivities, activeId, overId);
    setWorkouts((prev) => prev.map((w) => (w.id === workoutId ? { ...w, stravaActivities: reordered } : w)));
    try {
      await reorderStravaActivitiesInWorkout(supabase, reordered.map((a) => a.id));
    } catch {
      // best-effort — local order is already applied; worst case it resyncs on next refresh
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

  function setNewCategoryDraft(group: CategoryGroup, v: string) {
    setNewCategoryDrafts((prev) => ({ ...prev, [group]: v }));
  }
  async function addCategory(group: CategoryGroup) {
    const v = newCategoryDrafts[group].trim();
    if (!v || categories.some((c) => c.name.toLowerCase() === v.toLowerCase())) return;
    await addCategoryRow(supabase, userId, v, group);
    setCategories((prev) => [...prev, { name: v, group }]);
    setDraft((d) => ({ ...d, category: v }));
    setNewCategoryDraft(group, "");
  }

  // ---------- coach access ----------
  async function handleInviteCoach() {
    const email = newCoachEmail.trim().toLowerCase();
    if (!email) return;
    setInviteError(null);
    try {
      const grant = await inviteCoach(supabase, userId, userEmail, email);
      setCoachGrants((prev) => [...prev, grant]);
      setNewCoachEmail("");
      const result = await sendCoachInviteEmail(email);
      if (!result.sent && !result.reason) {
        setInviteError(result.error ?? "Nie udało się wysłać maila z zaproszeniem.");
      }
    } catch {
      // most likely: already invited this email (unique constraint) — ignore
    }
  }
  async function handleAcceptInvite(id: string) {
    const grant = await acceptCoachInvite(supabase, id, userId);
    setPendingInvites((prev) => prev.filter((p) => p.id !== id));
    setCoachGrants((prev) => [...prev, grant]);
    setShowWelcome(false);
    localStorage.setItem(welcomeSeenKey, "1");
    // Already saw the same tutorial content just now — don't show it again
    // right after landing on the coach page.
    localStorage.setItem(coachTutorialSeenKey(userId), "1");
    router.push(`/coach/${grant.athleteUserId}`);
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
    setView("cluster");
    setClusterTab("log");
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

  // The Połączenia tile's home-panel background is a real screenshot of
  // this tab (mounted read-only, miniaturized in HomePanel.tsx) rather than
  // a custom visual, since there's no natural "chart" for it.
  const connectionsPreview = (
    <ConnectionsTab
      coachGrants={coachGrants}
      pendingInvites={pendingInvites}
      athletesForCoach={athletesForCoach}
      newCoachEmail=""
      setNewCoachEmail={() => {}}
      inviteError={null}
      onInvite={() => {}}
      onAccept={() => {}}
      onTogglePermission={() => {}}
      onRevoke={() => {}}
      garminConnected={garminStatus.connected}
      garminLastSyncedAt={garminStatus.lastSyncedAt}
      garminLastSyncError={garminStatus.lastSyncError}
      stravaConnected={stravaConnected}
      onDisconnectStrava={async () => {}}
    />
  );

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
        <div className={view === "home" ? "flex items-center justify-end gap-3" : "flex items-baseline justify-between"}>
          {view !== "home" && (
            <h1 className="text-2xl tracking-wide uppercase" style={{ fontFamily: FONT_DISPLAY, color: INK, fontWeight: 700 }}>
              Dziennik Treningowy
            </h1>
          )}
          <div className="flex items-center gap-3">
            <StravaConnect connected={stravaConnected} />
            <Dumbbell size={20} color={INK} />
            <ExportDataButton
              userId={userId}
              workouts={workouts}
              healthEntries={healthEntries}
              cycles={cycles}
              planEntries={planEntries}
              races={races}
              personalEvents={personalEvents}
              categories={categories}
            />
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
              onClick={() => setClusterTab("log")}
              className="flex items-center gap-1.5 pb-2 text-sm shrink-0"
              style={{
                fontFamily: FONT_MONO,
                color: clusterTab === "log" ? INK : INK_SOFT,
                borderBottom: clusterTab === "log" ? `2px solid ${MUSTARD}` : "2px solid transparent",
              }}
            >
              <BookOpen size={14} /> DZIENNIK
            </button>
            <button
              onClick={() => setClusterTab("plan")}
              className="flex items-center gap-1.5 pb-2 text-sm shrink-0"
              style={{
                fontFamily: FONT_MONO,
                color: clusterTab === "plan" ? INK : INK_SOFT,
                borderBottom: clusterTab === "plan" ? `2px solid ${MUSTARD}` : "2px solid transparent",
              }}
            >
              <CalendarDays size={14} /> PLAN
            </button>
            <button
              onClick={() => setClusterTab("stats")}
              className="flex items-center gap-1.5 pb-2 text-sm shrink-0"
              style={{
                fontFamily: FONT_MONO,
                color: clusterTab === "stats" ? INK : INK_SOFT,
                borderBottom: clusterTab === "stats" ? `2px solid ${MUSTARD}` : "2px solid transparent",
              }}
            >
              <BarChart3 size={14} /> STATYSTYKI
            </button>
            <button
              onClick={() => setClusterTab("health")}
              className="flex items-center gap-1.5 pb-2 text-sm shrink-0"
              style={{
                fontFamily: FONT_MONO,
                color: clusterTab === "health" ? INK : INK_SOFT,
                borderBottom: clusterTab === "health" ? `2px solid ${MUSTARD}` : "2px solid transparent",
              }}
            >
              <HeartPulse size={14} /> ZDROWIE
            </button>
          </div>
        )}
      </div>

      {view !== "home" && (
        <PaperTabNav
          tabs={[
            {
              id: "log-main",
              label: "Dziennik",
              icon: <BookOpen size={16} />,
              accent: INK,
              active: view === "cluster",
              onOpen: () => {
                startTileTransition();
                afterFade(() => {
                  setView("cluster");
                  setClusterTab("log");
                }, 180);
              },
              subtabs: [
                { id: "log", label: "Dziennik", icon: <BookOpen size={14} />, accent: MUSTARD, active: clusterTab === "log", onOpen: () => setClusterTab("log") },
                { id: "plan", label: "Plan", icon: <CalendarDays size={14} />, accent: MUSTARD, active: clusterTab === "plan", onOpen: () => setClusterTab("plan") },
                { id: "stats", label: "Statystyki", icon: <BarChart3 size={14} />, accent: MUSTARD, active: clusterTab === "stats", onOpen: () => setClusterTab("stats") },
                { id: "health-sub", label: "Zdrowie", icon: <HeartPulse size={14} />, accent: MUSTARD, active: clusterTab === "health", onOpen: () => setClusterTab("health") },
              ],
            },
            {
              id: "planner",
              label: "Planner",
              icon: <CalendarClock size={16} />,
              accent: PLANNER,
              active: view === "planner",
              onOpen: () => {
                startTileTransition();
                afterFade(() => setView("planner"), 180);
              },
            },
            {
              id: "health-main",
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
            {
              id: "connections",
              label: "Połączenia",
              icon: <Link2 size={16} />,
              accent: TEAL,
              active: view === "connections",
              badge: pendingInvites.length,
              onOpen: () => {
                startTileTransition();
                afterFade(() => setView("connections"), 180);
              },
            },
          ]}
        />
      )}

      <ExportReminderBanner
        userId={userId}
        workouts={workouts}
        healthEntries={healthEntries}
        cycles={cycles}
        planEntries={planEntries}
        races={races}
        personalEvents={personalEvents}
        categories={categories}
      />

      <div className={`px-4 ${view !== "home" ? "lg:relative lg:z-[3] lg:pr-28" : ""} mt-4`}>
        {view === "home" && (
          <HomePanel
            last12WeeksRunning={last12WeeksRunning}
            personalEvents={personalEvents}
            healthEntries={healthEntries}
            connectionsPreview={connectionsPreview}
            onOpenDziennik={() =>
              afterFade(() => {
                setView("cluster");
                setClusterTab("log");
              }, 0)
            }
            onOpenPlanner={() => afterFade(() => setView("planner"), 0)}
            onOpenZdrowie={() => afterFade(() => setView("health"), 0)}
            onOpenConnections={() => afterFade(() => setView("connections"), 0)}
            onTransitionStart={startTileTransition}
            pendingInviteCount={pendingInvites.length}
          />
        )}

        {view === "cluster" && clusterTab === "log" && (
          <LogTab
            showForm={showForm}
            startNew={startNew}
            draft={draft}
            setDraft={setDraft}
            categories={categories}
            newCategoryDrafts={newCategoryDrafts}
            setNewCategoryDraft={setNewCategoryDraft}
            addCategory={addCategory}
            addExercise={addExercise}
            updateExercise={updateExercise}
            removeExercise={removeExercise}
            reorderExercise={reorderExercise}
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
            onReorderWorkouts={handleReorderWorkouts}
            onDetachActivity={handleDetachActivity}
            onReorderActivities={handleReorderActivities}
            coachComments={workoutCoachComments}
            coachCommentEditable={false}
            onSaveCoachComment={() => {}}
            onMarkCommentRead={handleMarkCommentRead}
          />
        )}

        {(view === "health" || (view === "cluster" && clusterTab === "health")) && (
          <HealthTab
            healthEntries={healthEntries}
            editingId={editingHealthId}
            draft={healthDraft}
            setDraft={setHealthDraft}
            startEdit={startHealthEdit}
            cancelEdit={cancelHealthEdit}
            saveEntry={handleSaveHealthEntry}
            deleteEntry={handleDeleteHealthEntry}
            saving={healthSaving}
            formError={healthError}
            confirmDeleteId={confirmDeleteHealthId}
            setConfirmDeleteId={setConfirmDeleteHealthId}
            subTab={healthSubTab}
            onSubTabChange={setHealthSubTab}
          />
        )}

        {view === "cluster" && clusterTab === "stats" && (
          <StatsTab
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
            showCycleForm={showCycleForm}
            setShowCycleForm={setShowCycleForm}
            cycleDraft={cycleDraft}
            setCycleDraft={setCycleDraft}
            saveCycle={saveCycle}
            deleteCycle={deleteCycle}
          />
        )}

        {view === "cluster" && clusterTab === "plan" && (
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

        {view === "planner" && (
          <PlannerTab
            personalEvents={personalEvents}
            planEntries={planEntries}
            workouts={workouts}
            races={races}
            editingId={editingEventId}
            draft={eventDraft}
            setDraft={setEventDraft}
            showAddForm={showAddEventForm}
            setShowAddForm={setShowAddEventForm}
            startEdit={startEventEdit}
            cancelForm={cancelEventForm}
            saveEvent={handleSaveEvent}
            deleteEvent={handleDeleteEvent}
            toggleDone={handleToggleEventDone}
            reorderEvents={handleReorderEvents}
            onJumpToWorkout={jumpToWorkout}
            error={eventError}
          />
        )}

        {view === "connections" && (
          <ConnectionsTab
            coachGrants={coachGrants}
            pendingInvites={pendingInvites}
            athletesForCoach={athletesForCoach}
            newCoachEmail={newCoachEmail}
            setNewCoachEmail={setNewCoachEmail}
            inviteError={inviteError}
            onInvite={handleInviteCoach}
            onAccept={handleAcceptInvite}
            onTogglePermission={handleTogglePermission}
            onRevoke={handleRevokeCoach}
            garminConnected={garminStatus.connected}
            garminLastSyncedAt={garminStatus.lastSyncedAt}
            garminLastSyncError={garminStatus.lastSyncError}
            stravaConnected={stravaConnected}
            onDisconnectStrava={handleDisconnectStrava}
          />
        )}
      </div>

      <CoachHelpModal
        open={showWelcome}
        onClose={closeWelcome}
        pendingInvites={pendingInvites}
        onAcceptInvite={handleAcceptInvite}
      />

      {/* A brand-new coach lands here (not /coach/...) until they accept
          their invite, since they have no active grant yet — the health
          card is athlete-only, so it must not block that acceptance flow. */}
      <HealthGate
        open={!hasTodayHealthEntry && pendingInvites.length === 0}
        draft={healthDraft}
        setDraft={setHealthDraft}
        onSave={handleSaveHealthEntry}
        saving={healthSaving}
        error={healthError}
      />

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
