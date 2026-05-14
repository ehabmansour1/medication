"use client";

import { LineChart as LineIcon, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Hormone, LabResult } from "@/lib/types";

const START_DATE = new Date("2024-11-12");
const MEDICATION_CYCLE = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseRange(range: string): [number, number] | null {
  const m = range.match(/^\s*(-?\d+(?:\.\d+)?)\s*[-–to]+\s*(-?\d+(?:\.\d+)?)\s*$/i);
  if (!m) return null;
  const lo = Number(m[1]);
  const hi = Number(m[2]);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return lo <= hi ? [lo, hi] : [hi, lo];
}

function toDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

type HeatCell = {
  dateString: string;
  isMedDay: boolean;
  isTaken: boolean;
  isFuture: boolean;
  isToday: boolean;
};

function buildHeatmap(taken: Set<string>): HeatCell[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 27 * 7); // 27 weeks back
  // Align start to the same weekday as the first cell (Sunday)
  start.setDate(start.getDate() - start.getDay());

  const cells: HeatCell[] = [];
  const end = new Date(today);
  end.setDate(end.getDate() + 6 - end.getDay()); // round forward to end of week
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const cur = new Date(d);
    const daysSinceStart = Math.floor((cur.getTime() - START_DATE.getTime()) / MS_PER_DAY);
    const isMedDay = daysSinceStart >= 0 && daysSinceStart % MEDICATION_CYCLE === 0;
    const dateString = toDateString(cur);
    cells.push({
      dateString,
      isMedDay,
      isTaken: taken.has(dateString),
      isFuture: cur > today,
      isToday: cur.getTime() === today.getTime(),
    });
  }
  return cells;
}

