"use client";

import { Download, Share, Plus, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "install_prompt_dismissed";

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPad on iOS 13+ reports as Mac — detect via touch points.
  const iPadOS =
    /Macintosh/.test(ua) &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || iPadOS;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const navStandalone = (window.navigator as Navigator & { standalone?: boolean })
    .standalone;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    navStandalone === true
  );
}

export default function InstallPrompt() {
  const pathname = usePathname();
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [iosVisible, setIosVisible] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    if (isStandalone()) return;

    if (isIos()) {
      setIosVisible(true);
      setHidden(false);
      return;
    }

    function onPrompt(e: Event) {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setHidden(false);
    }
    function onInstalled() {
      setHidden(true);
      setEvt(null);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!evt) return;
    await evt.prompt();
    const choice = await evt.userChoice;
    if (choice.outcome === "accepted") setHidden(true);
  }

  function dismiss() {
    setHidden(true);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  if (pathname?.startsWith("/share/")) return null;
  if (pathname === "/login") return null;
  if (hidden) return null;
  if (!iosVisible && !evt) return null;

  if (iosVisible) {
    return (
      <div className="install-banner">
        <Download size={18} />
        <div className="install-text">
          <strong>Install Medication Tracker</strong>
          <span className="install-ios-hint">
            Tap <Share size={13} aria-label="Share" /> then{" "}
            <Plus size={13} aria-label="Add" /> Add to Home Screen
          </span>
        </div>
        <button
          type="button"
          className="install-close"
          aria-label="Dismiss"
          onClick={dismiss}
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="install-banner">
      <Download size={18} />
      <div className="install-text">
        <strong>Install Medication Tracker</strong>
        <span>Add to your home screen for quick access.</span>
      </div>
      <button type="button" className="btn-primary" onClick={install}>
        Install
      </button>
      <button
        type="button"
        className="install-close"
        aria-label="Dismiss"
        onClick={dismiss}
      >
        <X size={16} />
      </button>
    </div>
  );
}
