"use client";

import { Fingerprint, LogOut, Shield, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import ConfirmDialog from "@/components/ConfirmDialog";

type Credential = { credentialID: string; createdAt: string };

export default function SecuritySection() {
  const router = useRouter();
  const [creds, setCreds] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        Boolean(window.PublicKeyCredential && navigator.credentials)
    );
    void load();
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/auth/biometric/credentials", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { credentials: Credential[] };
      setCreds(data.credentials);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function enroll() {
    setBusy(true);
    setError(null);
    try {
      const beginRes = await fetch("/api/auth/biometric/register/begin", {
        method: "POST",
      });
      if (!beginRes.ok) {
        const err = (await beginRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? `Begin failed (${beginRes.status})`);
      }
      const options = await beginRes.json();
      const attestation = await startRegistration({ optionsJSON: options });
      const finishRes = await fetch("/api/auth/biometric/register/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attestation),
      });
      if (!finishRes.ok) {
        const err = (await finishRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? `Finish failed (${finishRes.status})`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeCred(credentialID: string) {
    try {
      const res = await fetch("/api/auth/biometric/credentials", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialID }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCreds((prev) => prev.filter((c) => c.credentialID !== credentialID));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setConfirmDel(null);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setLogoutOpen(false);
    }
  }

  return (
    <>
      <section className="settings-section">
        <div className="settings-section-head">
          <h3>
            <Fingerprint size={16} /> Biometric sign-in
          </h3>
        </div>
        <p className="labs-sub">
          Use Face ID / fingerprint instead of typing your password on this device.
        </p>

        {error && <p className="labs-error">{error}</p>}

        {!supported && (
          <p className="labs-empty small">
            This browser doesn&apos;t support biometric sign-in.
          </p>
        )}

        {supported && (
          <>
            <button type="button" className="btn-primary" onClick={enroll} disabled={busy}>
              <Fingerprint size={16} /> {busy ? "Setting up…" : "Add this device"}
            </button>

            {loading && <p className="labs-empty small">Loading…</p>}

            {!loading && creds.length > 0 && (
              <ul className="hormone-list" style={{ marginTop: 8 }}>
                {creds.map((c) => (
                  <li key={c.credentialID} className="hormone-row">
                    <div className="hormone-row-main">
                      <strong>Registered device</strong>
                      <span className="labs-sub">
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                      <code className="share-url">
                        {c.credentialID.slice(0, 16)}…
                      </code>
                    </div>
                    <div className="hormone-actions">
                      <button
                        type="button"
                        className="icon-btn danger"
                        aria-label="Remove"
                        onClick={() => setConfirmDel(c.credentialID)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section className="settings-section">
        <div className="settings-section-head">
          <h3>
            <Shield size={16} /> Session
          </h3>
        </div>
        <p className="labs-sub">
          You stay signed in until you log out. Tap below to end the current session on this
          device.
        </p>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setLogoutOpen(true)}
        >
          <LogOut size={16} /> Log out
        </button>
      </section>

      {confirmDel && (
        <ConfirmDialog
          title="Remove biometric?"
          message="You'll need to sign in with your password on this device next time."
          confirmLabel="Remove"
          danger
          onConfirm={() => removeCred(confirmDel)}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {logoutOpen && (
        <ConfirmDialog
          title="Log out?"
          message="You'll need to sign in again to access the app."
          confirmLabel="Log out"
          danger
          onConfirm={logout}
          onCancel={() => setLogoutOpen(false)}
        />
      )}
    </>
  );
}
