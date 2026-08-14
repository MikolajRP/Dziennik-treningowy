// A lightweight, purely client-side nudge to export a backup — no server
// component, no email. "Acknowledging" the reminder (exporting, or just
// dismissing the banner) snoozes it for another cycle, stored per user so
// a shared browser / multiple accounts don't clobber each other.

const KEY_PREFIX = "exportReminderUntil:";
export const EXPORT_REMINDER_INTERVAL_DAYS = 30;

function storageKey(userId: string) {
  return KEY_PREFIX + userId;
}

export function snoozeExportReminder(userId: string, days = EXPORT_REMINDER_INTERVAL_DAYS) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(userId), String(Date.now() + days * 24 * 60 * 60 * 1000));
}

export function shouldShowExportReminder(userId: string): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(storageKey(userId));
  if (!stored) return true;
  return Date.now() > Number(stored);
}
