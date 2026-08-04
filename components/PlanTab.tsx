"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { addDays, fmtShort, startOfWeek, todayISO } from "@/lib/calculations";
import { entriesForDate, type PlanEntryStatus } from "@/lib/planCalculations";
import {
  CARD,
  FONT_DISPLAY,
  FONT_MONO,
  INK,
  INK_SOFT,
  LINE,
  MUSTARD,
  PLAN_DONE,
  PLAN_FUTURE,
  PLAN_MISSED,
  inputStyle,
} from "@/lib/design";
import type { Cycle, CycleType, PlanEntry, Workout } from "@/lib/types";
import { Chip, Field, IconBtn } from "./atoms";

const WEEKDAY_LABELS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const SLOT_LABEL: Record<PlanEntry["slot"], string> = { am: "RANO", pm: "PO POŁUDNIU", full: "" };
const STATUS_COLOR: Record<PlanEntryStatus, string> = { planned: PLAN_FUTURE, done: PLAN_DONE, missed: PLAN_MISSED };
const STATUS_LABEL: Record<PlanEntryStatus, string> = { planned: "zaplanowany", done: "wykonany", missed: "niewykonany" };

function PlanEntryCard({
  entry,
  status,
  matchedWorkoutId,
  categories,
  editable,
  onUpdateEntry,
  onDeleteEntry,
  onJumpToWorkout,
}: {
  entry: PlanEntry;
  status: PlanEntryStatus;
  matchedWorkoutId: string | null;
  categories: string[];
  editable: boolean;
  onUpdateEntry: (id: string, patch: { category?: string; notes?: string }) => void;
  onDeleteEntry: (id: string) => void;
  onJumpToWorkout: (workoutId: string) => void;
}) {
  const [notes, setNotes] = useState(entry.notes);
  const color = STATUS_COLOR[status];

  return (
    <div
      className="p-2.5 rounded-md mb-1.5"
      style={{ background: CARD, border: `1px solid ${LINE}`, borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          {SLOT_LABEL[entry.slot] && (
            <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT }}>{SLOT_LABEL[entry.slot]}</span>
          )}
          <span
            className="px-1.5 py-0.5 rounded-full text-[10px]"
            style={{ fontFamily: FONT_MONO, border: `1px solid ${color}`, color }}
          >
            {STATUS_LABEL[status]}
          </span>
        </div>
        {editable && (
          <IconBtn onClick={() => onDeleteEntry(entry.id)} title="Usuń z planu" color={PLAN_MISSED}>
            <Trash2 size={13} />
          </IconBtn>
        )}
      </div>

      {editable ? (
        <select
          value={entry.category}
          onChange={(e) => onUpdateEntry(entry.id, { category: e.target.value })}
          className="w-full px-2 py-1 rounded text-xs mb-1.5"
          style={inputStyle}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      ) : (
        <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK, fontWeight: 600 }}>{entry.category}</div>
      )}

      {editable ? (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== entry.notes && onUpdateEntry(entry.id, { notes })}
          placeholder="np. 6×800m tempo, przerwa 2 min"
          rows={2}
          className="w-full px-2 py-1 rounded text-xs"
          style={inputStyle}
        />
      ) : (
        entry.notes && <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK_SOFT }}>{entry.notes}</div>
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

