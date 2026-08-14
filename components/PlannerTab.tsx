"use client";

import { useEffect, useMemo, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, Flag, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { addDays, addMonths, getMonthWeeks, monthLabel, startOfMonth, todayISO } from "@/lib/calculations";
import { entriesForDate, raceForDate } from "@/lib/planCalculations";
import {
  datesWithActivity,
  layoutTimedEvents,
  timeToMinutes,
  timedEventsForDate,
  untimedEventsForDate,
  weekDatesFor,
} from "@/lib/plannerCalculations";
import { CARD, EVENT_COLORS, FONT_DISPLAY, FONT_MONO, INK, INK_SOFT, LINE, MUSTARD, PLANNER, RACE, RUST, inputStyle } from "@/lib/design";
import type { PersonalEvent, PlanEntry, Race, Workout } from "@/lib/types";
import { STATUS_COLOR, STATUS_LABEL } from "./PlanTab";
import { IconBtn } from "./atoms";

const WEEKDAY_LABELS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const ROW_HEIGHT = 52; // px per hour on the ruled-paper day grid
const GRID_HOURS = 24;
const SUNDAY_TEXT = "#C97A72"; // very subtle red, distinctly softer than RACE

// Standard-calendar weekend tinting: Saturday gray, Sunday a soft red.
// `fallback` is the color a weekday (or a race/selected override) gets.
function weekdayTextColor(date: string, fallback: string): string {
  const idx = weekdayIndex(date);
  if (idx === 6) return SUNDAY_TEXT;
  if (idx === 5) return INK_SOFT;
  return fallback;
}

export interface EventDraft {
  time: string; // "" = untimed task
  endTime: string;
  title: string;
  color: string;
  notes: string;
}

export const emptyEventDraft = (): EventDraft => ({
  time: "",
  endTime: "",
  title: "",
  color: EVENT_COLORS[0].value,
  notes: "",
});

function weekdayIndex(date: string): number {
  const d = new Date(date + "T00:00:00");
  return (d.getDay() + 6) % 7;
}
function clampMinutesToTime(mins: number): string {
  const clamped = Math.max(0, Math.min(mins, 23 * 60 + 59));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {EVENT_COLORS.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onChange(c.value)}
          title={c.label}
          className="rounded-full shrink-0"
          style={{
            width: 18,
            height: 18,
            background: c.value,
            border: value === c.value ? `2px solid ${INK}` : "2px solid transparent",
            boxShadow: value === c.value ? "0 0 0 1px #fff inset" : "none",
          }}
        />
      ))}
    </div>
  );
}

// Shared form for both adding and editing an event. Leaving the start time
// blank keeps it an untimed task (checklist); setting one turns it into a
// time-blocked calendar event — the end time auto-fills to +1h so the
// common case is a single tap, but stays editable.
function EventForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  saveLabel,
}: {
  draft: EventDraft;
  setDraft: (updater: (d: EventDraft) => EventDraft) => void;
  onSave: () => void;
  onCancel?: () => void;
  saveLabel: string;
}) {
  const [notesOpen, setNotesOpen] = useState(!!draft.notes);

  function onStartTimeChange(v: string) {
    setDraft((d) => {
      if (!v) return { ...d, time: "", endTime: "" };
      if (!d.endTime) return { ...d, time: v, endTime: clampMinutesToTime(timeToMinutes(v) + 60) };
      return { ...d, time: v };
    });
  }

  return (
    <div className="p-2.5 rounded-md mb-2" style={{ background: CARD, border: `1px solid ${PLANNER}` }}>
      <input
        autoFocus
        value={draft.title}
        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        onKeyDown={(e) => e.key === "Enter" && draft.title.trim() && onSave()}
        placeholder="Nazwa wydarzenia…"
        className="w-full px-2 py-1.5 rounded text-sm mb-2"
        style={inputStyle}
      />
      <div className="flex items-center flex-wrap gap-2 mb-2">
        <input
          type="time"
          value={draft.time}
          onChange={(e) => onStartTimeChange(e.target.value)}
          className="px-2 py-1 rounded text-xs"
          style={inputStyle}
        />
        {draft.time && (
          <>
            <span style={{ fontFamily: FONT_MONO, color: INK_SOFT, fontSize: 12 }}>–</span>
            <input
              type="time"
              value={draft.endTime}
              onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))}
              className="px-2 py-1 rounded text-xs"
              style={inputStyle}
            />
          </>
        )}
        <ColorPicker value={draft.color} onChange={(v) => setDraft((d) => ({ ...d, color: v }))} />
        {!notesOpen && (
          <button
            onClick={() => setNotesOpen(true)}
            className="text-xs ml-auto"
            style={{ fontFamily: FONT_MONO, color: INK_SOFT, textDecoration: "underline" }}
          >
            + notatka
          </button>
        )}
      </div>
      {notesOpen && (
        <textarea
          value={draft.notes}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          placeholder="Notatka (opcjonalnie)…"
          rows={2}
          className="w-full px-2 py-1.5 rounded text-xs mb-2"
          style={inputStyle}
        />
      )}
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={!draft.title.trim()}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs"
          style={{ fontFamily: FONT_MONO, background: PLANNER, color: "#fff", opacity: draft.title.trim() ? 1 : 0.5 }}
        >
          <Check size={13} /> {saveLabel}
        </button>
        {onCancel && (
          <button onClick={onCancel} className="px-3 py-1.5 rounded-md text-xs" style={{ fontFamily: FONT_MONO, border: `1px solid ${LINE}`, color: INK_SOFT }}>
            Anuluj
          </button>
        )}
      </div>
    </div>
  );
}

