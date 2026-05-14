"use client";

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  FlaskConical,
  Pencil,
  Plus,
  Settings as SettingsIcon,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Hormone, LabResult } from "@/lib/types";
import ConfirmDialog from "@/components/ConfirmDialog";

type ResultFormState = {
  date: string;
  value: string;
  notes: string;
  imageUrls: string[];
};

type Viewer = { urls: string[]; index: number } | null;

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

export default function Labs() {
  const [hormones, setHormones] = useState<Hormone[]>([]);
  const [results, setResults] = useState<LabResult[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [resultModal, setResultModal] = useState<
    | { mode: "add"; form: ResultFormState }
    | { mode: "edit"; id: string; form: ResultFormState }
    | null
  >(null);

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [viewer, setViewer] = useState<Viewer>(null);
  const [confirmDel, setConfirmDel] = useState<{ id: string; date: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/hormones", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { hormones: Hormone[] };
        setHormones(data.hormones);
        if (data.hormones.length > 0) setActiveId(data.hormones[0]._id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load hormones");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeId) {
      setResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/results?hormoneId=${activeId}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { results: LabResult[] };
        if (!cancelled) setResults(data.results);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load results");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => {
    if (!viewer) return;
    function onKey(e: KeyboardEvent) {
      if (!viewer) return;
      if (e.key === "Escape") setViewer(null);
      if (e.key === "ArrowRight") {
        setViewer((v) =>
          v ? { ...v, index: (v.index + 1) % v.urls.length } : v
        );
      }
      if (e.key === "ArrowLeft") {
        setViewer((v) =>
          v ? { ...v, index: (v.index - 1 + v.urls.length) % v.urls.length } : v
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer]);

  const activeHormone = useMemo(
    () => hormones.find((h) => h._id === activeId) ?? null,
    [hormones, activeId]
  );

  const range = useMemo(
    () => (activeHormone ? parseRange(activeHormone.normalRange) : null),
    [activeHormone]
  );

  async function saveResult() {
    if (!resultModal || !activeId) return;
    const form = resultModal.form;
    if (!form.date) {
      setError("Date is required");
      return;
    }

    try {
      if (resultModal.mode === "add") {
        const res = await fetch("/api/results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hormoneId: activeId,
            date: form.date,
            value: form.value,
            notes: form.notes,
            imageUrls: form.imageUrls,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { result: LabResult };
        setResults((prev) =>
          [data.result, ...prev].sort((a, b) => b.date.localeCompare(a.date))
        );
      } else {
        const res = await fetch(`/api/results/${resultModal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: form.date,
            value: form.value,
            notes: form.notes,
            imageUrls: form.imageUrls,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setResults((prev) =>
          prev
            .map((r) =>
              r._id === resultModal.id
                ? {
                    ...r,
                    date: form.date,
                    value: form.value === "" ? null : Number(form.value),
                    notes: form.notes.trim() || null,
                    imageUrls: form.imageUrls,
                  }
                : r
            )
            .sort((a, b) => b.date.localeCompare(a.date))
        );
      }
      setResultModal(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function performDelete(id: string) {
    try {
      const res = await fetch(`/api/results/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResults((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setConfirmDel(null);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !resultModal) return;
    setUploading(true);
    setError(null);
    const uploaded: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(err?.error ?? `Upload failed (${res.status})`);
        }
        const data = (await res.json()) as { url: string };
        uploaded.push(data.url);
      }
      setResultModal((prev) =>
        prev
          ? { ...prev, form: { ...prev.form, imageUrls: [...prev.form.imageUrls, ...uploaded] } }
          : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeUploadedImage(url: string) {
    setResultModal((prev) =>
      prev
        ? {
            ...prev,
            form: { ...prev.form, imageUrls: prev.form.imageUrls.filter((u) => u !== url) },
          }
        : prev
    );
  }

  const viewerCurrent = viewer ? viewer.urls[viewer.index] : null;

  return (
    <div className="labs">
      <header className="labs-header">
        <h2>
          <FlaskConical size={22} strokeWidth={2.2} /> Labs
        </h2>
        <p className="labs-sub">Track hormone results over time</p>
      </header>

      {error && <p className="labs-error">{error}</p>}

      {hormones.length > 0 && (
        <div className="hormone-tabs" role="tablist">
          {hormones.map((h) => (
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

      {loading && <p className="labs-empty">Loading…</p>}

      {!loading && hormones.length === 0 && (
        <div className="labs-empty">
          <p>No hormones yet.</p>
          <Link href="/settings" className="btn-primary">
            <SettingsIcon size={16} /> Add one in Settings
          </Link>
        </div>
      )}

      {activeHormone && (
        <>
          <div className="results-toolbar">
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                setResultModal({
                  mode: "add",
                  form: { date: todayIso(), value: "", notes: "", imageUrls: [] },
                })
              }
            >
              <Plus size={16} /> Add result
            </button>
          </div>

          <ul className="results-list">
            {results.length === 0 && (
              <li className="labs-empty small">No results for this hormone yet.</li>
            )}
            {results.map((r) => {
              const out =
                r.value !== null && range && (r.value < range[0] || r.value > range[1]);
              const hasFiles = r.imageUrls.length > 0;
              return (
                <li key={r._id} className="result-card">
                  <div className="result-top">
                    <div>
                      <div className="result-date">{r.date}</div>
                      {r.value !== null && (
                        <div className={`result-value${out ? " out-of-range" : ""}`}>
                          {r.value}
                          {activeHormone.unit ? ` ${activeHormone.unit}` : ""}
                        </div>
                      )}
                    </div>
                    <div className="result-actions">
                      {hasFiles && (
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`View ${r.imageUrls.length} attachment${r.imageUrls.length > 1 ? "s" : ""}`}
                          onClick={() => setViewer({ urls: r.imageUrls, index: 0 })}
                        >
                          <Eye size={14} />
                          {r.imageUrls.length > 1 && (
                            <span className="action-badge">{r.imageUrls.length}</span>
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="Edit result"
                        onClick={() =>
                          setResultModal({
                            mode: "edit",
                            id: r._id,
                            form: {
                              date: r.date,
                              value: r.value === null ? "" : String(r.value),
                              notes: r.notes ?? "",
                              imageUrls: r.imageUrls,
                            },
                          })
                        }
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        aria-label="Delete result"
                        onClick={() => setConfirmDel({ id: r._id, date: r.date })}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {r.notes && <p className="result-notes">{r.notes}</p>}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {resultModal && (
        <div className="modal-backdrop" onClick={() => setResultModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{resultModal.mode === "add" ? "Add result" : "Edit result"}</h3>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close"
                onClick={() => setResultModal(null)}
              >
                <X size={16} />
              </button>
            </div>
            <label className="field">
              <span>Date *</span>
              <input
                type="date"
                value={resultModal.form.date}
                onChange={(e) =>
                  setResultModal({
                    ...resultModal,
                    form: { ...resultModal.form, date: e.target.value },
                  })
                }
              />
            </label>
            <label className="field">
              <span>Value</span>
              <input
                type="number"
                step="any"
                value={resultModal.form.value}
                placeholder={activeHormone?.unit || "e.g. 540"}
                onChange={(e) =>
                  setResultModal({
                    ...resultModal,
                    form: { ...resultModal.form, value: e.target.value },
                  })
                }
              />
            </label>
            <label className="field">
              <span>Notes</span>
              <textarea
                rows={3}
                value={resultModal.form.notes}
                onChange={(e) =>
                  setResultModal({
                    ...resultModal,
                    form: { ...resultModal.form, notes: e.target.value },
                  })
                }
              />
            </label>

            <div className="field">
              <span>Images / PDFs</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                disabled={uploading}
              />
              {uploading && <p className="upload-status">Uploading…</p>}
              {resultModal.form.imageUrls.length > 0 && (
                <div className="upload-preview">
                  {resultModal.form.imageUrls.map((url) => (
                    <div key={url} className="upload-thumb">
                      {isPdf(url) ? (
                        <span className="pdf-thumb">
                          <FileText size={18} /> PDF
                        </span>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt="upload" />
                      )}
                      <button
                        type="button"
                        className="upload-remove"
                        aria-label="Remove"
                        onClick={() => removeUploadedImage(url)}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setResultModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={uploading}
                onClick={saveResult}
              >
                <Upload size={14} /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {viewer && viewerCurrent && (
        <div className="image-viewer" onClick={() => setViewer(null)}>
          <button
            type="button"
            className="image-viewer-close"
            aria-label="Close"
            onClick={() => setViewer(null)}
          >
            <X size={24} />
          </button>

          {viewer.urls.length > 1 && (
            <>
              <button
                type="button"
                className="image-viewer-nav prev"
                aria-label="Previous"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewer((v) =>
                    v ? { ...v, index: (v.index - 1 + v.urls.length) % v.urls.length } : v
                  );
                }}
              >
                <ChevronLeft size={28} />
              </button>
              <button
                type="button"
                className="image-viewer-nav next"
                aria-label="Next"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewer((v) =>
                    v ? { ...v, index: (v.index + 1) % v.urls.length } : v
                  );
                }}
              >
                <ChevronRight size={28} />
              </button>
              <div className="image-viewer-counter" onClick={(e) => e.stopPropagation()}>
                {viewer.index + 1} / {viewer.urls.length}
              </div>
            </>
          )}

          {isPdf(viewerCurrent) ? (
            <div className="image-viewer-pdf" onClick={(e) => e.stopPropagation()}>
              <FileText size={56} />
              <a
                href={viewerCurrent}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Open PDF in new tab
              </a>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={viewerCurrent}
              alt="result"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}

      {confirmDel && (
        <ConfirmDialog
          title="Delete result?"
          message={`This will permanently delete the result from ${confirmDel.date}.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => performDelete(confirmDel.id)}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}
