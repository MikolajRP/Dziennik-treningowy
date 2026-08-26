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

// The die-cut notch of a real index tab: the edge that meets the page
// comes to a point instead of a flat rectangle, which is what actually
// reads as "a tab clipped onto a page" rather than just a colored button.
const TAB_CLIP_PATH = "polygon(12px 0%, 100% 0%, 100% 100%, 12px 100%, 0% 50%)";

function Tab({ t, small, paperStyle }: { t: PaperTab; small: boolean; paperStyle?: boolean }) {
  const style: CSSProperties = paperStyle
    ? {
        background: PAPER,
        color: INK,
        border: `1px solid ${LINE}`,
        clipPath: TAB_CLIP_PATH,
        WebkitClipPath: TAB_CLIP_PATH,
        boxShadow: "-3px 3px 7px rgba(27,42,58,0.18)",
      }
    : {
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
        small ? "gap-1.5 pl-4 pr-2.5 py-2" : "gap-2 pl-5 pr-3 py-2.5"
      } ${t.active ? "-translate-x-2 opacity-100" : "translate-x-0 opacity-85"}`}
      style={style}
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
        }}
      >
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
  );
}

// Desktop-only quick nav styled after a real ring-binder's colored index
// tabs sticking out past the edge of a page — short flags stacked one
// after another down the edge. Hidden below `lg` so phone/tablet is
// untouched.
//
// A tab's own `subtabs` only render while that tab is active, sliding
// out directly underneath it in the same column — colored to match the
// page itself rather than a bold accent — e.g. Dziennik ->
// Dziennik/Plan/Statystyki/Zdrowie, Zdrowie -> Statystyki/Historia.
export function PaperTabNav({ tabs }: { tabs: PaperTab[] }) {
  return (
    <div className="hidden lg:flex flex-col gap-2 fixed right-0 top-1/2 -translate-y-1/2 z-20">
      {tabs.map((t) => (
        <div key={t.id} className="flex flex-col gap-1.5">
          <Tab t={t} small={false} />
          {t.active && !!t.subtabs?.length && (
            <div className="flex flex-col gap-1.5" style={{ animation: "paperTabFlyout 180ms ease-out both" }}>
              {t.subtabs.map((s) => (
                <Tab key={s.id} t={s} small paperStyle />
              ))}
            </div>
          )}
        </div>
      ))}
      <style>{`
        @keyframes paperTabFlyout {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