export default function Trends() {
  const [hormones, setHormones] = useState<Hormone[]>([]);
  const [allResults, setAllResults] = useState<Record<string, LabResult[]>>({});
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [hormRes, doseRes] = await Promise.all([
          fetch("/api/hormones", { cache: "no-store" }),
          fetch("/api/medications", { cache: "no-store" }),
        ]);
        if (!hormRes.ok) throw new Error(`Hormones HTTP ${hormRes.status}`);
        if (!doseRes.ok) throw new Error(`Doses HTTP ${doseRes.status}`);
        const horm = (await hormRes.json()) as { hormones: Hormone[] };
        const dose = (await doseRes.json()) as { taken: string[] };
        setHormones(horm.hormones);
        setTaken(new Set(dose.taken));

        if (horm.hormones.length > 0) {
          const entries = await Promise.all(
            horm.hormones.map(async (h) => {
              const r = await fetch(`/api/results?hormoneId=${h._id}`, { cache: "no-store" });
              if (!r.ok) throw new Error(`Results HTTP ${r.status}`);
              const data = (await r.json()) as { results: LabResult[] };
              return [h._id, data.results] as const;
            })
          );
          const map: Record<string, LabResult[]> = {};
          for (const [id, list] of entries) map[id] = list;
          setAllResults(map);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const heatmap = useMemo(() => buildHeatmap(taken), [taken]);

  // group heat cells by week (column)
  const heatWeeks = useMemo(() => {
    const weeks: HeatCell[][] = [];
    for (let i = 0; i < heatmap.length; i += 7) {
      weeks.push(heatmap.slice(i, i + 7));
    }
    return weeks;
  }, [heatmap]);

  const adherenceLast90 = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let medDays = 0;
    let takenCount = 0;
    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const daysSinceStart = Math.floor((d.getTime() - START_DATE.getTime()) / MS_PER_DAY);
      if (daysSinceStart >= 0 && daysSinceStart % MEDICATION_CYCLE === 0) {
        medDays++;
        if (taken.has(toDateString(d))) takenCount++;
      }
    }
    return medDays === 0 ? 0 : Math.round((takenCount / medDays) * 100);
  }, [taken]);

  return (
    <div className="labs">
      <header className="labs-header">
        <h2>
          <LineIcon size={22} strokeWidth={2.2} /> Trends
        </h2>
        <p className="labs-sub">Adherence and lab results over time</p>
      </header>

      {error && <p className="labs-error">{error}</p>}
      {loading && <p className="labs-empty">Loading…</p>}

      {!loading && (
        <>
          <section className="settings-section">
            <div className="settings-section-head">
              <h3>Adherence</h3>
              <span className="adherence-rate">{adherenceLast90}% (last 90 days)</span>
            </div>
            <div className="heatmap" role="img" aria-label="Adherence heatmap">
              {heatWeeks.map((week, wi) => (
                <div key={wi} className="heat-col">
                  {week.map((cell) => {
                    const cls = ["heat-cell"];
                    if (cell.isFuture) cls.push("future");
                    else if (cell.isMedDay && cell.isTaken) cls.push("taken");
                    else if (cell.isMedDay) cls.push("missed");
                    else cls.push("off");
                    if (cell.isToday) cls.push("today");
                    return (
                      <div
                        key={cell.dateString}
                        className={cls.join(" ")}
                        title={`${cell.dateString}${
                          cell.isMedDay ? (cell.isTaken ? " ✓ taken" : " ✗ missed") : ""
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="heat-legend">
              <span><i className="heat-cell off" /> off-day</span>
              <span><i className="heat-cell taken" /> taken</span>
              <span><i className="heat-cell missed" /> missed</span>
            </div>
          </section>

          {hormones.length === 0 && (
            <p className="labs-empty small">
              Add a hormone in Settings to see lab trends here.
            </p>
          )}

          {hormones.map((h) => (
            <HormoneChart key={h._id} hormone={h} results={allResults[h._id] ?? []} />
          ))}
        </>
      )}
    </div>
  );
}

function HormoneChart({ hormone, results }: { hormone: Hormone; results: LabResult[] }) {
  const range = parseRange(hormone.normalRange);

  const data = useMemo(
    () =>
      results
        .filter((r) => r.value !== null)
        .map((r) => ({ date: r.date, value: r.value as number }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [results]
  );

  const [yMin, yMax] = useMemo(() => {
    const values = data.map((d) => d.value);
    if (values.length === 0 && !range) return [0, 1];
    const all = values.concat(range ?? []);
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const pad = (hi - lo) * 0.15 || 1;
    return [Math.floor(lo - pad), Math.ceil(hi + pad)];
  }, [data, range]);

  if (data.length === 0) {
    return (
      <section className="settings-section">
        <div className="settings-section-head">
          <h3>{hormone.name}</h3>
        </div>
        <p className="labs-empty small">No results with numeric values yet.</p>
      </section>
    );
  }

  return (
    <section className="settings-section">
      <div className="settings-section-head">
        <h3>{hormone.name}</h3>
        <span className="adherence-rate">
          <TrendingUp size={14} /> {data.length} result{data.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(213,157,128,0.12)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "rgba(198,198,208,0.7)", fontSize: 11 }}
              tickFormatter={(d) => d.slice(5)}
              stroke="rgba(213,157,128,0.25)"
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fill: "rgba(198,198,208,0.7)", fontSize: 11 }}
              stroke="rgba(213,157,128,0.25)"
            />
            {range && (
              <ReferenceArea
                y1={range[0]}
                y2={range[1]}
                fill="#4caf50"
                fillOpacity={0.12}
                stroke="#4caf50"
                strokeOpacity={0.25}
                strokeDasharray="3 3"
              />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: "#0d1d25",
                border: "1px solid rgba(213,157,128,0.3)",
                borderRadius: 8,
                color: "#c6c6d0",
              }}
              labelStyle={{ color: "#d59d80" }}
              formatter={(v: number) => [`${v}${hormone.unit ? " " + hormone.unit : ""}`, hormone.name]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#d59d80"
              strokeWidth={2.5}
              dot={{ fill: "#ff5900", r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {hormone.unit && <p className="chart-unit">Unit: {hormone.unit}</p>}
    </section>
  );
}
