"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Eye, EyeOff, Flag, Pencil, Plus, Trash2, X } from "lucide-react";
import { addDays, addMonths, fmtHoursMinutes, fmtShort, getMonthWeeks, monthLabel, startOfMonth, todayISO } from "@/lib/calculations";
import { cycleForDate, entriesForDate, raceForDate, unplannedWorkoutsForDate, type PlanEntryStatus } from "@/lib/planCalculations";
import {
  AERO,
  CARD,
  FONT_DISPLAY,
  FONT_MONO,
  HEALTH,
  INK,
  INK_SOFT,
  ISO,
  LINE,
  MUSTARD,
  PLAN_DONE,
  PLAN_FUTURE,
  PLAN_LOGGED,
  PLAN_MISSED,
  PLYO,
  RACE,
  RUST,
  TEAL,
  inputStyle,
} from "@/lib/design";
import type { CoachNote, Cycle, CycleType, HealthEntry, PlanEntry, Race, Workout } from "@/lib/types";
import { Chip, Field, IconBtn } from "./atoms";

const WEEKDAY_LABELS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const SLOT_LABEL: Record<PlanEntry["slot"], string> = { am: "RANO", pm: "PO POŁUDNIU", full: "" };
export const STATUS_COLOR: Record<PlanEntryStatus, string> = { planned: PLAN_FUTURE, done: PLAN_DONE, missed: PLAN_MISSED };
export const STATUS_LABEL: Record<PlanEntryStatus, string> = { planned: "zaplanowany", done: "wykonany", missed: "niewykonany" };
const CYCLE_COLORS = [MUSTARD, PLYO, TEAL, AERO, ISO, RUST];

function PlanEntryCard({
  entry,
  status,
  matchedWorkoutId,
  editable,
  knownPlanNotes,
  onUpdateEntry,
  onDeleteEntry,
  onJumpToWorkout,
}: {
  entry: PlanEntry;
  status: PlanEntryStatus;
  matchedWorkoutId: string | null;
  editable: boolean;
  knownPlanNotes: string[];
  onUpdateEntry: (id: string, patch: { notes?: string; guidance?: string; isDraft?: boolean }) => void;
  onDeleteEntry: (id: string) => void;
  onJumpToWorkout: (workoutId: string) => void;
}) {
  const [notes, setNotes] = useState(entry.notes);
  const [notesOpen, setNotesOpen] = useState(false);
  const [guidance, setGuidance] = useState(entry.guidance);
  const color = STATUS_COLOR[status];

  const suggestions = useMemo(() => {
    const q = notes.trim().toLowerCase();
    const pool = q
      ? knownPlanNotes.filter((n) => n.toLowerCase().includes(q) && n.toLowerCase() !== q)
      : knownPlanNotes;
    return pool.slice(0, 6);
  }, [notes, knownPlanNotes]);

  function commitNotes(value: string) {
    setNotes(value);
    if (value !== entry.notes) onUpdateEntry(entry.id, { notes: value });
  }

  function commitGuidance(value: string) {
    setGuidance(value);
    if (value !== entry.guidance) onUpdateEntry(entry.id, { guidance: value });
  }

  return (
    <div
      className="p-2.5 rounded-md mb-1.5"
      style={{
        background: CARD,
        border: `1px ${entry.isDraft ? "dashed" : "solid"} ${LINE}`,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {SLOT_LABEL[entry.slot] && (
            <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT }}>{SLOT_LABEL[entry.slot]}</span>
          )}
          <span
            className="px-1.5 py-0.5 rounded-full text-[10px]"
            style={{ fontFamily: FONT_MONO, border: `1px solid ${color}`, color }}
          >
            {STATUS_LABEL[status]}
          </span>
          {entry.isDraft && (
            <span
              className="px-1.5 py-0.5 rounded-full text-[10px]"
              style={{ fontFamily: FONT_MONO, border: `1px dashed ${INK_SOFT}`, color: INK_SOFT }}
            >
              SZKIC
            </span>
          )}
        </div>
        {editable && (
          <div className="flex items-center gap-1">
            <IconBtn
              onClick={() => onUpdateEntry(entry.id, { isDraft: !entry.isDraft })}
              title={entry.isDraft ? "Opublikuj — zawodnik zobaczy" : "Cofnij do szkicu — ukryj przed zawodnikiem"}
            >
              {entry.isDraft ? <Eye size={13} /> : <EyeOff size={13} />}
            </IconBtn>
            <IconBtn onClick={() => onDeleteEntry(entry.id)} title="Usuń z planu" color={PLAN_MISSED}>
              <Trash2 size={13} />
            </IconBtn>
          </div>
        )}
      </div>

      {editable ? (
        <div className="relative">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onFocus={() => setNotesOpen(true)}
            onBlur={() => {
              setTimeout(() => setNotesOpen(false), 150);
              commitNotes(notes);
            }}
            placeholder="np. 6×800m tempo, przerwa 2 min"
            className="w-full px-2 py-1 rounded text-xs"
            style={inputStyle}
          />
          {notesOpen && suggestions.length > 0 && (
            <div
              className="absolute left-0 right-0 mt-1 rounded-md overflow-hidden z-10"
              style={{ background: "#fff", border: `1px solid ${INK}`, boxShadow: "0 4px 10px rgba(27,42,58,0.15)" }}
            >
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commitNotes(s);
                    setNotesOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs"
                  style={{ fontFamily: FONT_MONO, color: INK, background: CARD }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        entry.notes && <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK_SOFT }}>{entry.notes}</div>
      )}

      {editable ? (
        <textarea
          value={guidance}
          onChange={(e) => setGuidance(e.target.value)}
          onBlur={() => commitGuidance(guidance)}
          placeholder="Wskazówki (opcjonalnie) — np. technika, tempo, na co zwrócić uwagę"
          rows={2}
          className="w-full px-2 py-1 rounded text-xs mt-1.5"
          style={inputStyle}
        />
      ) : (
        entry.guidance && (
          <div className="mt-1.5 whitespace-pre-wrap" style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK_SOFT, fontStyle: "italic" }}>
            {entry.guidance}
          </div>
        )
      )}

      {status === "done" && matchedWorkoutId && (
        <button
          onClick={() => onJumpToWorkout(matchedWorkoutId)}
          className="text-xs mt-1.5"
          style={{ fontFamily: FONT_MONO, color: PLAN_DONE, textDecoration: "underline" }}
        >
          Zobacz w dzienniku →
        </button>
      )}
    </div>
  );
}

