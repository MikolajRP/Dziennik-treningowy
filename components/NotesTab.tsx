"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fmtDate, todayISO } from "@/lib/calculations";
import { CARD, FONT_DISPLAY, FONT_MONO, INK, INK_SOFT, LINE, PLAN_MISSED, inputStyle } from "@/lib/design";
import type { CoachNote } from "@/lib/types";
import { IconBtn } from "./atoms";

function NoteRow({
  note,
  onSave,
  onDelete,
}: {
  note: CoachNote;
  onSave: (date: string, text: string, existingId?: string) => void;
  onDelete: (id: string) => void;
}) {
  const [text, setText] = useState(note.text);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="p-2.5 rounded-md mb-1.5" style={{ background: CARD, border: `1px solid ${LINE}` }}>
      <div className="flex items-center justify-between mb-1.5">
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: INK_SOFT, fontWeight: 600 }}>{fmtDate(note.date)}</div>
        {confirmDelete ? (
          <button
            onClick={() => onDelete(note.id)}
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ fontFamily: FONT_MONO, background: PLAN_MISSED, color: "#fff" }}
          >
            Na pewno usunąć?
          </button>
        ) : (
          <IconBtn onClick={() => setConfirmDelete(true)} title="Usuń" color={PLAN_MISSED}>
            <Trash2 size={13} />
          </IconBtn>
        )}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== note.text && onSave(note.date, text, note.id)}
        rows={2}
        className="w-full px-2 py-1 rounded text-xs"
        style={inputStyle}
      />
    </div>
  );
}

export function NotesTab({
  notes,
  onSaveNote,
  onDeleteNote,
}: {
  notes: CoachNote[];
  onSaveNote: (date: string, text: string, existingId?: string) => void;
  onDeleteNote: (id: string) => void;
}) {
  const [newDate, setNewDate] = useState(todayISO());
  const [newText, setNewText] = useState("");
  const existingForNewDate = notes.find((n) => n.date === newDate);

  function addNote() {
    if (!newText.trim()) return;
    onSaveNote(newDate, newText.trim(), existingForNewDate?.id);
    setNewText("");
  }

  return (
    <div>
      <div className="p-3 rounded-md mb-4" style={{ background: CARD, border: `1px solid ${INK}` }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, color: INK, fontWeight: 600, marginBottom: 8 }}>
          NOWA NOTATKA
        </div>
        <div className="mb-2">
          <input
            type="date"
            value={newDate}
            onChange={(e) => {
              const d = e.target.value;
              setNewDate(d);
              setNewText(notes.find((n) => n.date === d)?.text ?? "");
            }}
            className="px-2 py-1 rounded text-sm"
            style={inputStyle}
          />
        </div>
        {existingForNewDate && (
          <div className="text-xs mb-2" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
            Na ten dzień jest już notatka — zapis nadpisze jej treść.
          </div>
        )}
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Prywatna notatka, widoczna tylko dla Ciebie…"
          rows={3}
          className="w-full px-2 py-1.5 rounded text-sm mb-2"
          style={inputStyle}
        />
        <button
          onClick={addNote}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm"
          style={{ fontFamily: FONT_MONO, background: INK, color: "#fff" }}
        >
          <Plus size={14} /> Zapisz notatkę
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-10" style={{ fontFamily: FONT_MONO, color: INK_SOFT, fontSize: 13 }}>
          Brak notatek.
        </div>
      ) : (
        notes.map((n) => <NoteRow key={n.id} note={n} onSave={onSaveNote} onDelete={onDeleteNote} />)
      )}
    </div>
  );
}
