"use client";

import { useRef, useState } from "react";
import { GripHorizontal, Plus, X } from "lucide-react";
import { todayISO } from "@/lib/calculations";
import { CARD, FONT_DISPLAY, FONT_MONO, INK, INK_SOFT, LINE, inputStyle } from "@/lib/design";
import type { CoachNote } from "@/lib/types";

const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 320;
const MIN_WIDTH = 240;
const MIN_HEIGHT = 220;

export function FloatingNoteWidget({
  open,
  onClose,
  notes,
  onSaveNote,
}: {
  open: boolean;
  onClose: () => void;
  notes: CoachNote[];
  onSaveNote: (date: string, text: string, existingId?: string) => void;
}) {
  const [pos, setPos] = useState({ x: 16, y: 88 });
  const [size, setSize] = useState({ w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT });
  const [date, setDate] = useState(todayISO());
  const [text, setText] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const existingForDate = notes.find((n) => n.date === date);

  function startDrag(e: React.PointerEvent) {
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = pos.x;
    const origY = pos.y;
    function onMove(ev: PointerEvent) {
      const maxX = window.innerWidth - 60;
      const maxY = window.innerHeight - 40;
      setPos({
        x: Math.min(Math.max(0, origX + (ev.clientX - startX)), maxX),
        y: Math.min(Math.max(0, origY + (ev.clientY - startY)), maxY),
      });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startResize(e: React.PointerEvent) {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const origW = size.w;
    const origH = size.h;
    function onMove(ev: PointerEvent) {
      setSize({
        w: Math.max(MIN_WIDTH, origW + (ev.clientX - startX)),
        h: Math.max(MIN_HEIGHT, origH + (ev.clientY - startY)),
      });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handleDateChange(d: string) {
    setDate(d);
    setText(notes.find((n) => n.date === d)?.text ?? "");
  }

  function save() {
    if (!text.trim()) return;
    onSaveNote(date, text.trim(), existingForDate?.id);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  }

  if (!open) return null;

  return (
    <div
      ref={boxRef}
      className="fixed rounded-md flex flex-col overflow-hidden"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        background: CARD,
        border: `1.5px solid ${INK}`,
        boxShadow: "0 8px 24px rgba(27,42,58,0.25)",
        zIndex: 60,
      }}
    >
      <div
        onPointerDown={startDrag}
        className="flex items-center justify-between px-2.5 py-2 shrink-0"
        style={{ background: INK, cursor: "move", touchAction: "none" }}
      >
        <div className="flex items-center gap-1.5" style={{ fontFamily: FONT_DISPLAY, fontSize: 12, color: "#fff", fontWeight: 600 }}>
          <GripHorizontal size={14} /> NOTATKA
        </div>
        <button onClick={onClose} title="Zamknij">
          <X size={16} color="#fff" />
        </button>
      </div>

      <div className="p-2.5 flex-1 flex flex-col min-h-0">
        <input
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className="px-2 py-1 rounded text-xs mb-1.5 shrink-0"
          style={inputStyle}
        />
        {existingForDate && (
          <div className="text-[10px] mb-1.5 shrink-0" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
            Na ten dzień jest już notatka — zapis nadpisze jej treść.
          </div>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Prywatna notatka…"
          className="w-full px-2 py-1.5 rounded text-xs flex-1 resize-none"
          style={inputStyle}
        />
        <button
          onClick={save}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs mt-1.5 shrink-0"
          style={{ fontFamily: FONT_MONO, background: savedFlash ? "#2F7D52" : INK, color: "#fff" }}
        >
          <Plus size={13} /> {savedFlash ? "Zapisano" : "Zapisz notatkę"}
        </button>
      </div>

      <div
        onPointerDown={startResize}
        className="absolute"
        style={{
          right: 0,
          bottom: 0,
          width: 16,
          height: 16,
          cursor: "nwse-resize",
          touchAction: "none",
          borderTop: `1px solid ${LINE}`,
          borderLeft: `1px solid ${LINE}`,
        }}
      />
    </div>
  );
}