// A workout logged in the journal with nothing planned for it — read-only,
// just a pointer back into the dziennik, same visual language as a matched
// plan entry but in the lighter "unplanned" green.
function UnplannedWorkoutCard({ workout, onJumpToWorkout }: { workout: Workout; onJumpToWorkout: (workoutId: string) => void }) {
  return (
    <div className="p-2.5 rounded-md mb-1.5" style={{ background: CARD, border: `1px solid ${LINE}`, borderLeft: `3px solid ${PLAN_LOGGED}` }}>
      <span
        className="px-1.5 py-0.5 rounded-full text-[10px]"
        style={{ fontFamily: FONT_MONO, border: `1px solid ${PLAN_LOGGED}`, color: PLAN_LOGGED }}
      >
        Zarejestrowany (niezaplanowany)
      </span>
      {(workout.name || workout.category) && (
        <div className="mt-1" style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK }}>
          {workout.name || workout.category}
        </div>
      )}
      <button
        onClick={() => onJumpToWorkout(workout.id)}
        className="text-xs mt-1.5"
        style={{ fontFamily: FONT_MONO, color: PLAN_LOGGED, textDecoration: "underline" }}
      >
        Zobacz w dzienniku →
      </button>
    </div>
  );
}

// Compact, single-line summary of the athlete's self-reported wellness for
// one day — only wired in for the coach's calendar (see CoachAthleteView),
// deliberately terse so it doesn't compete for space with the plan/race
// cards it sits above.
function HealthDayStrip({ entry }: { entry: HealthEntry }) {
  return (
    <div
      className="mb-2 flex flex-wrap gap-x-3 gap-y-0.5 px-2 py-1 rounded"
      style={{ background: `${HEALTH}14`, fontFamily: FONT_MONO, fontSize: 10, color: HEALTH }}
    >
      <span>😴 {fmtHoursMinutes(entry.sleepHours)}</span>
      <span>❤️ {entry.restingHr} bpm</span>
      <span>HRV {entry.hrv}ms</span>
      <span>🙂 {entry.wellbeing}/10</span>
    </div>
  );
}

