"use client";

import { Bell, BellOff, Send } from "lucide-react";
import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type Status = "loading" | "unsupported" | "off" | "on" | "denied";

type Prefs = {
  preferredHour: number;
  eveningHour: number | null;
  timezone: string;
};

const DEFAULT_PREFS: Prefs = {
  preferredHour: 9,
  eveningHour: null,
  timezone:
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      : "UTC",
};

export default function NotificationToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [eveningEnabled, setEveningEnabled] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  useEffect(() => {
    (async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        if (!reg) {
          setStatus("off");
          return;
        }
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          setSubscription(sub);
          setStatus("on");
          await loadPrefs(sub.endpoint);
        } else {
          setStatus("off");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to check subscription");
        setStatus("off");
      }
    })();
  }, []);

  async function loadPrefs(endpoint: string) {
    try {
      const res = await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`);
      if (!res.ok) return;
      const data = (await res.json()) as Partial<Prefs>;
      setPrefs({
        preferredHour:
          typeof data.preferredHour === "number" ? data.preferredHour : DEFAULT_PREFS.preferredHour,
        eveningHour: typeof data.eveningHour === "number" ? data.eveningHour : null,
        timezone:
          typeof data.timezone === "string" && data.timezone.length > 0
            ? data.timezone
            : DEFAULT_PREFS.timezone,
      });
      setEveningEnabled(typeof data.eveningHour === "number");
    } catch {
      /* keep defaults */
    }
  }

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }

      const reg =
        (await navigator.serviceWorker.getRegistration("/sw.js")) ??
        (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;

      const vapidRes = await fetch("/api/push/vapid");
      if (!vapidRes.ok) {
        const err = (await vapidRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? `VAPID fetch failed (${vapidRes.status})`);
      }
      const { publicKey } = (await vapidRes.json()) as { publicKey: string };

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sub.toJSON(),
          preferredHour: DEFAULT_PREFS.preferredHour,
          eveningHour: null,
          timezone: tz,
        }),
      });
      if (!saveRes.ok) throw new Error(`Save subscription failed (${saveRes.status})`);

      setPrefs({ ...DEFAULT_PREFS, timezone: tz });
      setSubscription(sub);
      setStatus("on");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enable");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSubscription(null);
      setStatus("off");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    if (!subscription) return;
    setTestStatus("Sending…");
    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error ?? `Test failed (${res.status})`);
      }
      setTestStatus("Sent — check for the notification.");
      setTimeout(() => setTestStatus(null), 4000);
    } catch (err) {
      setTestStatus(err instanceof Error ? err.message : "Test failed");
    }
  }

  async function savePrefs(next: Prefs, eveningOn: boolean) {
    if (!subscription) return;
    setPrefsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/push/subscribe", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          preferredHour: next.preferredHour,
          eveningHour: eveningOn ? next.eveningHour ?? 19 : null,
          timezone: next.timezone,
        }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setPrefsSaving(false);
    }
  }

  return (
    <section className="settings-section">
      <div className="settings-section-head">
        <h3>Medication reminders</h3>
      </div>
      <p className="labs-sub">
        Get a push notification on medication days at your preferred time, only if you haven&apos;t
        marked today as taken yet.
      </p>

      {error && <p className="labs-error">{error}</p>}

      {status === "loading" && <p className="labs-empty small">Checking…</p>}

      {status === "unsupported" && (
        <p className="labs-empty small">
          This browser doesn&apos;t support web push. On iOS, install the app to your home screen
          first.
        </p>
      )}

      {status === "denied" && (
        <p className="labs-empty small">
          Notifications are blocked. Enable them in your browser settings for this site, then
          refresh.
        </p>
      )}

      {status === "off" && (
        <button type="button" className="btn-primary" onClick={enable} disabled={busy}>
          <Bell size={16} /> {busy ? "Enabling…" : "Enable reminders"}
        </button>
      )}

      {status === "on" && (
        <>
          <div className="notif-actions">
            <button type="button" className="btn-ghost" onClick={disable} disabled={busy}>
              <BellOff size={16} /> {busy ? "Disabling…" : "Disable"}
            </button>
            <button type="button" className="btn-primary" onClick={sendTest}>
              <Send size={14} /> Send test
            </button>
            {testStatus && <span className="notif-status">{testStatus}</span>}
          </div>

          <div className="notif-prefs">
            <label className="field">
              <span>Morning reminder time</span>
              <select
                value={prefs.preferredHour}
                onChange={(e) => {
                  const next = { ...prefs, preferredHour: Number(e.target.value) };
                  setPrefs(next);
                  savePrefs(next, eveningEnabled);
                }}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>

            <label className="field notif-evening-toggle">
              <input
                type="checkbox"
                checked={eveningEnabled}
                onChange={(e) => {
                  setEveningEnabled(e.target.checked);
                  savePrefs(prefs, e.target.checked);
                }}
              />
              <span>Send an evening nudge if not taken</span>
            </label>

            {eveningEnabled && (
              <label className="field">
                <span>Evening nudge time</span>
                <select
                  value={prefs.eveningHour ?? 19}
                  onChange={(e) => {
                    const next = { ...prefs, eveningHour: Number(e.target.value) };
                    setPrefs(next);
                    savePrefs(next, true);
                  }}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </label>
            )}

            <p className="labs-sub notif-tz">
              Timezone: {prefs.timezone}
              {prefsSaving && " · saving…"}
              {prefsSaved && " · saved ✓"}
            </p>
          </div>
        </>
      )}
    </section>
  );
}
