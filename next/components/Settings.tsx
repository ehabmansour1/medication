"use client";

import { Pencil, Plus, Settings as SettingsIcon, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Hormone } from "@/lib/types";
import ConfirmDialog from "@/components/ConfirmDialog";
import NotificationToggle from "@/components/NotificationToggle";

type HormoneForm = { name: string; unit: string; normalRange: string };
type Modal =
  | { mode: "add"; form: HormoneForm }
  | { mode: "edit"; id: string; form: HormoneForm }
  | null;

const emptyForm: HormoneForm = { name: "", unit: "", normalRange: "" };

type TabId = "hormones" | "goal" | "notifications";

const TABS: { id: TabId; label: string }[] = [
  { id: "hormones", label: "Hormones" },
  { id: "goal", label: "Goal" },
  { id: "notifications", label: "Reminders" },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>("hormones");

  return (
    <div className="labs">
      <header className="labs-header">
        <h2>
          <SettingsIcon size={22} strokeWidth={2.2} /> Settings
        </h2>
        <p className="labs-sub">Manage your data</p>
      </header>

      <div className="hormone-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`hormone-tab${activeTab === tab.id ? " active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "hormones" && <HormonesSection />}
      {activeTab === "goal" && <GoalSection />}
    </div>
  );
}

const GOAL_KEY = "medication_goal";
const DEFAULT_GOAL = 80;

function GoalSection() {
  const [goal, setGoal] = useState<number>(DEFAULT_GOAL);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(GOAL_KEY);
    const parsed = raw ? Number(raw) : NaN;
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) setGoal(parsed);
  }, []);

  function save(value: number) {
    setGoal(value);
    localStorage.setItem(GOAL_KEY, String(value));
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  return (
    <section className="settings-section">
      <div className="settings-section-head">
        <h3>Adherence goal</h3>
        {saved && <span className="goal-saved">Saved</span>}
      </div>
      <p className="labs-sub">
        Your target % of medication days taken. Shown as a progress bar on the Calendar.
      </p>
      <div className="goal-input-row">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={goal}
          onChange={(e) => save(Number(e.target.value))}
        />
        <span className="goal-value">{goal}%</span>
      </div>
    </section>
  );
}

function HormonesSection() {
  const [hormones, setHormones] = useState<Hormone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [confirmDel, setConfirmDel] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/hormones", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { hormones: Hormone[] };
        setHormones(data.hormones);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    if (!modal) return;
    if (!modal.form.name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      if (modal.mode === "add") {
        const res = await fetch("/api/hormones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(modal.form),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { hormone: Hormone };
        setHormones((prev) => [...prev, data.hormone]);
      } else {
        const res = await fetch(`/api/hormones/${modal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(modal.form),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setHormones((prev) =>
          prev.map((h) => (h._id === modal.id ? { ...h, ...modal.form } : h))
        );
      }
      setModal(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function performDelete(id: string) {
    try {
      const res = await fetch(`/api/hormones/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setHormones((prev) => prev.filter((h) => h._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setConfirmDel(null);
    }
  }

  return (
    <>
      {error && <p className="labs-error">{error}</p>}

      <section className="settings-section">
        <div className="settings-section-head">
          <h3>Hormones</h3>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setModal({ mode: "add", form: emptyForm })}
          >
            <Plus size={16} /> Add
          </button>
        </div>

        {loading && <p className="labs-empty small">Loading…</p>}

        {!loading && hormones.length === 0 && (
          <p className="labs-empty small">No hormones yet. Add one to start tracking.</p>
        )}

        {hormones.length > 0 && (
          <ul className="hormone-list">
            {hormones.map((h) => (
              <li key={h._id} className="hormone-row">
                <div className="hormone-row-main">
                  <strong>{h.name}</strong>
                  <div className="hormone-meta">
                    {h.unit && <span>Unit: {h.unit}</span>}
                    {h.normalRange && <span>Normal: {h.normalRange}</span>}
                  </div>
                </div>
                <div className="hormone-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Edit"
                    onClick={() =>
                      setModal({
                        mode: "edit",
                        id: h._id,
                        form: { name: h.name, unit: h.unit, normalRange: h.normalRange },
                      })
                    }
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    aria-label="Delete"
                    onClick={() => setConfirmDel({ id: h._id, name: h.name })}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{modal.mode === "add" ? "Add hormone" : "Edit hormone"}</h3>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close"
                onClick={() => setModal(null)}
              >
                <X size={16} />
              </button>
            </div>
            <label className="field">
              <span>Name *</span>
              <input
                type="text"
                value={modal.form.name}
                placeholder="Testosterone"
                onChange={(e) =>
                  setModal({ ...modal, form: { ...modal.form, name: e.target.value } })
                }
              />
            </label>
            <label className="field">
              <span>Unit</span>
              <input
                type="text"
                value={modal.form.unit}
                placeholder="ng/dL"
                onChange={(e) =>
                  setModal({ ...modal, form: { ...modal.form, unit: e.target.value } })
                }
              />
            </label>
            <label className="field">
              <span>Normal range</span>
              <input
                type="text"
                value={modal.form.normalRange}
                placeholder="264-916"
                onChange={(e) =>
                  setModal({
                    ...modal,
                    form: { ...modal.form, normalRange: e.target.value },
                  })
                }
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={save}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDel && (
        <ConfirmDialog
          title="Delete hormone?"
          message={`This will permanently delete "${confirmDel.name}" and all its lab results.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => performDelete(confirmDel.id)}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </>
  );
}
