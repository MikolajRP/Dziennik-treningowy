"use client";

import type { ReactNode } from "react";
import { FONT_DISPLAY } from "@/lib/design";

export interface PaperTab {
  id: string;
  label: string;
  icon: ReactNode;
  accent: string;
  active: boolean;
  badge?: number;
  onOpen: () => void;
}

// Desktop-only quick nav styled after a paper planner's colored index tabs
// sticking out past the edge of a page. The tile-zoom home screen
// (HomePanel.tsx) stays the only way to navigate on phone/tablet — this is
// purely an addition for wide screens, so every section is one click away
// without detouring back through "home" first. Hidden below the `lg`
// breakpoint so mobile/tablet layout is untouched.
export function PaperTabNav({ tabs }: { tabs: PaperTab[] }) {
  return (
    <div className="hidden lg:flex flex-col gap-2 fixed right-0 top-1/2 -translate-y-1/2 z-20">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={t.onOpen}
          className={`relative flex items-center gap-2 pl-4 pr-3 py-3 rounded-l-2xl transition-all duration-150 hover:opacity-100 hover:-translate-x-2 ${
            t.active ? "-translate-x-2 opacity-100" : "translate-x-0 opacity-80"
          }`}
          style={{ background: t.accent, color: "#fff", boxShadow: "-4px 4px 10px rgba(27,42,58,0.3)" }}
        >
          {t.icon}
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>
            {t.label}
          </span>
          {!!t.badge && (
            <span
              className="absolute -top-1.5 -left-1.5 rounded-full text-[10px] px-1.5 py-0.5 leading-none"
              style={{ fontFamily: FONT_DISPLAY, background: "#fff", color: t.accent, fontWeight: 700 }}
            >
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