function TaskRow({
  event,
  dragHandleProps,
  onToggleDone,
  onEdit,
  onDelete,
}: {
  event: PersonalEvent;
  dragHandleProps?: HTMLAttributes<HTMLDivElement>;
  onToggleDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 p-2 rounded-md mb-1.5"
      style={{ background: CARD, border: `1px solid ${LINE}`, borderLeft: `3px solid ${event.color}` }}
    >
      {dragHandleProps && (
        <div {...dragHandleProps} className="shrink-0" style={{ cursor: "grab", touchAction: "none" }} title="Przytrzymaj, żeby zmienić kolejność">
          <GripVertical size={14} color={INK_SOFT} />
        </div>
      )}
      <button
        onClick={onToggleDone}
        className="shrink-0 rounded flex items-center justify-center"
        style={{ width: 18, height: 18, border: `1.5px solid ${event.done ? event.color : INK_SOFT}`, background: event.done ? event.color : "transparent" }}
      >
        {event.done && <Check size={12} color="#fff" />}
      </button>
      <div className="flex-1 min-w-0">
        <div
          style={{ fontFamily: FONT_MONO, fontSize: 13, color: event.done ? INK_SOFT : INK, textDecoration: event.done ? "line-through" : "none" }}
          className="truncate"
        >
          {event.title}
        </div>
        {event.notes && (
          <div className="truncate" style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK_SOFT }}>
            {event.notes}
          </div>
        )}
      </div>
      <IconBtn onClick={onEdit} title="Edytuj">
        <Pencil size={13} />
      </IconBtn>
      <IconBtn onClick={onDelete} title="Usuń" color={RUST}>
        <Trash2 size={13} />
      </IconBtn>
    </div>
  );
}

function SortableTaskRow({ id, children }: { id: string; children: (dragHandleProps: HTMLAttributes<HTMLDivElement>) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners } as HTMLAttributes<HTMLDivElement>)}
    </div>
  );
}

