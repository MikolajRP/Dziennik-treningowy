"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { BookOpen, CalendarClock, HeartPulse, Users } from "lucide-react";
import { FONT_DISPLAY, FONT_MONO, HEALTH, INK, PLANNER, RACE, TEAL, gridBg } from "@/lib/design";

export const HOME_TILE_ZOOM_MS = 320;

// Natural size the real tab content is rendered at before being scaled
// down into the tile — a typical phone content width, tall enough to
// show a few real rows/cards.
const PREVIEW_WIDTH = 380;
const PREVIEW_HEIGHT = 640;
const PREVIEW_SCALE = 0.48;

const liquidGlassWash: CSSProperties = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.08) 100%)",
  backdropFilter: "blur(3px) saturate(160%)",
  WebkitBackdropFilter: "blur(3px) saturate(160%)",
  boxShadow: "inset 0 1.5px 1px rgba(255,255,255,0.9), inset 0 -14px 24px rgba(255,255,255,0.1), inset 0 -1px 2px rgba(27,42,58,0.08)",
};

interface Tile {
  id: string;
  label: string;
  icon: ReactNode;
  accent: string;
  action: () => void;
  badge?: number;
  preview: ReactNode;
}

export function HomePanel({
  dziennikPreview,
  plannerPreview,
  zdrowiePreview,
  trenerPreview,
  onOpenDziennik,
  onOpenPlanner,
  onOpenZdrowie,
  onOpenTrener,
  onTransitionStart,
  pendingInviteCount,
}: {
  dziennikPreview: ReactNode;
  plannerPreview: ReactNode;
  zdrowiePreview: ReactNode;
  trenerPreview: ReactNode;
  onOpenDziennik: () => void;
  onOpenPlanner: () => void;
  onOpenZdrowie: () => void;
  onOpenTrener: () => void;
  onTransitionStart: () => void;
  pendingInviteCount: number;
}) {
  const [zoomingId, setZoomingId] = useState<string | null>(null);

  function handleClick(id: string, action: () => void) {
    if (zoomingId) return;
    setZoomingId(id);
    onTransitionStart();
    setTimeout(action, HOME_TILE_ZOOM_MS);
  }

  const tiles: Tile[] = [
    {
      id: "log",
      label: "Dziennik",
      icon: <BookOpen size={34} strokeWidth={1.75} />,
      accent: INK,
      action: () => handleClick("log", onOpenDziennik),
      preview: dziennikPreview,
    },
    {
      id: "planner",
      label: "Planner",
      icon: <CalendarClock size={34} strokeWidth={1.75} />,
      accent: PLANNER,
      action: () => handleClick("planner", onOpenPlanner),
      preview: plannerPreview,
    },
    {
      id: "health",
      label: "Zdrowie",
      icon: <HeartPulse size={34} strokeWidth={1.75} />,
      accent: HEALTH,
      action: () => handleClick("health", onOpenZdrowie),
      preview: zdrowiePreview,
    },
    {
      id: "coach",
      label: "Trener",
      icon: <Users size={34} strokeWidth={1.75} />,
      accent: TEAL,
      action: () => handleClick("coach", onOpenTrener),
      badge: pendingInviteCount,
      preview: trenerPreview,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 pb-6">
      {tiles.map((t) => {
        const active = zoomingId === t.id;
        return (
          <button
            key={t.id}
            onClick={t.action}
            className="relative aspect-square rounded-[28px] overflow-hidden"
            style={{
              border: "1px solid rgba(27,42,58,0.14)",
              boxShadow: "0 14px 30px rgba(27,42,58,0.12)",
              transform: active ? "scale(9)" : zoomingId ? "scale(0.92)" : "scale(1)",
              opacity: zoomingId && !active ? 0 : 1,
              transition: `transform ${HOME_TILE_ZOOM_MS}ms cubic-bezier(0.4,0,0.2,1), opacity ${HOME_TILE_ZOOM_MS}ms ease`,
              zIndex: active ? 30 : 1,
            }}
          >
            {/* the real tab, mounted read-only at natural size and scaled
                down — a genuine miniature of that screen, not a mockup.
                Sharpens from blurred to crisp as the tile zooms in. */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden" style={gridBg}>
              <div
                style={{
                  filter: active ? "blur(0px)" : "blur(2px)",
                  transition: `filter ${HOME_TILE_ZOOM_MS}ms ease`,
                  width: PREVIEW_WIDTH,
                  height: PREVIEW_HEIGHT,
                  transform: `scale(${PREVIEW_SCALE})`,
                  transformOrigin: "center",
                  overflow: "hidden",
                  pointerEvents: "none",
                }}
              >
                <div style={{ ...gridBg, width: PREVIEW_WIDTH, minHeight: PREVIEW_HEIGHT, padding: 14 }}>{t.preview}</div>
              </div>
            </div>

            {/* glossy top-left highlight — the "liquid" in liquid glass */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                top: "-18%",
                left: "-14%",
                width: "75%",
                height: "55%",
                background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.75), rgba(255,255,255,0) 68%)",
                opacity: active ? 0 : 1,
                transition: `opacity ${HOME_TILE_ZOOM_MS}ms ease`,
              }}
            />

            {/* frosted glass wash + icon/label — fades away as the tile
                zooms in, revealing the now-sharp preview underneath */}
            <div
              className="absolute inset-0"
              style={{ ...liquidGlassWash, opacity: active ? 0 : 1, transition: `opacity ${HOME_TILE_ZOOM_MS}ms ease` }}
            />
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              style={{ opacity: active ? 0 : 1, transition: `opacity ${HOME_TILE_ZOOM_MS}ms ease` }}
            >
              <div
                className="rounded-2xl flex items-center justify-center"
                style={{
                  width: 66,
                  height: 66,
                  background: `linear-gradient(155deg, rgba(255,255,255,0.85) 0%, ${t.accent}26 55%, ${t.accent}3d 100%)`,
                  boxShadow: `inset 0 1.5px 1.5px rgba(255,255,255,0.95), inset 0 -6px 10px rgba(27,42,58,0.1), 0 8px 16px rgba(27,42,58,0.22), 0 2px 4px rgba(27,42,58,0.18)`,
                  border: "1px solid rgba(255,255,255,0.7)",
                }}
              >
                <div style={{ color: t.accent, filter: "drop-shadow(0 2px 3px rgba(27,42,58,0.35))" }}>{t.icon}</div>
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, letterSpacing: 0.5, color: INK, fontWeight: 700, textTransform: "uppercase" }}>
                {t.label}
              </div>
            </div>

            {!!t.badge && (
              <div
                className="absolute top-2.5 right-2.5 rounded-full text-[10px] px-1.5 py-0.5"
                style={{ fontFamily: FONT_MONO, background: RACE, color: "#fff", opacity: active ? 0 : 1, transition: `opacity ${HOME_TILE_ZOOM_MS}ms ease` }}
              >
                {t.badge}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
