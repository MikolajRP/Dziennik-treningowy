"use client";

import { Check, X } from "lucide-react";
import { CARD, FONT_DISPLAY, FONT_MONO, HEALTH, INK, INK_SOFT, LINE, RUST, inputStyle } from "@/lib/design";
import { Field } from "./atoms";

// Sleep, HRV, and resting HR sync in automatically from Garmin (see
// lib/garmin.ts) whenever this card is saved — weight stays manual (not
// every Garmin setup has a connected smart scale), alongside the
// subjective fields Garmin can't measure at all.
export interface HealthDraft {
  date: string;
  // Raw text, not a parsed number — a controlled input that reformats its
  // own value on every keystroke (as Number(...) would force) strips
  // whatever separator the user just typed before they can type digits
  // after it, making "," (or even ".") impossible to enter. Parsed at
  // save time instead (see Journal.tsx's handleSaveHealthEntry).
  weightKg: string;
  wellbeing: number; // 1-10
  notes: string;
}

export const EMPTY_HEALTH_DRAFT: HealthDraft = {
  date: "",
  weightKg: "",
  wellbeing: 5,
  notes: "",
};

function SliderField({
  label,
  value,
  onChange,
  max = 10,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={1}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
          style={{ accentColor: HEALTH }}
        />
        <div
          className="w-10 text-center rounded text-sm"
          style={{ fontFamily: FONT_MONO, color: INK, fontWeight: 600 }}
        >
          {value}
        </div>
      </div>
    </Field>
  );
}

function NumberField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 rounded text-sm"
        style={inputStyle}
      />
    </Field>
  );
}

// Shared body for both the mandatory daily gate and editing a past entry
// from the health history list. `onCancel` omitted => gate mode (no way
// to back out without saving).
export function HealthEntryForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
  error,
}: {
  draft: HealthDraft;
  setDraft: (updater: (d: HealthDraft) => HealthDraft) => void;
  onSave: () => void;
  onCancel?: () => void;
  saving: boolean;
  error: string | null;
}) {
  return (
    <div className="rounded-md p-3" style={{ background: CARD, border: `1px solid ${INK}` }}>
      <div className="flex items-center justify-between mb-3">
        <div style={{ fontFamily: FONT_DISPLAY, color: INK, fontSize: 16, fontWeight: 600 }}>
          KARTA ZDROWIA
        </div>
        {onCancel && (
          <button onClick={onCancel} title="Zamknij" className="p-1.5 rounded-md" style={{ color: INK_SOFT }}>
            <X size={18} />
          </button>
        )}
      </div>

      <div className="text-xs mb-3" style={{ fontFamily: FONT_MONO, color: INK_SOFT }}>
        Sen, HRV i tętno spoczynkowe synchronizują się automatycznie z Garmin Connect po zapisaniu karty.
      </div>

      <NumberField
        label="Masa ciała (kg)"
        placeholder="np. 74,5"
        value={draft.weightKg}
        onChange={(v) => setDraft((d) => ({ ...d, weightKg: v }))}
      />
      <SliderField
        label="Samopoczucie (1-10)"
        value={draft.wellbeing}
        onChange={(v) => setDraft((d) => ({ ...d, wellbeing: v }))}
      />
      <Field label="Notatki (opcjonalnie)">
        <textarea
          value={draft.notes}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          rows={2}
          className="w-full px-2 py-1.5 rounded text-sm"
          style={inputStyle}
        />
      </Field>

      {error && (
        <div
          className="text-xs mb-2 px-2 py-1.5 rounded"
          style={{ fontFamily: FONT_MONO, background: "#FBEAE7", color: RUST, border: `1px solid ${RUST}` }}
        >
          {error}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-sm"
          style={{ fontFamily: FONT_MONO, background: INK, color: "#fff", opacity: saving ? 0.5 : 1 }}
        >
          <Check size={16} /> {saving ? "Zapisywanie…" : "Zapisz kartę zdrowia"}
        </button>
        {onCancel && (
          <button onClick={onCancel} className="px-4 py-2.5 rounded-md text-sm" style={{ fontFamily: FONT_MONO, border: `1px solid ${LINE}`, color: INK_SOFT }}>
            Anuluj
          </button>
        )}
      </div>
    </div>
  );
}
