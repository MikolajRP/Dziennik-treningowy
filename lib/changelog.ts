// Recent, coach-facing changes — newest first. Shown in the "Co nowego"
// section of CoachHelpModal. Keep entries short; this is a highlight reel,
// not a full commit log.
export interface ChangelogEntry {
  date: string; // ISO yyyy-mm-dd, used only to flag "unread" news
  text: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-08-04",
    text: "Szkice, notatki i ukryte cykle są teraz prywatne — widzi je tylko trener, który je stworzył, nawet jeśli zawodnik ma więcej niż jednego trenera.",
  },
  {
    date: "2026-08-04",
    text: "Zawody: możesz oznaczyć dzień zawodów w kalendarzu (mocny czerwony kolor) i podać ich nazwę — zawodnik też to widzi.",
  },
  {
    date: "2026-08-04",
    text: "Uproszczone rozpisywanie planu: szkice (widoczne dopiero po publikacji), podpowiedzi z wcześniej wpisywanych treningów, cykle z kolorem i notatką tylko dla Ciebie, osobna zakładka Notatki.",
  },
];

export const LATEST_CHANGELOG_DATE = CHANGELOG[0]?.date ?? "";
