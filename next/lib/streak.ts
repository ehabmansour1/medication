const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export type StreakInfo = { current: number; longest: number };

/**
 * Walks medication days from startDate up to today and returns
 * the longest run + current run of taken doses.
 * "Today" is a grace day: if today is a med-day and not yet taken,
 * the current streak is preserved instead of being broken.
 */
export function computeStreak(
  taken: Set<string>,
  startDate: Date,
  cycleDays: number
): StreakInfo {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  if (today < start) return { current: 0, longest: 0 };

  let longest = 0;
  let temp = 0;

  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + cycleDays)) {
    const isToday = d.getTime() === today.getTime();
    if (taken.has(toDateString(d))) {
      temp++;
      if (temp > longest) longest = temp;
    } else if (isToday) {
      // grace: don't break streak just because today is unmarked
    } else {
      temp = 0;
    }
  }

  return { current: temp, longest };
}
