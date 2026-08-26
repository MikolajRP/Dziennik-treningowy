"use client";

import type { CSSProperties, ReactNode } from "react";
import { FONT_DISPLAY, INK, LINE, PAPER } from "@/lib/design";

export interface PaperTab {
  id: string;
  label: string;
  icon: ReactNode;
  accent: string;
  active: boolean;
  badge?: number;
  onOpen: () => void;
  // Slides out directly underneath this tab, in the same column, only
  // while it's active — e.g. "Zdrowie" reveals Statystyki/Historia below it.
  subtabs?: PaperTab[];
}

function Tab({ t, small, paperStyle }: { t: PaperTab; small: boolean; paperStyle?: boolean }) {
  const style: CSSProperties = paperStyle
    ? {
        background: PAPER,
        color: INK,
        border: `1px solid ${LINE}`,
        boxShadow: "-3px 3px 7px rgba(27,42,58,0.18)",
      }
    : {
        background: t.accent,
        backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.38), rgba(255,255,255,0) 45%)",
        color: "#fff",
        boxShadow: "-4px 4px 10px rgba(27,42,58,0.32), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -2px 3px rgba(0,0,0,0.15)",
      };
  return (
    <button
      onClick={t.onOpen}
      className={`relative flex flex-col items-center justify-center rounded-xl transition-all duration-150 hover:opacity-100 hover:translate-x-1.5 ${
        small ? "gap-1.5 py-2.5" : "gap-2 py-3.5"
      } ${t.active ? "translate-x-1.5 opacity-100" : "translate-x-0 opacity-85"}`}
      style={{ ...style, width: small ? 34 : 44, minHeight: small ? 88 : 112 }}
    >
      {t.icon}
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: small ? 10.5 : 12,
          fontWeight: 700,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
        }}
      >
        {t.label}
      </span>
      {!!t.badge && (
        <span
          className="absolute -top-1.5 right-0.5 rounded-full text-[10px] px-1.5 py-0.5 leading-none"
          style={{ fontFamily: FONT_DISPLAY, background: "#fff", color: t.accent, fontWeight: 700 }}
        >
          {t.badge}
        </span>
      )}
    </button>
  );
}

// Cascading stack, like a real fanned index: item 0 sits fully in
// front, each next one tucks in a little underneath it (negative
// margin + a lower z-index), and the active tab jumps to the very
// front of the whole stack. `zBase` is a large, well-separated starting
// value so a nested subtab list (given `zBase` from its active parent's
// own z-index) can never collide with an unrelated sibling further
// down the top-level stack.
function TabStack({ items, small, paperStyle, zBase }: { items: PaperTab[]; small: boolean; paperStyle?: boolean; zBase: number }) {
  return (
    <>
      {items.map((t, i) => {
        const z = t.active ? zBase + 100 : zBase - i * 2;
        return (
          <div key={t.id} className="flex flex-col" style={{ zIndex: z, marginTop: i === 0 ? 0 : small ? -10 : -14 }}>
            <Tab t={t} small={small} paperStyle={paperStyle} />
            {t.active && !!t.subtabs?.length && (
              <div style={{ animation: "paperTabFlyout 180ms ease-out both" }}>
                <TabStack items={t.subtabs} small paperStyle zBase={z - 1} />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// Desktop-only quick nav styled after a real planner's colored index
// tabs — the page sits in front (see Journal.tsx/CoachAthleteView.tsx's
// desktop "page" card, given a higher z-index than this whole nav), and
// these tabs live behind its edge, each one tucked a little under the
// one before it, only the active one popping fully forward. Hidden
// below `lg` so phone/tablet is untouched.
export function PaperTabNav({ tabs }: { tabs: PaperTab[] }) {
  return (
    <div className="hidden lg:flex flex-col fixed right-0 top-1/2 -translate-y-1/2">
      <TabStack items={tabs} small={false} zBase={1000} />
      <style>{`
        @keyframes paperTabFlyout {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
