"use client";

import type { ReactNode } from "react";
import { FONT_MONO, INK, INK_SOFT } from "@/lib/design";

export function Chip({
  active,
  children,
  onClick,
  color,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-xs whitespace-nowrap"
      style={{
        fontFamily: FONT_MONO,
        border: `1px solid ${INK}`,
        background: active ? color || INK : "transparent",
        color: active ? "#fff" : INK,
      }}
    >
      {children}
    </button>
  );
}

export function IconBtn({
  onClick,
  title,
  children,
  color,
}: {
  onClick: () => void;
  title: string;
  children: ReactNode;
  color?: string;
}) {
  return (
    <button onClick={onClick} title={title} className="p-1.5 rounded-md" style={{ color: color || INK_SOFT }}>
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <div className="text-[11px] uppercase tracking-wide mb-1" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
        {label}
      </div>
      {children}
    </div>
  );
}
