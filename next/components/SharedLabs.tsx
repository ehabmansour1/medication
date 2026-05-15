"use client";

import {
  CalendarDays,
  Eye,
  FileText,
  Flame,
  FlaskConical,
  TrendingUp,
} from "lucide-react";
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
import { computeStreak } from "@/lib/streak";

type Hormone = {
  _id: string;
  name: string;
  unit: string;
  normalRange: string;
};

type Result = {
  _id: string;
  hormoneId: string;
  date: string;
  value: number | null;
  notes: string | null;
  imageUrls: string[];
};

type Data = {
  label: string | null;
  expiresAt: string | null;
  sharedAt: string | null;
  hormones: Hormone[];
  results: Result[];
  taken: string[];
};

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

function isPdf(url: string) {
  return url.toLowerCase().split("?")[0].endsWith(".pdf");
}

function toDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function SharedLabs({ token }: { token: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/share/${token}/data`, { cache: "no-store" });
        if (res.status === 410) {
          setError("This share link has expired.");
          return;
        }
        if (res.status === 404) {
          setError("Share link not found.");
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = (await res.json()) as Data;
        setData(d);
        if (d.hormones.length > 0) setActiveId(d.hormones[0]._id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
  }, [token]);

  const summary = useMemo(() => {
    if (!data) return null;
    const takenSet = new Set(data.taken);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let monthMed = 0;
    let monthTaken = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const diff = Math.floor((date.getTime() - START_DATE.getTime()) / MS_PER_DAY);
      if (diff >= 0 && diff % MEDICATION_CYCLE === 0) {
        monthMed++;
        if (takenSet.has(toDateString(date))) monthTaken++;
      }
    }
    const monthRate = monthMed === 0 ? 0 : Math.round((monthTaken / monthMed) * 100);

    let med90 = 0;
    let taken90 = 0;
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const diff = Math.floor((date.getTime() - START_DATE.getTime()) / MS_PER_DAY);
      if (diff >= 0 && diff % MEDICATION_CYCLE === 0) {
        med90++;
        if (takenSet.has(toDateString(date))) taken90++;
      }
    }
    const rate90 = med90 === 0 ? 0 : Math.round((taken90 / med90) * 100);

    const streak = computeStreak(takenSet, START_DATE, MEDICATION_CYCLE);

    return { monthTaken, monthMed, monthRate, rate90, streak };
  }, [data]);

  if (error) {
    return (
      <div className="labs">
        <header className="labs-header">
          <h2>
            <FlaskConical size={22} strokeWidth={2.2} /> Shared lab results
          </h2>
        </header>
        <p className="labs-error">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="labs">
        <p className="labs-empty">Loading…</p>
      </div>
    );
  }

  const activeHormone = data.hormones.find((h) => h._id === activeId) ?? null;
  const range = activeHormone ? parseRange(activeHormone.normalRange) : null;
  const results = activeId ? data.results.filter((r) => r.hormoneId === activeId) : [];

  return (
    <div className="labs">
      <header className="labs-header">
        <h2>
          <FlaskConical size={22} strokeWidth={2.2} /> Shared lab results
        </h2>
        <p className="labs-sub">
          {data.label ? `${data.label} · ` : ""}Read-only view
          {data.expiresAt && <> · expires {new Date(data.expiresAt).toLocaleDateString()}</>}
        </p>
      </header>

      {summary && (
        <section className="settings-section">
          <div className="settings-section-head">
            <h3>
              <CalendarDays size={16} /> Medication adherence
            </h3>
            <span className="adherence-rate">{summary.rate90}% last 90 days</span>
          </div>
          <div className="share-summary-grid">
            <div className="stat-card">
              <h3>This month</h3>
              <p>
                {summary.monthTaken}/{summary.monthMed}
              </p>
              <small>{summary.monthRate}% taken</small>
            </div>
            <div className="stat-card streak-card">
              <h3>
                <Flame size={14} /> Current streak
              </h3>
              <p>{summary.streak.current}</p>
              <small>Best: {summary.streak.longest}</small>
            </div>
            <div className="stat-card">
              <h3>
                <TrendingUp size={14} /> 90-day rate
              </h3>
              <p>{summary.rate90}%</p>
              <small>of medication days</small>
            </div>
          </div>
        </section>
      )}

      {data.hormones.length === 0 && (
        <p className="labs-empty small">No hormones to display.</p>
      )}

      {data.hormones.length > 0 && (
        <div className="hormone-tabs" role="tablist">
          {data.hormones.map((h) => (
            <button
              key={h._id}
              type="button"
              role="tab"
              aria-selected={activeId === h._id}
              className={`hormone-tab${activeId === h._id ? " active" : ""}`}
              onClick={() => setActiveId(h._id)}
            >
              {h.name}
            </button>
          ))}
        </div>
      )}

      {activeHormone && (
        <SharedHormoneSection hormone={activeHormone} results={results} range={range} />
      )}
    </div>
  );
}

function SharedHormoneSection({
  hormone,
  results,
  range,
}: {
  hormone: Hormone;
  results: Result[];
  range: [number, number] | null;
}) {
  const chartData = useMemo(
    () =>
      results
        .filter((r) => r.value !== null)
        .map((r) => ({ date: r.date, value: r.value as number }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [results]
  );

  const [yMin, yMax] = useMemo(() => {
    const values = chartData.map((d) => d.value);
    if (values.length === 0 && !range) return [0, 1];
    const all = values.concat(range ?? []);
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const pad = (hi - lo) * 0.15 || 1;
    return [Math.floor(lo - pad), Math.ceil(hi + pad)];
  }, [chartData, range]);

  return (
    <>
      <section className="hormone-card readonly">
        <div className="hormone-card-main">
          <h3>{hormone.name}</h3>
          <div className="hormone-meta">
            {hormone.unit && <span>Unit: {hormone.unit}</span>}
            {hormone.normalRange && <span>Normal: {hormone.normalRange}</span>}
          </div>
        </div>
      </section>

      {chartData.length > 0 && (
        <section className="settings-section">
          <div className="settings-section-head">
            <h3>Trend</h3>
            <span className="adherence-rate">
              {chartData.length} result{chartData.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(227,176,141,0.12)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "rgba(217,212,206,0.7)", fontSize: 11 }}
                  tickFormatter={(d) => d.slice(5)}
                  stroke="rgba(227,176,141,0.25)"
                />
                <YAxis
                  domain={[yMin, yMax]}
                  tick={{ fill: "rgba(217,212,206,0.7)", fontSize: 11 }}
                  stroke="rgba(227,176,141,0.25)"
                />
                {range && (
                  <ReferenceArea
                    y1={range[0]}
                    y2={range[1]}
                    fill="#87a96b"
                    fillOpacity={0.12}
                    stroke="#87a96b"
                    strokeOpacity={0.25}
                    strokeDasharray="3 3"
                  />
                )}
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#16191f",
                    border: "1px solid rgba(227,176,141,0.3)",
                    borderRadius: 8,
                    color: "#d9d4ce",
                  }}
                  labelStyle={{ color: "#e3b08d" }}
                  formatter={(v: number) => [
                    `${v}${hormone.unit ? " " + hormone.unit : ""}`,
                    hormone.name,
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#e3b08d"
                  strokeWidth={2.5}
                  dot={{ fill: "#d97757", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <ul className="results-list">
        {results.length === 0 && (
          <li className="labs-empty small">No results for this hormone.</li>
        )}
        {results.map((r) => {
          const out =
            r.value !== null && range && (r.value < range[0] || r.value > range[1]);
          return (
            <li key={r._id} className="result-card">
              <div className="result-top">
                <div>
                  <div className="result-date">{r.date}</div>
                  {r.value !== null && (
                    <div className={`result-value${out ? " out-of-range" : ""}`}>
                      {r.value}
                      {hormone.unit ? ` ${hormone.unit}` : ""}
                    </div>
                  )}
                </div>
                {r.imageUrls.length > 0 && (
                  <div className="result-actions">
                    {r.imageUrls.slice(0, 1).map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="icon-btn"
                        aria-label="View attachment"
                      >
                        {isPdf(url) ? <FileText size={14} /> : <Eye size={14} />}
                        {r.imageUrls.length > 1 && (
                          <span className="action-badge">{r.imageUrls.length}</span>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              {r.notes && <p className="result-notes">{r.notes}</p>}
            </li>
          );
        })}
      </ul>
    </>
  );
}
