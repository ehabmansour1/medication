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
