"use client";

import type { ReactNode } from "react";
import { FONT_MONO, INK, INK_SOFT, LINE, MUSTARD } from "@/lib/design";

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

export interface SubTabItem<T extends string> {
  id: T;
  label: string;
  icon: ReactNode;
}

// A second-level tab bar styled identically to the app's main tab row
// (icon + label, underline on the active one, horizontal scroll on
// narrow screens) so every level of navigation reads the same way.
export function SubTabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: SubTabItem<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-4 mb-4 overflow-x-auto" style={{ scrollbarWidth: "none", borderBottom: `1px solid ${LINE}` }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className="flex items-center gap-1.5 pb-2 text-sm shrink-0"
          style={{
            fontFamily: FONT_MONO,
            color: active === t.id ? INK : INK_SOFT,
            borderBottom: active === t.id ? `2px solid ${MUSTARD}` : "2px solid transparent",
            marginBottom: -1,
          }}
        >
          {t.icon} {t.label}
        </button>
      ))}
    </div>
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
