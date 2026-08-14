"use client";

import { useState, type HTMLAttributes, type ReactNode } from "react";
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
import { addDays, todayISO } from "@/lib/calculations";
import { entriesForDate, raceForDate } from "@/lib/planCalculations";
import { datesWithActivity, eventsForDate, plannerWeekStrip } from "@/lib/plannerCalculations";
import { CARD, EVENT_COLORS, FONT_DISPLAY, FONT_MONO, INK, INK_SOFT, LINE, MUSTARD, PLANNER, RACE, RUST, inputStyle } from "@/lib/design";
import type { PersonalEvent, PlanEntry, Race, Workout } from "@/lib/types";
import { STATUS_COLOR, STATUS_LABEL } from "./PlanTab";
import { IconBtn } from "./atoms";

const WEEKDAY_LABELS_SHORT = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

export interface EventDraft {
  time: string; // "" = untimed
  title: string;
  color: string;
  notes: string;
}

// `date` and `done` aren't part of the draft: date is always the currently
// selected Planner day (an edit only ever targets that day's own events),
// and done only ever changes via the row's own checkbox, never the form.
export const emptyEventDraft = (): EventDraft => ({
  time: "",
  title: "",
  color: EVENT_COLORS[0].value,
  notes: "",
});

function weekdayIndex(date: string): number {
  const d = new Date(date + "T00:00:00");
  return (d.getDay() + 6) % 7;
}

function WeekStrip({
  selectedDate,
  setSelectedDate,
  activeDates,
}: {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  activeDates: Set<string>;
}) {
  const strip = plannerWeekStrip(selectedDate);
  const today = todayISO();
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <IconBtn onClick={() => setSelectedDate(addDays(selectedDate, -7))} title="Poprzedni tydzień">
        <ChevronLeft size={16} />
      </IconBtn>
      <div className="flex-1 grid grid-cols-7 gap-1">
        {strip.map((date) => {
          const isSelected = date === selectedDate;
          const isToday = date === today;
          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className="flex flex-col items-center py-1.5 rounded-md"
              style={{
                background: isSelected ? PLANNER : "transparent",
                border: `1px solid ${isSelected ? PLANNER : isToday ? MUSTARD : "transparent"}`,
              }}
            >
              <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: isSelected ? "#fff" : INK_SOFT }}>
                {WEEKDAY_LABELS_SHORT[weekdayIndex(date)]}
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 600, color: isSelected ? "#fff" : INK }}>
                {date.slice(8, 10)}
              </div>
              <div
                className="rounded-full mt-0.5"
                style={{
                  width: 4,
                  height: 4,
                  background: activeDates.has(date) ? (isSelected ? "#fff" : PLANNER) : "transparent",
                }}
              />
            </button>
          );
        })}
      </div>
      <IconBtn onClick={() => setSelectedDate(addDays(selectedDate, 7))} title="Następny tydzień">
        <ChevronRight size={16} />
      </IconBtn>
    </div>
  );
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

// Shared fields for both quick-add (mode="new") and editing an existing
// event in place (mode="edit") — notes are tucked behind a toggle so the
// common case (just a title, maybe a time) stays a single compact row.
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
      <div className="flex items-center gap-2 mb-2">
        <input
          type="time"
          value={draft.time}
          onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value }))}
          className="px-2 py-1 rounded text-xs"
          style={inputStyle}
        />
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

function EventRow({
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
      <button onClick={onToggleDone} className="shrink-0 rounded flex items-center justify-center" style={{ width: 18, height: 18, border: `1.5px solid ${event.done ? event.color : INK_SOFT}`, background: event.done ? event.color : "transparent" }}>
        {event.done && <Check size={12} color="#fff" />}
      </button>
      {event.time && (
        <div className="shrink-0" style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK_SOFT, width: 36 }}>
          {event.time}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 13,
            color: event.done ? INK_SOFT : INK,
            textDecoration: event.done ? "line-through" : "none",
          }}
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

function SortableEventRow({ id, children }: { id: string; children: (dragHandleProps: HTMLAttributes<HTMLDivElement>) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners } as HTMLAttributes<HTMLDivElement>)}
    </div>
  );
}

