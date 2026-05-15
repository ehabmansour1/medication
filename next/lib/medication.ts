export const MEDICATION_START = new Date("2024-11-12");
export const MEDICATION_CYCLE_DAYS = 3;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function isMedicationDay(date: Date): boolean {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const start = new Date(MEDICATION_START);
  start.setHours(0, 0, 0, 0);
  const daysSinceStart = Math.floor((d.getTime() - start.getTime()) / MS_PER_DAY);
  return daysSinceStart >= 0 && daysSinceStart % MEDICATION_CYCLE_DAYS === 0;
}

/**
 * Returns YYYY-MM-DD for the given moment, evaluated in an IANA timezone.
 * Falls back to UTC if the timezone is invalid.
 */
export function localDateString(date: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}

/** 0-23 in the given timezone (falls back to UTC). */
export function localHour(date: Date, tz: string): number {
  try {
    const h = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).format(date);
    return parseInt(h, 10);
  } catch {
    return date.getUTCHours();
  }
}

export function isMedicationDayString(dateString: string): boolean {
  const [y, m, d] = dateString.split("-").map(Number);
  if (!y || !m || !d) return false;
  const local = Date.UTC(y, m - 1, d);
  const start = Date.UTC(
    MEDICATION_START.getFullYear(),
    MEDICATION_START.getMonth(),
    MEDICATION_START.getDate()
  );
  const daysSinceStart = Math.floor((local - start) / MS_PER_DAY);
  return daysSinceStart >= 0 && daysSinceStart % MEDICATION_CYCLE_DAYS === 0;
}
