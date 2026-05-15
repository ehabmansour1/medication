"use client";

import { Fingerprint, Lock, LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/biometric/available", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { available: boolean };
          if (data.available && typeof window !== "undefined" && window.PublicKeyCredential) {
            setBioAvailable(true);
          }
        }
      } catch {
        /* offline-ok */
      }
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.status === 401) {
        setError("Wrong username or password.");
        setPassword("");
        return;
      }
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? `HTTP ${res.status}`);
      }
      router.replace(redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function loginWithBio() {
    setBioBusy(true);
    setError(null);
    try {
      const beginRes = await fetch("/api/auth/biometric/login/begin", {
        method: "POST",
      });
      if (!beginRes.ok) {
        const err = (await beginRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? `Begin failed (${beginRes.status})`);
      }
      const options = await beginRes.json();
      const assertion = await startAuthentication({ optionsJSON: options });
      const finishRes = await fetch("/api/auth/biometric/login/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assertion),
      });
      if (!finishRes.ok) {
        const err = (await finishRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? `Verify failed (${finishRes.status})`);
      }
      router.replace(redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Biometric sign-in failed");
    } finally {
      setBioBusy(false);
    }
  }

  return (
    <div className="app-lock">
      <form className="app-lock-card" onSubmit={submit}>
        <Lock size={32} strokeWidth={2.2} />
        <h2>Sign in</h2>
        <p className="labs-sub">Required to access the app.</p>

        <label className="field" style={{ width: "100%" }}>
          <span>Username</span>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>

        <label className="field" style={{ width: "100%" }}>
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className="pin-error">{error}</p>}

        <button
          type="submit"
          className="btn-primary"
          disabled={busy || !username || !password}
          style={{ width: "100%", justifyContent: "center" }}
        >
          <LogIn size={16} /> {busy ? "Signing in…" : "Sign in"}
        </button>

        {bioAvailable && (
          <button
            type="button"
            className="btn-ghost pin-biometric"
            onClick={loginWithBio}
            disabled={bioBusy}
          >
            <Fingerprint size={18} /> {bioBusy ? "Verifying…" : "Sign in with biometric"}
          </button>
        )}
      </form>
    </div>
  );
}