export function PlannerTab({
  personalEvents,
  planEntries,
  workouts,
  races,
  selectedDate,
  setSelectedDate,
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
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  editingId: string | null;
  draft: EventDraft;
  setDraft: (updater: (d: EventDraft) => EventDraft) => void;
  showAddForm: boolean;
  setShowAddForm: (v: boolean) => void;
  startEdit: (event: PersonalEvent) => void;
  cancelForm: () => void;
  saveEvent: () => void;
  deleteEvent: (id: string) => void;
  toggleDone: (event: PersonalEvent) => void;
  reorderEvents: (activeId: string, overId: string) => void;
  onJumpToWorkout: (workoutId: string) => void;
  error: string | null;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) reorderEvents(String(active.id), String(over.id));
  }

  const activeDates = datesWithActivity(personalEvents, planEntries, races);
  const dayPlanEntries = entriesForDate(planEntries, workouts, selectedDate);
  const race = raceForDate(races, selectedDate);
  const dayEvents = eventsForDate(personalEvents, selectedDate);
  const timedEvents = dayEvents.filter((e) => e.time);
  const untimedEvents = dayEvents.filter((e) => !e.time);
  const today = todayISO();

  const dateLabel = new Date(selectedDate + "T00:00:00")
    .toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div>
      <WeekStrip selectedDate={selectedDate} setSelectedDate={setSelectedDate} activeDates={activeDates} />

      <div className="flex items-center justify-between mb-4">
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: INK, fontWeight: 600, textTransform: "capitalize" }}>
          {dateLabel}
        </div>
        <div className="flex items-center gap-2">
          {selectedDate !== today && (
            <button onClick={() => setSelectedDate(today)} className="text-xs" style={{ fontFamily: FONT_MONO, color: PLANNER, textDecoration: "underline" }}>
              Dziś
            </button>
          )}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="px-1.5 py-1 rounded text-xs"
            style={inputStyle}
          />
        </div>
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
        <div className="mb-4">
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
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px]"
                  style={{ fontFamily: FONT_MONO, border: `1px solid ${STATUS_COLOR[status]}`, color: STATUS_COLOR[status] }}
                >
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
                <button
                  onClick={() => onJumpToWorkout(matchedWorkoutId)}
                  className="text-xs mt-1"
                  style={{ fontFamily: FONT_MONO, color: STATUS_COLOR[status], textDecoration: "underline" }}
                >
                  Zobacz w dzienniku →
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="text-[11px] uppercase tracking-wide mb-1.5" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
        Twoje wydarzenia
      </div>

      {editingId === null && showAddForm && (
        <EventForm draft={draft} setDraft={setDraft} onSave={saveEvent} onCancel={cancelForm} saveLabel="Dodaj" />
      )}
      {editingId === null && !showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-xs mb-2"
          style={{ fontFamily: FONT_MONO, border: `1px dashed ${PLANNER}`, color: PLANNER }}
        >
          <Plus size={14} /> Dodaj wydarzenie
        </button>
      )}

      {timedEvents.map((event) =>
        editingId === event.id ? (
          <EventForm key={event.id} draft={draft} setDraft={setDraft} onSave={saveEvent} onCancel={cancelForm} saveLabel="Zapisz" />
        ) : (
          <EventRow
            key={event.id}
            event={event}
            onToggleDone={() => toggleDone(event)}
            onEdit={() => startEdit(event)}
            onDelete={() => deleteEvent(event.id)}
          />
        )
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={untimedEvents.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          {untimedEvents.map((event) =>
            editingId === event.id ? (
              <EventForm key={event.id} draft={draft} setDraft={setDraft} onSave={saveEvent} onCancel={cancelForm} saveLabel="Zapisz" />
            ) : (
              <SortableEventRow key={event.id} id={event.id}>
                {(dragHandleProps) => (
                  <EventRow
                    event={event}
                    dragHandleProps={untimedEvents.length >= 2 ? dragHandleProps : undefined}
                    onToggleDone={() => toggleDone(event)}
                    onEdit={() => startEdit(event)}
                    onDelete={() => deleteEvent(event.id)}
                  />
                )}
              </SortableEventRow>
            )
          )}
        </SortableContext>
      </DndContext>

      {dayPlanEntries.length === 0 && !race && dayEvents.length === 0 && !showAddForm && (
        <div className="text-center py-6" style={{ fontFamily: FONT_MONO, color: INK_SOFT, fontSize: 13 }}>
          Brak planów na ten dzień.
        </div>
      )}
    </div>
  );
}
