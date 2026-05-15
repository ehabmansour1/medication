"use client";

import { FileText, Printer } from "lucide-react";
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

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateString(d);
}

export default function Report() {
  const [hormones, setHormones] = useState<Hormone[]>([]);
  const [allResults, setAllResults] = useState<Record<string, LabResult[]>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [from, setFrom] = useState<string>(daysAgo(180));
  const [to, setTo] = useState<string>(toDateString(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const hRes = await fetch("/api/hormones", { cache: "no-store" });
        if (!hRes.ok) throw new Error(`HTTP ${hRes.status}`);
        const h = (await hRes.json()) as { hormones: Hormone[] };
        setHormones(h.hormones);
        setSelected(new Set(h.hormones.map((x) => x._id)));

        const entries = await Promise.all(
          h.hormones.map(async (x) => {
            const r = await fetch(`/api/results?hormoneId=${x._id}`, { cache: "no-store" });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const data = (await r.json()) as { results: LabResult[] };
            return [x._id, data.results] as const;
          })
        );
        const map: Record<string, LabResult[]> = {};
        for (const [id, list] of entries) map[id] = list;
        setAllResults(map);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const sections = useMemo(() => {
    return hormones
      .filter((h) => selected.has(h._id))
      .map((h) => {
        const data = (allResults[h._id] ?? [])
          .filter((r) => r.date >= from && r.date <= to)
          .sort((a, b) => a.date.localeCompare(b.date));
        return { hormone: h, results: data };
      });
  }, [hormones, allResults, selected, from, to]);

  return (
    <div className="labs report-root">
      <header className="labs-header no-print">
        <h2>
          <FileText size={22} strokeWidth={2.2} /> Report
        </h2>
        <p className="labs-sub">Print or save as PDF</p>
      </header>

      {error && <p className="labs-error no-print">{error}</p>}
      {loading && <p className="labs-empty no-print">Loading…</p>}

      {!loading && (
        <section className="settings-section report-controls no-print">
          <div className="report-row">
            <label className="field">
              <span>From</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="field">
              <span>To</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>

          <div className="field">
            <span>Hormones to include</span>
            <div className="report-checks">
              {hormones.map((h) => (
                <label key={h._id} className="report-check">
                  <input
                    type="checkbox"
                    checked={selected.has(h._id)}
                    onChange={() => toggle(h._id)}
                  />
                  <span>{h.name}</span>
                </label>
              ))}
              {hormones.length === 0 && (
                <span className="labs-empty small">No hormones yet.</span>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => window.print()}
              disabled={sections.length === 0}
            >
              <Printer size={16} /> Print / Save as PDF
            </button>
          </div>
        </section>
      )}

      {!loading && sections.length > 0 && (
        <article className="report-paper">
          <header className="report-paper-head">
            <h1>Medication & Lab Report</h1>
            <p>
              {from} → {to} · Generated {toDateString(new Date())}
            </p>
          </header>

          {sections.map(({ hormone, results }) => {
            const range = parseRange(hormone.normalRange);
            const chartData = results
              .filter((r) => r.value !== null)
              .map((r) => ({ date: r.date, value: r.value as number }));
            return (
              <section key={hormone._id} className="report-section">
                <h2>{hormone.name}</h2>
                <p className="report-meta">
                  {hormone.unit && <>Unit: {hormone.unit}</>}
                  {hormone.unit && hormone.normalRange && " · "}
                  {hormone.normalRange && <>Normal range: {hormone.normalRange}</>}
                </p>

                {chartData.length > 0 ? (
                  <div className="report-chart">
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(d) => d.slice(5)}
                        />
                        <YAxis tick={{ fontSize: 11 }} />
                        {range && (
                          <ReferenceArea
                            y1={range[0]}
                            y2={range[1]}
                            fill="#87a96b"
                            fillOpacity={0.15}
                          />
                        )}
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#1976d2"
                          strokeWidth={2}
                          dot={{ fill: "#1976d2", r: 3 }}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="report-empty">No numeric results in this date range.</p>
                )}

                {results.length > 0 && (
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Value</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => {
                        const out =
                          r.value !== null && range && (r.value < range[0] || r.value > range[1]);
                        return (
                          <tr key={r._id}>
                            <td>{r.date}</td>
                            <td className={out ? "out" : ""}>
                              {r.value === null ? "—" : `${r.value}${hormone.unit ? " " + hormone.unit : ""}`}
                            </td>
                            <td>{r.notes ?? ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </section>
            );
          })}
        </article>
      )}
    </div>
  );
}
