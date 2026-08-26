"use client";

import type { CSSProperties, ReactNode } from "react";
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

// The die-cut notch of a real index tab: the edge that meets the page
// comes to a point instead of a flat rectangle, which is what actually
// reads as "a tab clipped onto a page" rather than just a colored button.
const TAB_CLIP_PATH = "polygon(14px 0%, 100% 0%, 100% 100%, 14px 100%, 0% 50%)";

function Tab({ t, compact }: { t: PaperTab; compact: boolean }) {
  const style: CSSProperties = {
    background: t.accent,
    backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.38), rgba(255,255,255,0) 45%)",
    color: "#fff",
    clipPath: TAB_CLIP_PATH,
    WebkitClipPath: TAB_CLIP_PATH,
    boxShadow: "-4px 4px 10px rgba(27,42,58,0.32), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -2px 3px rgba(0,0,0,0.15)",
  };
  return (
    <button
      onClick={t.onOpen}
      className={`relative flex items-center transition-all duration-150 hover:opacity-100 hover:-translate-x-2 ${
        compact ? "gap-1.5 pl-6 pr-3 py-2" : "gap-2 pl-6 pr-3.5 py-3"
      } ${t.active ? "-translate-x-2 opacity-100" : "translate-x-0 opacity-85"}`}
      style={style}
    >
      {t.icon}
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: compact ? 10.5 : 12,
          fontWeight: 700,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {t.label}
      </span>
      {!!t.badge && (
        <span
          className="absolute -top-1.5 right-1 rounded-full text-[10px] px-1.5 py-0.5 leading-none"
          style={{ fontFamily: FONT_DISPLAY, background: "#fff", color: t.accent, fontWeight: 700 }}
        >
          {t.badge}
        </span>
      )}
    </button>
  );
}

// Desktop-only quick nav styled after a paper planner's colored index tabs
// sticking out past the edge of a page. The tile-zoom home screen
// (HomePanel.tsx) stays the only way to navigate on phone/tablet — this is
// purely an addition for wide screens, hidden below the `lg` breakpoint.
//
// `groups` renders as one continuous stack along the page edge (the way a
// real planner fans out its tabs one after another), with a wider gap
// between groups than within one — e.g. the current section's own
// sub-tabs above, the main section tabs below. `compact` shrinks a
// group's tabs slightly so it reads as a secondary tier under the main one.
export function PaperTabNav({ groups }: { groups: { tabs: PaperTab[]; compact?: boolean }[] }) {
  const visible = groups.filter((g) => g.tabs.length > 0);
  if (visible.length === 0) return null;
  return (
    <div className="hidden lg:flex flex-col gap-5 fixed right-0 top-1/2 -translate-y-1/2 z-20">
      {visible.map((g, i) => (
        <div key={i} className="flex flex-col gap-2">
          {g.tabs.map((t) => (
            <Tab key={t.id} t={t} compact={!!g.compact} />
          ))}
        </div>
      ))}
    </div>
  );
}
