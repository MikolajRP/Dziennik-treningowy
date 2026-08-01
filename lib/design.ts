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

export const FONT_DISPLAY = "var(--font-oswald), sans-serif";
export const FONT_MONO = "var(--font-ibm-plex-mono), monospace";

export const DEFAULT_CATEGORIES = [
  "Nogi",
  "Plecy",
  "Klatka piersiowa",
  "Barki",
  "Ręce",
  "Full Body",
  "Funkcjonalny",
  "Cardio",
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