function DayNoteField({
  date,
  existingNote,
  onSaveNote,
}: {
  date: string;
  existingNote: CoachNote | undefined;
  onSaveNote: (date: string, text: string, existingId?: string) => void;
}) {
  const [text, setText] = useState(existingNote?.text ?? "");
  return (
    <div className="mt-2 pt-2" style={{ borderTop: `1px dashed ${LINE}` }}>
      <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT, marginBottom: 4 }}>
        NOTATKA (widoczna tylko dla Ciebie)
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== (existingNote?.text ?? "") && onSaveNote(date, text, existingNote?.id)}
        placeholder="prywatna notatka…"
        rows={2}
        className="w-full px-2 py-1 rounded text-xs"
        style={inputStyle}
      />
    </div>
  );
}

function DayRaceField({
  date,
  race,
  editable,
  onSaveRace,
  onDeleteRace,
}: {
  date: string;
  race: Race | null;
  editable: boolean;
  onSaveRace: (date: string, name: string, existingId?: string) => void;
  onDeleteRace: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(race?.name ?? "");

  if (!editable) {
    if (!race) return null;
    return (
      <div className="mb-2 px-2 py-1.5 rounded-md flex items-center gap-1.5" style={{ background: RACE }}>
        <Flag size={13} color="#fff" />
        <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: "#fff" }}>{race.name}</span>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="mb-2 flex items-center gap-1.5">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) {
              onSaveRace(date, name.trim(), race?.id);
              setEditing(false);
            }
          }}
          placeholder="Nazwa zawodów"
          className="flex-1 px-2 py-1 rounded text-xs"
          style={inputStyle}
        />
        <IconBtn
          onClick={() => {
            if (name.trim()) {
              onSaveRace(date, name.trim(), race?.id);
              setEditing(false);
            }
          }}
          title="Zapisz"
        >
          <Check size={14} />
        </IconBtn>
        <IconBtn onClick={() => setEditing(false)} title="Anuluj">
          <X size={14} />
        </IconBtn>
      </div>
    );
  }

  if (race) {
    return (
      <div className="mb-2 px-2 py-1.5 rounded-md flex items-center justify-between" style={{ background: RACE }}>
        <div className="flex items-center gap-1.5">
          <Flag size={13} color="#fff" />
          <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: "#fff" }}>{race.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn
            onClick={() => {
              setName(race.name);
              setEditing(true);
            }}
            title="Edytuj"
            color="#fff"
          >
            <Pencil size={13} />
          </IconBtn>
          <IconBtn onClick={() => onDeleteRace(race.id)} title="Usuń" color="#fff">
            <Trash2 size={13} />
          </IconBtn>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setName("");
        setEditing(true);
      }}
      className="mb-2 flex items-center gap-1 text-xs px-2 py-1 rounded"
      style={{ fontFamily: FONT_MONO, border: `1px dashed ${RACE}`, color: RACE }}
    >
      <Flag size={12} /> Dodaj zawody
    </button>
  );
}

