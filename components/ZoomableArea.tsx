"use client";

import { useRef, useState, type ReactNode } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { CARD, FONT_MONO, INK, INK_SOFT, LINE } from "@/lib/design";

const MIN_SCALE = 0.35;
const MAX_SCALE = 3.5;

// A self-contained pinch-to-zoom + drag-to-pan viewport, independent of the
// browser's own pinch-zoom (disabled app-wide via the viewport meta tag in
// app/layout.tsx). Panning replaces native scrolling inside this box at
// every zoom level, so it behaves like a small map/photo viewer rather than
// a scrollable list. `fullBleed` breaks the box out of the page's standard
// px-4 side padding so it spans the full viewport width — only safe to set
// when the caller is itself wrapped in that same px-4 container.
export function ZoomableArea({
  children,
  height = 440,
  fullBleed = false,
}: {
  children: ReactNode;
  height?: number;
  fullBleed?: boolean;
}) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{ startDist: number; startScale: number } | null>(null);
  const drag = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  function clampScale(s: number) {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
  }
  function applyScale(next: number) {
    setScale(clampScale(next));
  }
  function reset() {
    setScale(1);
    setPos({ x: 0, y: 0 });
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinch.current = { startDist: Math.hypot(a.x - b.x, a.y - b.y), startScale: scale };
      drag.current = null;
    } else if (pointers.current.size === 1) {
      drag.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      applyScale(pinch.current.startScale * (dist / pinch.current.startDist));
    } else if (pointers.current.size === 1 && drag.current) {
      setPos({ x: drag.current.origX + (e.clientX - drag.current.startX), y: drag.current.origY + (e.clientY - drag.current.startY) });
    }
  }

  function endPointer(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) drag.current = null;
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    applyScale(scale - e.deltaY * 0.0015);
  }

  const bleed = fullBleed ? { marginLeft: -16, marginRight: -16 } : undefined;

  return (
    <div style={bleed}>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onWheel={onWheel}
        className={`relative overflow-hidden ${fullBleed ? "" : "rounded-md"}`}
        style={{
          height,
          touchAction: "none",
          background: CARD,
          borderTop: `1px solid ${LINE}`,
          borderBottom: `1px solid ${LINE}`,
          borderLeft: fullBleed ? "none" : `1px solid ${LINE}`,
          borderRight: fullBleed ? "none" : `1px solid ${LINE}`,
          cursor: "grab",
        }}
      >
        <div
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            width: "max-content",
            padding: fullBleed ? "0 16px" : undefined,
          }}
        >
          {children}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1.5 mt-1.5" style={fullBleed ? { paddingLeft: 16, paddingRight: 16 } : undefined}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT }}>przybliż / oddal / przeciągnij</span>
        <button onClick={() => applyScale(scale - 0.3)} className="p-1 rounded" style={{ border: `1px solid ${INK}` }} title="Oddal">
          <Minus size={13} color={INK} />
        </button>
        <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: INK_SOFT, width: 34, textAlign: "center" }}>
          {Math.round(scale * 100)}%
        </span>
        <button onClick={() => applyScale(scale + 0.3)} className="p-1 rounded" style={{ border: `1px solid ${INK}` }} title="Przybliż">
          <Plus size={13} color={INK} />
        </button>
        {(scale !== 1 || pos.x !== 0 || pos.y !== 0) && (
          <button onClick={reset} className="p-1 rounded" style={{ border: `1px solid ${INK}` }} title="Reset">
            <RotateCcw size={13} color={INK} />
          </button>
        )}
      </div>
    </div>
  );
}