// The "kartka w linie" — a single day's hours, ruled like notebook paper,
// with timed events positioned as blocks (side-by-side when they overlap)
// and a live red line marking the current time when this is today.
function DayHourGrid({
  date,
  events,
  onEditEvent,
}: {
  date: string;
  events: PersonalEvent[];
  onEditEvent: (event: PersonalEvent) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const isToday = date === todayISO();

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const nowMinutes = useMemo(() => {
    const d = new Date(nowTick);
    return d.getHours() * 60 + d.getMinutes();
  }, [nowTick]);

  useEffect(() => {
    const target = isToday ? Math.max(0, nowMinutes - 60) : 7 * 60;
    scrollRef.current?.scrollTo({ top: (target / 60) * ROW_HEIGHT });
    // Re-run when the viewed day changes (isToday/nowMinutes intentionally
    // excluded — this should only jump on navigation, not every tick).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const layout = useMemo(() => layoutTimedEvents(events), [events]);

  return (
    <div
      ref={scrollRef}
      className="rounded-md overflow-y-auto"
      style={{ height: 420, background: "#fff", border: `1px solid ${LINE}` }}
    >
      <div className="flex" style={{ height: GRID_HOURS * ROW_HEIGHT }}>
        <div className="relative shrink-0" style={{ width: 40 }}>
          {Array.from({ length: GRID_HOURS }, (_, h) => (
            <div
              key={h}
              className="absolute right-1 text-right"
              style={{ top: h * ROW_HEIGHT - 6, fontFamily: FONT_MONO, fontSize: 9, color: INK_SOFT }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        <div
          className="relative flex-1"
          style={{
            backgroundImage: `repeating-linear-gradient(to bottom, ${LINE} 0, ${LINE} 1px, transparent 1px, transparent ${ROW_HEIGHT}px)`,
          }}
        >
          {layout.map(({ event, col, cols }) => {
            const top = (timeToMinutes(event.time!) / 60) * ROW_HEIGHT;
            const durationMin = event.endTime ? timeToMinutes(event.endTime) - timeToMinutes(event.time!) : 60;
            const height = Math.max(22, (Math.max(durationMin, 15) / 60) * ROW_HEIGHT);
            const widthPct = 100 / cols;
            return (
              <button
                key={event.id}
                onClick={() => onEditEvent(event)}
                className="absolute rounded text-left px-1.5 py-0.5 overflow-hidden"
                style={{
                  top,
                  height,
                  left: `calc(${widthPct * col}% + 2px)`,
                  width: `calc(${widthPct}% - 4px)`,
                  background: `${event.color}26`,
                  borderLeft: `3px solid ${event.color}`,
                }}
              >
                <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: INK, fontWeight: 600, lineHeight: 1.15 }} className="truncate">
                  {event.title}
                </div>
                {height >= 34 && (
                  <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: INK_SOFT }}>
                    {event.time}–{event.endTime ?? clampMinutesToTime(timeToMinutes(event.time!) + 60)}
                  </div>
                )}
              </button>
            );
          })}
          {isToday && (
            <div className="absolute left-0 right-0 flex items-center" style={{ top: (nowMinutes / 60) * ROW_HEIGHT }}>
              <div className="rounded-full shrink-0" style={{ width: 7, height: 7, background: RACE, marginLeft: -3.5 }} />
              <div className="flex-1" style={{ height: 1.5, background: RACE }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PlannerTab({
  personalEvents,
  planEntries,
  workouts,
  races,
  editingId,
  draft,
  setDraft,
  showAddForm,
  setShowAddForm,
  startEdit,
  cancelForm,
  saveEvent,
  deleteEvent,
  toggleDone,
  reorderEvents,
  onJumpToWorkout,
  error,
}: {
  personalEvents: PersonalEvent[];
  planEntries: PlanEntry[];
  workouts: Workout[];
  races: Race[];
  editingId: string | null;
  draft: EventDraft;
  setDraft: (updater: (d: EventDraft) => EventDraft) => void;
  showAddForm: boolean;
  setShowAddForm: (v: boolean) => void;
  startEdit: (event: PersonalEvent) => void;
  cancelForm: () => void;
  saveEvent: (date: string) => void;
  deleteEvent: (id: string) => void;
  toggleDone: (event: PersonalEvent) => void;
  reorderEvents: (activeId: string, overId: string) => void;
  onJumpToWorkout: (workoutId: string) => void;
  error: string | null;
}) {
  const today = todayISO();
  const [view, setView] = useState<"month" | "week">("month");
  const [monthStart, setMonthStart] = useState(startOfMonth(today));
  const [focusedDate, setFocusedDate] = useState(today);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) reorderEvents(String(active.id), String(over.id));
  }

  const activeDates = useMemo(() => datesWithActivity(personalEvents, planEntries, races), [personalEvents, planEntries, races]);
  const editingEvent = editingId ? personalEvents.find((e) => e.id === editingId) : undefined;

  function openDay(date: string) {
    setFocusedDate(date);
    setView("week");
    cancelForm();
  }
  function backToMonth() {
    setMonthStart(startOfMonth(focusedDate));
    setView("month");
    cancelForm();
  }
  function selectFocusedDate(date: string) {
    setFocusedDate(date);
    cancelForm();
  }

  if (view === "month") {
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
          {WEEKDAY_LABELS.map((l, i) => (
            <div
              key={l}
              className="text-center"
              style={{ fontFamily: FONT_MONO, fontSize: 9, color: i === 6 ? SUNDAY_TEXT : INK_SOFT }}
            >
              {l}
            </div>
          ))}
        </div>

        {getMonthWeeks(monthStart).map((weekStart) => (
          <div key={weekStart} className="grid grid-cols-7 gap-1 mb-1">
            {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((date) => {
              const inMonth = date.slice(0, 7) === monthStart.slice(0, 7);
              const isToday = date === today;
              const race = raceForDate(races, date);
              const dayPlanEntries = entriesForDate(planEntries, workouts, date);
              const dayPersonalEvents = personalEvents.filter((e) => e.date === date).slice(0, 4);
              return (
                <button
                  key={date}
                  onClick={() => openDay(date)}
                  className="flex flex-col items-center py-1.5 rounded-md"
                  style={{
                    background: race ? RACE : isToday ? "#fff" : "transparent",
                    border: `1px solid ${!race && isToday ? MUSTARD : "transparent"}`,
                    opacity: inMonth ? 1 : 0.35,
                  }}
                >
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 13, color: race ? "#fff" : weekdayTextColor(date, INK), fontWeight: 600 }}>
                    {date.slice(8, 10)}
                  </div>
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center" style={{ minHeight: 5 }}>
                    {dayPlanEntries.map(({ status }, i) => (
                      <div key={`p${i}`} style={{ width: 7, height: 3, borderRadius: 2, background: STATUS_COLOR[status] }} />
                    ))}
                    {dayPersonalEvents.map((e) => (
                      <div key={e.id} className="rounded-full" style={{ width: 4, height: 4, background: e.color }} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  // ---------- week/day detail view ----------
  const weekDates = weekDatesFor(focusedDate);
  const race = raceForDate(races, focusedDate);
  const dayPlanEntries = entriesForDate(planEntries, workouts, focusedDate);
  const timedEvents = timedEventsForDate(personalEvents, focusedDate);
  const untimedEvents = untimedEventsForDate(personalEvents, focusedDate);
  const dateLabel = new Date(focusedDate + "T00:00:00").toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div>
      <button
        onClick={backToMonth}
        className="flex items-center gap-1 text-xs mb-3"
        style={{ fontFamily: FONT_MONO, color: INK_SOFT }}
      >
        <ChevronLeft size={14} /> Miesiąc
      </button>

      <div className="flex items-center gap-1.5 mb-3">
        <IconBtn onClick={() => selectFocusedDate(addDays(focusedDate, -7))} title="Poprzedni tydzień">
          <ChevronLeft size={16} />
        </IconBtn>
        <div className="flex-1 grid grid-cols-7 gap-1">
          {weekDates.map((date) => {
            const isSelected = date === focusedDate;
            const isToday = date === today;
            return (
              <button
                key={date}
                onClick={() => selectFocusedDate(date)}
                className="flex flex-col items-center py-1.5 rounded-md"
                style={{
                  background: isSelected ? PLANNER : "transparent",
                  border: `1px solid ${isSelected ? PLANNER : isToday ? MUSTARD : "transparent"}`,
                }}
              >
                <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: isSelected ? "#fff" : weekdayTextColor(date, INK_SOFT) }}>
                  {WEEKDAY_LABELS[weekdayIndex(date)]}
                </div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 600, color: isSelected ? "#fff" : weekdayTextColor(date, INK) }}>
                  {date.slice(8, 10)}
                </div>
                <div
                  className="rounded-full mt-0.5"
                  style={{ width: 4, height: 4, background: activeDates.has(date) ? (isSelected ? "#fff" : PLANNER) : "transparent" }}
                />
              </button>
            );
          })}
        </div>
        <IconBtn onClick={() => selectFocusedDate(addDays(focusedDate, 7))} title="Następny tydzień">
          <ChevronRight size={16} />
        </IconBtn>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, color: INK, fontWeight: 600, textTransform: "capitalize" }}>
          {dateLabel}
        </div>
        {focusedDate !== today && (
          <button onClick={() => selectFocusedDate(today)} className="text-xs" style={{ fontFamily: FONT_MONO, color: PLANNER, textDecoration: "underline" }}>
            Dziś
          </button>
        )}
      </div>

      {error && (
        <div className="text-xs mb-3 px-2 py-1.5 rounded" style={{ fontFamily: FONT_MONO, background: "#FBEAE7", color: RUST, border: `1px solid ${RUST}` }}>
          {error}
        </div>
      )}

      {race && (
        <div className="mb-3 px-2.5 py-2 rounded-md flex items-center gap-1.5" style={{ background: RACE }}>
          <Flag size={14} color="#fff" />
          <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, color: "#fff" }}>{race.name}</span>
        </div>
      )}

      {dayPlanEntries.length > 0 && (
        <div className="mb-3">
          <div className="text-[11px] uppercase tracking-wide mb-1.5" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
            Zaplanowane przez trenera
          </div>
          {dayPlanEntries.map(({ entry, status, matchedWorkoutId }) => (
            <div
              key={entry.id}
              className="p-2.5 rounded-md mb-1.5"
              style={{ background: CARD, border: `1px solid ${LINE}`, borderLeft: `3px solid ${STATUS_COLOR[status]}` }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ fontFamily: FONT_MONO, border: `1px solid ${STATUS_COLOR[status]}`, color: STATUS_COLOR[status] }}>
                  {STATUS_LABEL[status]}
                </span>
              </div>
              {(entry.category || entry.notes) && (
                <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK }}>
                  {entry.category && <span className="font-semibold">{entry.category}</span>}
                  {entry.category && entry.notes && " — "}
                  {entry.notes}
                </div>
              )}
              {status === "done" && matchedWorkoutId && (
                <button onClick={() => onJumpToWorkout(matchedWorkoutId)} className="text-xs mt-1" style={{ fontFamily: FONT_MONO, color: STATUS_COLOR[status], textDecoration: "underline" }}>
                  Zobacz w dzienniku →
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="text-[11px] uppercase tracking-wide mb-1.5" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
        Zadania
      </div>

      {editingId === null && showAddForm && (
        <EventForm draft={draft} setDraft={setDraft} onSave={() => saveEvent(focusedDate)} onCancel={cancelForm} saveLabel="Dodaj" />
      )}
      {editingId === null && !showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-xs mb-2"
          style={{ fontFamily: FONT_MONO, border: `1px dashed ${PLANNER}`, color: PLANNER }}
        >
          <Plus size={14} /> Dodaj wydarzenie lub zadanie
        </button>
      )}
      {editingEvent && !editingEvent.time && (
        <EventForm draft={draft} setDraft={setDraft} onSave={() => saveEvent(focusedDate)} onCancel={cancelForm} saveLabel="Zapisz" />
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={untimedEvents.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          {untimedEvents.map((event) =>
            editingId === event.id ? null : (
              <SortableTaskRow key={event.id} id={event.id}>
                {(dragHandleProps) => (
                  <TaskRow
                    event={event}
                    dragHandleProps={untimedEvents.length >= 2 ? dragHandleProps : undefined}
                    onToggleDone={() => toggleDone(event)}
                    onEdit={() => startEdit(event)}
                    onDelete={() => deleteEvent(event.id)}
                  />
                )}
              </SortableTaskRow>
            )
          )}
        </SortableContext>
      </DndContext>

      {editingEvent && editingEvent.time && (
        <EventForm draft={draft} setDraft={setDraft} onSave={() => saveEvent(focusedDate)} onCancel={cancelForm} saveLabel="Zapisz" />
      )}

      <div className="text-[11px] uppercase tracking-wide mb-1.5 mt-3" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
        Plan godzinowy
      </div>
      <DayHourGrid date={focusedDate} events={timedEvents} onEditEvent={startEdit} />
    </div>
  );
}
