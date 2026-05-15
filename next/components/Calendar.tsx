"use client";

import { Flame, Target } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { computeStreak } from "@/lib/streak";
import { vibrate } from "@/lib/haptic";
import { fireConfetti, STREAK_MILESTONES } from "@/lib/celebrate";

const START_DATE = new Date("2024-11-12");
const MEDICATION_CYCLE = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_GOAL = 80;

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
  const [goal, setGoal] = useState<number>(DEFAULT_GOAL);
  const celebratedRef = useRef<Set<number>>(new Set());
  const prefsLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [med, prefs] = await Promise.all([
          fetch("/api/medications", { cache: "no-store" }),
          fetch("/api/preferences", { cache: "no-store" }),
        ]);
        if (!med.ok) throw new Error(`Doses HTTP ${med.status}`);
        if (!prefs.ok) throw new Error(`Prefs HTTP ${prefs.status}`);
        const medData = (await med.json()) as { taken: string[] };
        const prefsData = (await prefs.json()) as {
          goal: number;
          celebratedMilestones: number[];
        };
        if (cancelled) return;
        setTaken(new Set(medData.taken));
        setGoal(prefsData.goal);
        celebratedRef.current = new Set(prefsData.celebratedMilestones);
        prefsLoadedRef.current = true;
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

  const streak = useMemo(
    () => computeStreak(taken, START_DATE, MEDICATION_CYCLE),
    [taken]
  );

  useEffect(() => {
    if (!prefsLoadedRef.current) return;
    if (!STREAK_MILESTONES.includes(streak.current)) return;
    if (celebratedRef.current.has(streak.current)) return;

    const newSet = new Set(celebratedRef.current);
    newSet.add(streak.current);
    celebratedRef.current = newSet;

    void fireConfetti();
    void fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ celebratedMilestones: Array.from(newSet) }),
    }).catch(() => {
      /* best-effort */
    });
  }, [streak.current]);

  const goalProgress = Math.min(100, Math.round((adherenceRate / Math.max(goal, 1)) * 100));
  const goalMet = adherenceRate >= goal;

  async function markTaken(dateString: string) {
    setPending((p) => new Set(p).add(dateString));
    vibrate(15);
    try {
      const res = await fetch("/api/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateString }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTaken((prev) => new Set(prev).add(dateString));
      vibrate([10, 40, 20]);
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
        <div className="stats">
          <div className="stat-card">
            <h3>Doses This Month</h3>
            <p>
              {takenInMonth}/{medicationDays.length}
            </p>
          </div>
          <div className="stat-card streak-card">
            <h3>
              <Flame size={14} /> Streak
            </h3>
            <p>{streak.current}</p>
            <small>Best: {streak.longest}</small>
          </div>
          <div className="goal-card">
            <div className="goal-head">
              <span>
                <Target size={14} /> Goal: {goal}%
              </span>
              <span className={goalMet ? "goal-met" : ""}>
                {goalMet ? `✓ Met (${adherenceRate}%)` : `${adherenceRate}%`}
              </span>
            </div>
            <div className="goal-bar">
              <div
                className={`goal-fill${goalMet ? " met" : ""}`}
                style={{ width: `${goalProgress}%` }}
              />
            </div>
          </div>
        </div>

        {loadError && (
          <p style={{ color: "#e08484", textAlign: "center", marginBottom: 8 }}>
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
