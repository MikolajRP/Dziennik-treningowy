"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
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

const startOfMonth = (iso: string) => iso.slice(0, 8) + "01";
const addMonths = (iso: string, n: number) => {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const daysInMonth = (monthStart: string) => {
  const [y, m] = monthStart.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};
const monthLabel = (monthStart: string) => {
  const [y, m] = monthStart.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
};
const getMonthWeeks = (monthStart: string) => {
  const lastOfMonth = monthStart.slice(0, 8) + String(daysInMonth(monthStart)).padStart(2, "0");
  const weeks: string[] = [];
  let cur = startOfWeek(monthStart);
  while (cur <= lastOfMonth) {
    weeks.push(cur);
    cur = addDays(cur, 7);
  }
  return weeks;
};

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
  const [monthStart, setMonthStart] = useState(startOfMonth(today));
  const [expandedWeekStart, setExpandedWeekStart] = useState<string | null>(null);

  return (
    <div>
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
                  const statuses = entriesForDate(planEntries, workouts, date).map((e) => e.status);
                  const isToday = date === today;
                  return (
                    <div
                      key={date}
                      className="flex flex-col items-center py-1.5 rounded-md"
                      style={{
                        background: isToday ? "#fff" : "transparent",
                        border: `1px solid ${isToday ? MUSTARD : "transparent"}`,
                        opacity: inMonth ? 1 : 0.35,
                      }}
                    >
                      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 13, color: INK, fontWeight: 600 }}>
                        {date.slice(8, 10)}
                      </div>
                      <div className="flex gap-0.5 mt-0.5" style={{ minHeight: 4 }}>
                        {statuses.map((s, si) => (
                          <div key={si} style={{ width: 8, height: 3, borderRadius: 2, background: STATUS_COLOR[s] }} />
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
                    const canAdd = editable && date >= today;
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

                        {dayEntries.length === 0 && (
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
