"use client";

import { FONT_MONO, INK_SOFT, gridBg } from "@/lib/design";
import { HealthEntryForm, type HealthDraft } from "./HealthEntryForm";

// Blocks the whole app the first time it's opened on a given day until
// today's wellness check-in is filled in — deliberately no close/backdrop
// dismiss, matching the "muszę uzupełnić żeby przejść dalej" requirement.
export function HealthGate({
  open,
  draft,
  setDraft,
  onSave,
  saving,
  error,
}: {
  open: boolean;
  draft: HealthDraft;
  setDraft: (updater: (d: HealthDraft) => HealthDraft) => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-10"
      style={gridBg}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-3" style={{ fontFamily: FONT_MONO, fontSize: 12, color: INK_SOFT }}>
          Uzupełnij dzisiejszą kartę zdrowia, żeby przejść do aplikacji.
        </div>
        <HealthEntryForm draft={draft} setDraft={setDraft} onSave={onSave} saving={saving} error={error} />
      </div>
    </div>
  );
}
