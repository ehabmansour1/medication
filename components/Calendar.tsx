"use client";

import { useEffect, useMemo, useState } from "react";

const START_DATE = new Date("2024-11-12");
const MEDICATION_CYCLE = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type DayCell = {
  date: Date;
  dateString: string;
  isMedicationDay: boolean;
  isToday: boolean;
};

function buildMonth(year: number, month: number): DayCell[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: DayCell[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const daysSinceStart = Math.floor((date.getTime() - START_DATE.getTime()) / MS_PER_DAY);
    const isMedicationDay = daysSinceStart >= 0 && daysSinceStart % MEDICATION_CYCLE === 0;

    cells.push({
      date,
      dateString: toDateString(date),
      isMedicationDay,
      isToday: date.getTime() === today.getTime(),
    });
  }
  return cells;
}

export default function Calendar() {
  const today = useMemo(() => new Date(), []);
  const cells = useMemo(() => buildMonth(today.getFullYear(), today.getMonth()), [today]);

  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/medications", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { taken: string[] };
        if (!cancelled) setTaken(new Set(data.taken));
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const medicationDays = cells.filter((c) => c.isMedicationDay);
  const takenInMonth = medicationDays.filter((c) => taken.has(c.dateString)).length;
  const adherenceRate =
    medicationDays.length > 0 ? Math.round((takenInMonth / medicationDays.length) * 100) : 0;

  async function markTaken(dateString: string) {
    setPending((p) => new Set(p).add(dateString));
    try {
      const res = await fetch("/api/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateString }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTaken((prev) => new Set(prev).add(dateString));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(dateString);
        return next;
      });
    }
  }

  return (
    <div className="container">
      <div>
        <h2>Medication Tracker</h2>
        <div className="stats">
          <div className="stat-card">
            <h3>Rate</h3>
            <p>{adherenceRate}%</p>
          </div>
          <div className="stat-card">
            <h3>Doses This Month</h3>
            <p>
              {takenInMonth}/{medicationDays.length}
            </p>
          </div>
        </div>
        {loadError && (
          <p style={{ color: "#ff8080", textAlign: "center", marginBottom: 8 }}>
            {loadError}
          </p>
        )}
      </div>
      <div className="calendar">
        {cells.map((cell) => {
          const isTaken = taken.has(cell.dateString);
          const isPending = pending.has(cell.dateString);
          const dayName = cell.date.toLocaleDateString("en-US", { weekday: "short" });
          const classes = ["day"];
          if (cell.isMedicationDay) classes.push("medication-day");
          if (isTaken) classes.push("medication-taken");
          if (cell.isToday) classes.push("today");

          return (
            <div key={cell.dateString} className={classes.join(" ")}>
              <div className="day-name">{dayName}</div>
              <div className="date-number">{cell.date.getDate()}</div>
              <button
                type="button"
                className="check-button"
                disabled={isPending || isTaken}
                onClick={() => markTaken(cell.dateString)}
              >
                {isPending ? "..." : "Take"}
              </button>
              <div className="taken-text">✓ Taken</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