export function PlanTab({
  planEntries,
  workouts,
  cycles,
  races,
  coachNotes,
  editable,
  knownPlanNotes,
  onAddEntry,
  onAddSecond,
  onUpdateEntry,
  onDeleteEntry,
  onJumpToWorkout,
  onSaveNote,
  onSaveRace,
  onDeleteRace,
  showCycleForm,
  setShowCycleForm,
  cycleDraft,
  setCycleDraft,
  saveCycle,
  deleteCycle,
  error,
  coachUserId,
  healthByDate,
}: {
  planEntries: PlanEntry[];
  workouts: Workout[];
  cycles: Cycle[];
  races: Race[];
  coachNotes: CoachNote[];
  editable: boolean;
  knownPlanNotes: string[];
  onAddEntry: (date: string) => void;
  onAddSecond: (date: string, firstEntryId: string) => void;
  onUpdateEntry: (id: string, patch: { notes?: string; guidance?: string; isDraft?: boolean }) => void;
  onDeleteEntry: (id: string) => void;
  onJumpToWorkout: (workoutId: string) => void;
  onSaveNote: (date: string, text: string, existingId?: string) => void;
  onSaveRace: (date: string, name: string, existingId?: string) => void;
  onDeleteRace: (id: string) => void;
  showCycleForm: boolean;
  setShowCycleForm: (v: boolean) => void;
  cycleDraft: Cycle;
  setCycleDraft: (updater: (c: Cycle) => Cycle) => void;
  saveCycle: () => void;
  deleteCycle: (id: string) => void;
  error?: string | null;
  coachUserId?: string;
  healthByDate?: Record<string, HealthEntry>;
}) {
  const today = todayISO();
  const [monthStart, setMonthStart] = useState(startOfMonth(today));
  const [expandedWeekStart, setExpandedWeekStart] = useState<string | null>(null);

  return (
    <div>
      {error && (
        <div
          className="text-xs mb-3 px-2 py-1.5 rounded"
          style={{ fontFamily: FONT_MONO, background: "#FBEAE7", color: PLAN_MISSED, border: `1px solid ${PLAN_MISSED}` }}
        >
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <IconBtn onClick={() => setMonthStart((m) => addMonths(m, -1))} title="Poprzedni miesiąc">
          <ChevronLeft size={18} />
        </IconBtn>
        <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: INK, fontWeight: 600 }}>{monthLabel(monthStart)}</div>
        <IconBtn onClick={() => setMonthStart((m) => addMonths(m, 1))} title="Następny miesiąc">
          <ChevronRight size={18} />
        </IconBtn>
      </div>

      {monthStart !== startOfMonth(today) && (
        <div className="text-center mb-3">
          <button
            onClick={() => setMonthStart(startOfMonth(today))}
            className="text-xs"
            style={{ fontFamily: FONT_MONO, color: INK_SOFT, textDecoration: "underline" }}
          >
            Wróć do bieżącego miesiąca
          </button>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((l) => (
          <div key={l} className="text-center" style={{ fontFamily: FONT_MONO, fontSize: 9, color: INK_SOFT }}>
            {l}
          </div>
        ))}
      </div>

      <div className="mb-6">
        {getMonthWeeks(monthStart).map((weekStart) => {
          const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
          const isExpanded = expandedWeekStart === weekStart;
          return (
            <div key={weekStart} className="mb-1">
              <button
                onClick={() => setExpandedWeekStart(isExpanded ? null : weekStart)}
                className="grid grid-cols-7 gap-1 w-full rounded-md p-0.5"
                style={{ background: isExpanded ? "#FBF6EC" : "transparent", border: `1px solid ${isExpanded ? MUSTARD : "transparent"}` }}
              >
                {weekDates.map((date) => {
                  const inMonth = date.slice(0, 7) === monthStart.slice(0, 7);
                  const dayEntries = entriesForDate(planEntries, workouts, date);
                  const unplannedWorkouts = unplannedWorkoutsForDate(planEntries, workouts, date);
                  const isToday = date === today;
                  const cycle = cycleForDate(cycles, date);
                  const race = raceForDate(races, date);
                  return (
                    <div
                      key={date}
                      className="flex flex-col items-center py-1.5 rounded-md"
                      style={{
                        background: race ? RACE : isToday ? "#fff" : cycle ? `${cycle.color}2A` : "transparent",
                        border: `1px solid ${!race && isToday ? MUSTARD : "transparent"}`,
                        opacity: inMonth ? 1 : 0.35,
                      }}
                    >
                      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 13, color: race ? "#fff" : INK, fontWeight: 600 }}>
                        {date.slice(8, 10)}
                      </div>
                      <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center" style={{ minHeight: 4 }}>
                        {dayEntries.map(({ entry, status }, si) => (
                          <div
                            key={`e${si}`}
                            style={{
                              width: 8,
                              height: 3,
                              borderRadius: 2,
                              background: entry.isDraft ? "transparent" : STATUS_COLOR[status],
                              border: entry.isDraft ? `1px dashed ${INK_SOFT}` : "none",
                            }}
                          />
                        ))}
                        {unplannedWorkouts.map((w, wi) => (
                          <div key={`w${wi}`} style={{ width: 8, height: 3, borderRadius: 2, background: PLAN_LOGGED }} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </button>

              {isExpanded && (
                <div className="space-y-2 mt-1.5 mb-2">
                  {weekDates.map((date, i) => {
                    const dayEntries = entriesForDate(planEntries, workouts, date);
                    const unplannedWorkouts = unplannedWorkoutsForDate(planEntries, workouts, date);
                    const canAdd = editable && date >= today;
                    const cycle = cycleForDate(cycles, date);
                    const race = raceForDate(races, date);
                    const dayNote = coachNotes.find((n) => n.date === date);
                    return (
                      <div key={date} className="p-2.5 rounded-md" style={{ background: "#fff", border: `1px solid ${LINE}` }}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK, fontWeight: 600 }}>
                            {WEEKDAY_LABELS[i]} {fmtShort(date)}
                          </div>
                          {cycle && (
                            <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: cycle.color ?? INK_SOFT }}>
                              ● {cycle.name}
                            </span>
                          )}
                        </div>

                        {healthByDate?.[date] && <HealthDayStrip entry={healthByDate[date]} />}

                        <DayRaceField date={date} race={race} editable={editable} onSaveRace={onSaveRace} onDeleteRace={onDeleteRace} />

                        {dayEntries.map(({ entry, status, matchedWorkoutId }) => (
                          <PlanEntryCard
                            key={entry.id}
                            entry={entry}
                            status={status}
                            matchedWorkoutId={matchedWorkoutId}
                            editable={editable}
                            knownPlanNotes={knownPlanNotes}
                            onUpdateEntry={onUpdateEntry}
                            onDeleteEntry={onDeleteEntry}
                            onJumpToWorkout={onJumpToWorkout}
                          />
                        ))}

                        {unplannedWorkouts.map((w) => (
                          <UnplannedWorkoutCard key={w.id} workout={w} onJumpToWorkout={onJumpToWorkout} />
                        ))}

                        {dayEntries.length === 0 && unplannedWorkouts.length === 0 && (
                          <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK_SOFT, marginBottom: canAdd ? 6 : 0 }}>
                            Brak planu
                          </div>
                        )}
                        {canAdd && dayEntries.length === 0 && (
                          <button
                            onClick={() => onAddEntry(date)}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                            style={{ fontFamily: FONT_MONO, border: `1px solid ${INK}`, color: INK }}
                          >
                            <Plus size={12} /> Dodaj plan
                          </button>
                        )}
                        {canAdd && dayEntries.length === 1 && (
                          <button
                            onClick={() => onAddSecond(date, dayEntries[0].entry.id)}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                            style={{ fontFamily: FONT_MONO, border: `1px solid ${INK}`, color: INK }}
                          >
                            <Plus size={12} /> Drugi trening (rano / po południu)
                          </button>
                        )}

                        {editable && <DayNoteField date={date} existingNote={dayNote} onSaveNote={onSaveNote} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
        <div className="flex items-center justify-between mb-2">
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, color: INK, fontWeight: 600 }}>CYKLE TRENINGOWE</div>
          {editable && !showCycleForm && (
            <button
              onClick={() => setShowCycleForm(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs"
              style={{ fontFamily: FONT_MONO, border: `1px solid ${INK}`, color: INK }}
            >
              <Plus size={13} /> Dodaj cykl
            </button>
          )}
        </div>

        {editable && showCycleForm && (
          <div className="p-3 rounded-md mb-3" style={{ background: CARD, border: `1px solid ${INK}` }}>
            <Field label="Nazwa">
              <input
                value={cycleDraft.name}
                onChange={(e) => setCycleDraft((c) => ({ ...c, name: e.target.value }))}
                placeholder="np. Mezocykl siła — luty"
                className="w-full px-2 py-1.5 rounded text-sm"
                style={inputStyle}
              />
            </Field>
            <Field label="Typ">
              <div className="flex gap-1.5">
                <Chip
                  active={cycleDraft.type === "mezocykl"}
                  onClick={() => setCycleDraft((c) => ({ ...c, type: "mezocykl" as CycleType }))}
                >
                  Mezocykl
                </Chip>
                <Chip
                  active={cycleDraft.type === "makrocykl"}
                  onClick={() => setCycleDraft((c) => ({ ...c, type: "makrocykl" as CycleType }))}
                >
                  Makrocykl
                </Chip>
              </div>
            </Field>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="date"
                value={cycleDraft.start}
                onChange={(e) => setCycleDraft((c) => ({ ...c, start: e.target.value }))}
                className="px-2 py-1 rounded text-sm"
                style={inputStyle}
              />
              <span style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>—</span>
              <input
                type="date"
                value={cycleDraft.end}
                onChange={(e) => setCycleDraft((c) => ({ ...c, end: e.target.value }))}
                className="px-2 py-1 rounded text-sm"
                style={inputStyle}
              />
            </div>
            <Field label="Kolor w kalendarzu">
              <div className="flex gap-1.5">
                {CYCLE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCycleDraft((d) => ({ ...d, color: c }))}
                    title={c}
                    className="rounded-full"
                    style={{
                      width: 22,
                      height: 22,
                      background: c,
                      border: cycleDraft.color === c ? `2px solid ${INK}` : "2px solid transparent",
                      boxShadow: cycleDraft.color === c ? "0 0 0 1px #fff inset" : "none",
                    }}
                  />
                ))}
              </div>
            </Field>
            {!cycleDraft.createdBy || cycleDraft.createdBy === coachUserId ? (
              <Field label="Notatki (widoczne tylko dla Ciebie)">
                <textarea
                  value={cycleDraft.notes ?? ""}
                  onChange={(e) => setCycleDraft((c) => ({ ...c, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-2 py-1.5 rounded text-sm"
                  style={inputStyle}
                />
              </Field>
            ) : (
              <div className="mb-3 text-xs" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
                Notatki widoczne tylko dla trenera, który utworzył ten cykl.
              </div>
            )}
            <label className="flex items-center gap-1.5 text-xs mb-3" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
              <input
                type="checkbox"
                checked={cycleDraft.visibleToAthlete ?? true}
                onChange={(e) => setCycleDraft((c) => ({ ...c, visibleToAthlete: e.target.checked }))}
              />
              Widoczny dla zawodnika
            </label>
            <div className="flex gap-2">
              <button onClick={saveCycle} className="flex-1 py-2 rounded-md text-sm" style={{ fontFamily: FONT_MONO, background: INK, color: "#fff" }}>
                Zapisz cykl
              </button>
              <button
                onClick={() => setShowCycleForm(false)}
                className="px-4 py-2 rounded-md text-sm"
                style={{ fontFamily: FONT_MONO, border: `1px solid ${LINE}`, color: INK_SOFT }}
              >
                Anuluj
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {cycles.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-2.5 rounded-md" style={{ background: CARD, border: `1px solid ${LINE}` }}>
              <div className="flex items-center gap-2">
                {c.color && <div className="rounded-full shrink-0" style={{ width: 10, height: 10, background: c.color }} />}
                <div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: INK }}>{c.name}</div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT }}>
                    {c.type} · {fmtShort(c.start)} – {fmtShort(c.end)}
                    {editable && (c.visibleToAthlete === false ? " · ukryty dla zawodnika" : " · widoczny dla zawodnika")}
                  </div>
                </div>
              </div>
              {editable && (
                <div className="flex items-center gap-1">
                  <IconBtn
                    onClick={() => {
                      setCycleDraft(() => c);
                      setShowCycleForm(true);
                    }}
                    title="Edytuj"
                  >
                    <Pencil size={14} />
                  </IconBtn>
                  <IconBtn onClick={() => deleteCycle(c.id)} title="Usuń" color={PLAN_MISSED}>
                    <Trash2 size={14} />
                  </IconBtn>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
