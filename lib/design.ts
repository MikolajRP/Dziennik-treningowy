import type { Category, CategoryGroup } from "./types";

// ---------- design tokens (ported 1:1 from the prototype) ----------
export const INK = "#1B2A3A";
export const INK_SOFT = "#5A6B7A";
export const PAPER = "#ECEEE3";
export const CARD = "#F6F6EF";
export const LINE = "rgba(27,42,58,0.16)";
export const MUSTARD = "#B9821E"; // strength / tonnage
export const PLYO = "#8A6A1F"; // plyo volume
export const TEAL = "#2F6F63"; // functional minutes
export const AERO = "#2F5D8C"; // aerobic minutes
export const ISO = "#6B4C93"; // isometric time under tension (TUT)
export const RUST = "#A6402F"; // danger + circuit accent

// training-plan calendar entry status
export const PLAN_FUTURE = "#9AA5AE"; // planned, date not yet due
export const PLAN_DONE = "#2F7D52"; // matched to a real completed workout
export const PLAN_MISSED = "#C97A2E"; // date passed, no matching workout

// a workout logged in the journal with no matching plan entry at all — a
// lighter tint of PLAN_DONE so it still reads as "green = happened" but is
// visually distinct from a workout the coach actually planned
export const PLAN_LOGGED = "#8FCBA6";

// a race day — deliberately a much stronger, more saturated red than RUST
// (which means "danger/delete" elsewhere) so it reads as its own thing
export const RACE = "#D7263D";

export const FONT_DISPLAY = "var(--font-oswald), sans-serif";
export const FONT_MONO = "var(--font-ibm-plex-mono), monospace";

export const CATEGORY_GROUPS: CategoryGroup[] = ["bieganie", "inne", "silownia"];

export const CATEGORY_GROUP_LABEL: Record<CategoryGroup, string> = {
  bieganie: "Bieganie",
  inne: "Inne aktywności",
  silownia: "Siłownia",
};

export const DEFAULT_CATEGORIES: Category[] = [
  { name: "Wybieganie", group: "bieganie" },
  { name: "Wybieganie + rytmy", group: "bieganie" },
  { name: "2 zakres", group: "bieganie" },
  { name: "BNP", group: "bieganie" },
  { name: "Próg", group: "bieganie" },
  { name: "Tempo", group: "bieganie" },
  { name: "Kolarstwo", group: "inne" },
  { name: "Orbitrek", group: "inne" },
  { name: "Pływanie", group: "inne" },
  { name: "Trekking", group: "inne" },
  { name: "Nogi", group: "silownia" },
  { name: "Plecy", group: "silownia" },
  { name: "Klatka piersiowa", group: "silownia" },
  { name: "Barki", group: "silownia" },
  { name: "Ręce", group: "silownia" },
  { name: "Full Body", group: "silownia" },
  { name: "Funkcjonalny", group: "silownia" },
];

export const KIND_LABEL: Record<string, string> = {
  strength: "Z ciężarem",
  plyo: "Plyo",
  isometric: "Izometryczne",
  functional: "Funkcjonalne",
  aerobic: "Aerobowe",
};
export const KIND_COLOR: Record<string, string> = {
  strength: INK,
  plyo: PLYO,
  isometric: ISO,
  functional: TEAL,
  aerobic: AERO,
};

// maps the color "token" returned by exerciseSummaryText() to a hex value
export const TOKEN_COLOR: Record<string, string> = {
  "ink-soft": INK_SOFT,
  plyo: PLYO,
  iso: ISO,
  teal: TEAL,
  aero: AERO,
};

export const gridBg = {
  backgroundColor: PAPER,
  backgroundImage: `linear-gradient(${LINE} 1px, transparent 1px), linear-gradient(90deg, ${LINE} 1px, transparent 1px)`,
  backgroundSize: "22px 22px",
};

export const inputStyle = {
  fontFamily: FONT_MONO,
  background: "#fff",
  border: `1px solid ${LINE}`,
  color: INK,
};
