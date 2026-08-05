"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { CHANGELOG } from "@/lib/changelog";
import { CARD, FONT_DISPLAY, FONT_MONO, INK, INK_SOFT, LINE, MUSTARD, RACE } from "@/lib/design";
import type { CoachAccess } from "@/lib/types";
import { IconBtn } from "./atoms";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <div
        className="text-[11px] uppercase tracking-wide mb-1.5"
        style={{ fontFamily: FONT_MONO, color: INK_SOFT, letterSpacing: "0.06em" }}
      >
        {title}
      </div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: INK, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

export function CoachHelpModal({
  open,
  onClose,
  pendingInvites,
  onAcceptInvite,
}: {
  open: boolean;
  onClose: () => void;
  pendingInvites?: CoachAccess[];
  onAcceptInvite?: (id: string) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(27,42,58,0.45)" }}>
      <div className="w-full max-w-md max-h-[85vh] flex flex-col rounded-md" style={{ background: CARD, border: `1px solid ${INK}` }}>
        <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: LINE }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: INK, fontWeight: 600 }}>
            Witaj w Dzienniku Treningowym
          </div>
          <IconBtn onClick={onClose} title="Zamknij">
            <X size={16} />
          </IconBtn>
        </div>

        <div className="overflow-y-auto p-4">
          <p className="mb-4" style={{ fontFamily: FONT_MONO, fontSize: 13, color: INK, lineHeight: 1.5 }}>
            Cieszymy się, że tu jesteś. To krótki przewodnik po tym, co możesz zrobić jako trener — w każdej
            chwili wrócisz do niego klikając ikonę <strong>?</strong> w prawym górnym rogu.
          </p>

          <Section title="Zainstaluj na ekranie głównym">
            <div className="mb-1.5">
              <strong>iPhone (Safari):</strong> otwórz aplikację, dotknij ikony Udostępnij (kwadrat ze strzałką
              u dołu ekranu), a następnie „Dodaj do ekranu początkowego”.
            </div>
            <div>
              <strong>Android (Chrome):</strong> otwórz menu (trzy kropki w prawym górnym rogu) i wybierz
              „Dodaj do ekranu głównego” lub „Zainstaluj aplikację”.
            </div>
          </Section>

          <Section title="Zakładka Plan">
            Kalendarz miesięczny zawodnika. Kliknij dzień, żeby dopisać trening — możesz zapisać go jako{" "}
            <strong>szkic</strong> (widoczny tylko dla Ciebie) i opublikować później ikoną oka, kiedy plan
            będzie gotowy. Tam też tworzysz <strong>cykle</strong> (mezocykle/makrocykle) z własnym kolorem
            zaznaczonym w kalendarzu — możesz je pokazać zawodnikowi albo zostawić tylko dla siebie, wraz z
            prywatną notatką. W dowolny dzień możesz też dopisać <strong>zawody</strong> — podświetlą się na
            czerwono i zobaczy je też zawodnik.
          </Section>

          <Section title="Zakładka Notatki">
            Prywatne notatki pod konkretnymi dniami — widoczne wyłącznie dla Ciebie, nigdy dla zawodnika.
          </Section>

          <Section title="Zakładka Dziennik">
            Podgląd zapisanych treningów zawodnika — siłowych i tych zaimportowanych automatycznie ze Stravy.
          </Section>

          <Section title="Zakładka Raporty">
            Statystyki i wykresy zawodnika.
          </Section>

          <Section title="Imię i nazwisko zawodnika">
            Kliknij nazwę w nagłówku (obok ikony ołówka), żeby ją ustawić lub zmienić — to Twoja własna
            etykieta, zawodnik jej nie widzi ani nie edytuje.
          </Section>

          <div className="mb-1">
            <div
              className="text-[11px] uppercase tracking-wide mb-1.5"
              style={{ fontFamily: FONT_MONO, color: INK_SOFT, letterSpacing: "0.06em" }}
            >
              Co nowego
            </div>
            <div className="space-y-2">
              {CHANGELOG.map((entry, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div
                    className="rounded-full shrink-0 mt-1.5"
                    style={{ width: 6, height: 6, background: i === 0 ? RACE : MUSTARD }}
                  />
                  <div style={{ fontFamily: FONT_MONO, fontSize: 12.5, color: INK, lineHeight: 1.5 }}>{entry.text}</div>
                </div>
              ))}
            </div>
          </div>

          {pendingInvites && pendingInvites.length > 0 && (
            <div
              className="mt-5 p-3.5 rounded-md"
              style={{ background: "#fff", border: `1px solid ${INK}` }}
            >
              <div
                className="text-[11px] uppercase tracking-wide mb-2"
                style={{ fontFamily: FONT_MONO, color: INK_SOFT, letterSpacing: "0.06em" }}
              >
                Zaproszenie czeka
              </div>
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between gap-2 mb-2 last:mb-0">
                  <div style={{ fontFamily: FONT_MONO, fontSize: 12.5, color: INK }}>
                    Zawodnik: <strong>{invite.athleteEmail}</strong>
                  </div>
                  <button
                    onClick={() => onAcceptInvite?.(invite.id)}
                    className="px-3 py-1.5 rounded-md text-xs whitespace-nowrap"
                    style={{ fontFamily: FONT_MONO, background: INK, color: "#fff" }}
                  >
                    Zaakceptuj zaproszenie
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
