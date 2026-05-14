"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

type Props = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm]);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal modal-confirm"
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close"
            onClick={onCancel}
          >
            <X size={16} />
          </button>
        </div>
        {message && <p className="confirm-message">{message}</p>}
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn-primary${danger ? " danger" : ""}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
