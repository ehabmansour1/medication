"use client";

import { Check, Copy, Link as LinkIcon, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

type ShareToken = {
  token: string;
  label: string | null;
  expiresAt: string | null;
  createdAt: string;
  expired: boolean;
};

export default function ShareSection() {
  const [tokens, setTokens] = useState<ShareToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<number | "">(30);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/share", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { tokens: ShareToken[] };
      setTokens(data.tokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function createLink() {
    setCreating(true);
    setError(null);
    try {
      const body: { label?: string; expiresInDays?: number } = {};
      if (label.trim()) body.label = label.trim();
      if (typeof expiresInDays === "number" && expiresInDays > 0) {
        body.expiresInDays = expiresInDays;
      }
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? `HTTP ${res.status}`);
      }
      setLabel("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(token: string) {
    try {
      const res = await fetch(`/api/share/${token}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTokens((prev) => prev.filter((t) => t.token !== token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke");
    } finally {
      setConfirmRevoke(null);
    }
  }

  function shareUrl(token: string) {
    if (typeof window === "undefined") return `/share/${token}`;
    return `${window.location.origin}/share/${token}`;
  }

  async function copyLink(token: string) {
    const url = shareUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(token);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      window.prompt("Copy this URL:", url);
    }
  }

  return (
    <section className="settings-section">
      <div className="settings-section-head">
        <h3>Doctor share links</h3>
      </div>
      <p className="labs-sub">
        Generate a read-only URL that shows all your lab results. Anyone with the link can view —
        no login required.
      </p>

      {error && <p className="labs-error">{error}</p>}

      <div className="share-create">
        <label className="field">
          <span>Label (optional)</span>
          <input
            type="text"
            value={label}
            placeholder="Dr. Khaled — Sep visit"
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Expires in</span>
          <select
            value={expiresInDays === "" ? "" : String(expiresInDays)}
            onChange={(e) =>
              setExpiresInDays(e.target.value === "" ? "" : Number(e.target.value))
            }
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="">Never</option>
          </select>
        </label>
        <button
          type="button"
          className="btn-primary share-create-btn"
          onClick={createLink}
          disabled={creating}
        >
          <Plus size={16} /> {creating ? "Creating…" : "Create link"}
        </button>
      </div>

      {loading && <p className="labs-empty small">Loading…</p>}

      {!loading && tokens.length === 0 && (
        <p className="labs-empty small">No share links yet.</p>
      )}

      {tokens.length > 0 && (
        <ul className="share-list">
          {tokens.map((t) => (
            <li
              key={t.token}
              className={`share-row${t.expired ? " expired" : ""}`}
            >
              <div className="share-row-main">
                <strong>
                  <LinkIcon size={14} /> {t.label || "Share link"}
                  {t.expired && <span className="share-expired"> · expired</span>}
                </strong>
                <code className="share-url">{shareUrl(t.token)}</code>
                <span className="labs-sub share-meta">
                  Created {new Date(t.createdAt).toLocaleDateString()}
                  {t.expiresAt &&
                    ` · ${t.expired ? "expired" : "expires"} ${new Date(
                      t.expiresAt
                    ).toLocaleDateString()}`}
                </span>
              </div>
              <div className="hormone-actions">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Copy link"
                  onClick={() => copyLink(t.token)}
                >
                  {copied === t.token ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <button
                  type="button"
                  className="icon-btn danger"
                  aria-label="Revoke"
                  onClick={() => setConfirmRevoke(t.token)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {confirmRevoke && (
        <ConfirmDialog
          title="Revoke share link?"
          message="Anyone who has this link will lose access immediately."
          confirmLabel="Revoke"
          danger
          onConfirm={() => revoke(confirmRevoke)}
          onCancel={() => setConfirmRevoke(null)}
        />
      )}
    </section>
  );
}
