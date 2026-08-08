import { Loader2, AlertTriangle } from "lucide-react";

export default function ConfirmDialog({ title, message, confirmLabel = "Confirm", danger = true, busy, onConfirm, onCancel }) {
  return (
    <div className="adm-modal-overlay" onClick={onCancel} role="presentation">
      <div className="adm-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="adm-modal-header">
          <h2 className="adm-modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={16} color={danger ? "#f87171" : "#a78bfa"} />
            {title}
          </h2>
        </div>
        <p className="adm-confirm-text">{message}</p>
        <div className="adm-modal-footer">
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`adm-btn ${danger ? "adm-btn--danger" : "adm-btn--primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