export function PlanTab({
  planEntries,
  workouts,
  categories,
  cycles,
  editable,
  onAddEntry,
  onAddSecond,
  onUpdateEntry,
  onDeleteEntry,
  onJumpToWorkout,
  showCycleForm,
  setShowCycleForm,
  cycleDraft,
  setCycleDraft,
  saveCycle,
  deleteCycle,
}: {
  planEntries: PlanEntry[];
  workouts: Workout[];
  categories: string[];
  cycles: Cycle[];
  editable: boolean;
  onAddEntry: (date: string) => void;
  onAddSecond: (date: string, firstEntryId: string) => void;
  onUpdateEntry: (id: string, patch: { category?: string; notes?: string }) => void;
  onDeleteEntry: (id: string) => void;
  onJumpToWorkout: (workoutId: string) => void;
  showCycleForm: boolean;
  setShowCycleForm: (v: boolean) => void;
  cycleDraft: Cycle;
  setCycleDraft: (updater: (c: Cycle) => Cycle) => void;
  saveCycle: () => void;
  deleteCycle: (id: string) => void;
}) {
  const today = todayISO();
  const [weekStart, setWeekStart] = useState(startOfWeek(today));
  const [expanded, setExpanded] = useState(false);

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <IconBtn onClick={() => setWeekStart((w) => addDays(w, -7))} title="Poprzedni tydzień">
          <ChevronLeft size={18} />
        </IconBtn>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1.5 px-2 py-1 rounded"
          style={{ fontFamily: FONT_MONO, fontSize: 13, color: INK }}
        >
          {fmtShort(weekStart)} – {fmtShort(addDays(weekStart, 6))}
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        <IconBtn onClick={() => setWeekStart((w) => addDays(w, 7))} title="Następny tydzień">
          <ChevronRight size={18} />
        </IconBtn>
      </div>

      {weekStart !== startOfWeek(today) && (
        <div className="text-center mb-3">
          <button
            onClick={() => setWeekStart(startOfWeek(today))}
            className="text-xs"
            style={{ fontFamily: FONT_MONO, color: INK_SOFT, textDecoration: "underline" }}
          >
            Wróć do bieżącego tygodnia
          </button>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 mb-4">
        {weekDates.map((date, i) => {
          const statuses = entriesForDate(planEntries, workouts, date).map((e) => e.status);
          const isToday = date === today;
          return (
            <button
              key={date}
              onClick={() => setExpanded(true)}
              className="flex flex-col items-center py-2 rounded-md"
              style={{ background: isToday ? "#FBF6EC" : CARD, border: `1px solid ${isToday ? MUSTARD : LINE}` }}
            >
              <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: INK_SOFT }}>{WEEKDAY_LABELS[i]}</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, color: INK, fontWeight: 600 }}>
                {date.slice(8, 10)}
              </div>
              <div className="flex gap-0.5 mt-1" style={{ minHeight: 4 }}>
                {statuses.map((s, si) => (
                  <div key={si} style={{ width: 10, height: 3, borderRadius: 2, background: STATUS_COLOR[s] }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {expanded && (
        <div className="space-y-2 mb-6">
          {weekDates.map((date, i) => {
            const dayEntries = entriesForDate(planEntries, workouts, date);
            return (
              <div key={date} className="p-2.5 rounded-md" style={{ background: "#fff", border: `1px solid ${LINE}` }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK, fontWeight: 600, marginBottom: 6 }}>
                  {WEEKDAY_LABELS[i]} {fmtShort(date)}
                </div>

                {dayEntries.map(({ entry, status, matchedWorkoutId }) => (
                  <PlanEntryCard
                    key={entry.id}
                    entry={entry}
                    status={status}
                    matchedWorkoutId={matchedWorkoutId}
                    categories={categories}
                    editable={editable}
                    onUpdateEntry={onUpdateEntry}
                    onDeleteEntry={onDeleteEntry}
                    onJumpToWorkout={onJumpToWorkout}
                  />
                ))}

                {editable && dayEntries.length === 0 && (
                  <button
                    onClick={() => onAddEntry(date)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                    style={{ fontFamily: FONT_MONO, border: `1px solid ${INK}`, color: INK }}
                  >
                    <Plus size={12} /> Dodaj plan
                  </button>
                )}
                {editable && dayEntries.length === 1 && (
                  <button
                    onClick={() => onAddSecond(date, dayEntries[0].entry.id)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                    style={{ fontFamily: FONT_MONO, border: `1px solid ${INK}`, color: INK }}
                  >
                    <Plus size={12} /> Drugi trening (rano / po południu)
                  </button>
                )}
                {!editable && dayEntries.length === 0 && (
                  <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK_SOFT }}>Brak planu</div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
              <div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: INK }}>{c.name}</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT }}>
                  {c.type} · {fmtShort(c.start)} – {fmtShort(c.end)}
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
