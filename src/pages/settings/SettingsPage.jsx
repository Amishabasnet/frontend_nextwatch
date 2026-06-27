import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Clapperboard,
  LogOut,
  Shield,
  Trash2,
  Clock,
  UserX,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronRight,
  ArrowLeft,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import api, { putConsent, deleteHistory } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import "./SettingsPage.css";

function getInitials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

function ConfirmModal({
  variant = "danger",        // "danger" | "warning"
  icon: Icon = AlertTriangle,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  requirePhrase,             // string – user must type this to unlock confirm
  loading = false,
  onConfirm,
  onCancel,
}) {
  const [phrase, setPhrase] = useState("");
  const unlocked = requirePhrase ? phrase.trim() === requirePhrase : true;

  return (
    <div
      className="st-modal-backdrop"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="st-modal-title"
    >
      <div className="st-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="st-modal-close"
          onClick={onCancel}
          aria-label="Close"
        >
          <X size={15} />
        </button>

        <div className={`st-modal-icon-wrap st-modal-icon-wrap--${variant}`}>
          <Icon size={24} />
        </div>

        <h2 className="st-modal-title" id="st-modal-title">
          {title}
        </h2>
        <p className="st-modal-body">{body}</p>

        {requirePhrase && (
          <div className="st-modal-phrase-wrap">
            <label className="st-modal-phrase-label">
              Type&nbsp;<strong>{requirePhrase}</strong>&nbsp;to confirm
            </label>
            <input
              type="text"
              className="st-modal-phrase-input"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={requirePhrase}
              autoFocus
              autoComplete="off"
            />
          </div>
        )}

        <div className="st-modal-actions">
          <button
            type="button"
            className="st-modal-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`st-modal-confirm st-modal-confirm--${variant}`}
            onClick={onConfirm}
            disabled={!unlocked || loading}
          >
            {loading ? (
              <Loader2 size={15} className="st-spin" />
            ) : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ id, icon: Icon, iconAccent, title, subtitle, children }) {
  return (
    <section className="st-section" id={id}>
      <div className="st-section-header">
        <span className="st-section-icon" style={{ background: iconAccent }}>
          <Icon size={15} />
        </span>
        <div>
          <h2 className="st-section-title">{title}</h2>
          {subtitle && <p className="st-section-sub">{subtitle}</p>}
        </div>
      </div>
      <div className="st-section-body">{children}</div>
    </section>
  );
}

function ToggleRow({ label, description, checked, onChange, disabled }) {
  return (
    <label className={`st-toggle-row ${disabled ? "st-toggle-row--disabled" : ""}`}>
      <div className="st-toggle-text">
        <span className="st-toggle-label">{label}</span>
        {description && (
          <span className="st-toggle-desc">{description}</span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`st-toggle-btn ${checked ? "st-toggle-btn--on" : ""}`}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
      >
        {checked ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
      </button>
    </label>
  );
}

export default function SettingsPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const userId = user?._id ?? user?.id;
  const displayName =
    user?.name ?? user?.username ?? user?.email?.split("@")[0] ?? "You";

  const [consent, setConsent] = useState({
    analytics: false,
    personalization: false,
    thirdParty: false,
  });
  const [consentLoading, setConsentLoading] = useState(true);
  const [consentSaving, setConsentSaving] = useState(false);
  const [consentDirty, setConsentDirty] = useState(false);

  const [showClearModal, setShowClearModal]   = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const fetchConsent = useCallback(async () => {
    if (!userId) return;
    setConsentLoading(true);
    try {
      const res = await api.get(`/consent/${userId}`);
      const d = res.data ?? {};
      setConsent({
        analytics:       d.analytics       ?? d.analyticsConsent       ?? false,
        personalization: d.personalization ?? d.personalizationConsent ?? false,
        thirdParty:      d.thirdParty      ?? d.thirdPartyConsent      ?? false,
      });
    } catch {
      toast.error("Couldn't load your privacy settings.", { theme: "dark" });
    } finally {
      setConsentLoading(false);
    }
  }, [userId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchConsent(); }, [fetchConsent]);

  const handleSaveConsent = async () => {
    if (!userId) return;
    setConsentSaving(true);
    try {
      await putConsent(userId, consent);
      setConsentDirty(false);
      toast.success("Privacy preferences saved.", { theme: "dark" });
    } catch {
      toast.error("Couldn't save privacy preferences.", { theme: "dark" });
    } finally {
      setConsentSaving(false);
    }
  };

  const handleToggleConsent = (key, val) => {
    setConsent((prev) => ({ ...prev, [key]: val }));
    setConsentDirty(true);
  };

  const handleClearHistory = async () => {
    if (!userId) return;
    setClearingHistory(true);
    try {
      await deleteHistory(userId);
      toast.success("Viewing history cleared.", { theme: "dark" });
      setShowClearModal(false);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ?? "Couldn't clear history. Try again.",
        { theme: "dark" }
      );
    } finally {
      setClearingHistory(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId) return;
    setDeletingAccount(true);
    try {
      await api.delete(`/users/${userId}`);
      toast.success("Account deleted. Goodbye!", { theme: "dark" });
      // wipe token + user state, then redirect
      localStorage.removeItem("nextwatch_token");
      logout();
      navigate("/");
    } catch (err) {
      toast.error(
        err?.response?.data?.message ?? "Couldn't delete your account. Try again.",
        { theme: "dark" }
      );
      setDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast("You've been signed out.", { icon: "👋", theme: "dark" });
    navigate("/");
  };

  if (authLoading) {
    return (
      <div className="st-root">
        <div className="st-glow st-glow-tl" />
        <div className="st-glow st-glow-br" />
        <div className="st-center-loader">
          <Loader2 size={28} className="st-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="st-root">
      {/* glows */}
      <div className="st-glow st-glow-tl" />
      <div className="st-glow st-glow-br" />

      {/* ── nav ── */}
      <nav className="st-nav">
        <Link to="/" className="st-nav-logo">
          <Clapperboard size={20} className="st-logo-icon" />
          <span className="st-logo-text">
            Next<span className="st-logo-accent">Watch</span>
          </span>
        </Link>
        <div className="st-nav-right">
          <Link to="/profile" className="st-nav-link st-nav-link--ghost">
            Profile
          </Link>
          <div className="st-nav-user">
            <div className="st-avatar st-avatar--nav">
              {getInitials(displayName)}
            </div>
            <span className="st-nav-username">{displayName}</span>
          </div>
          <button
            type="button"
            className="st-nav-signout"
            onClick={handleLogout}
            title="Sign out"
          >
            <LogOut size={14} />
            <span className="st-nav-signout-label">Sign out</span>
          </button>
        </div>
      </nav>

      {/* ── main ── */}
      <main className="st-main">

        {/* page header */}
        <div className="st-page-header">
          <Link to="/profile" className="st-back-btn">
            <ArrowLeft size={14} /> Back to Profile
          </Link>
          <h1 className="st-page-title">Settings</h1>
          <p className="st-page-sub">
            Manage your privacy, data, and account.
          </p>
        </div>

        {/* ── side nav + content layout ── */}
        <div className="st-layout">

          {/* sidebar nav */}
          <aside className="st-sidebar">
            <nav className="st-side-nav">
              {[
                { href: "#privacy",  icon: Shield,  label: "Privacy" },
                { href: "#history",  icon: Clock,   label: "History" },
                { href: "#account",  icon: UserX,   label: "Account" },
                { href: "#logout",   icon: LogOut,  label: "Sign out" },
              ].map(({ href, icon: Icon, label }) => (
                <a key={href} href={href} className="st-side-link">
                  <Icon size={14} />
                  {label}
                  <ChevronRight size={12} className="st-side-arrow" />
                </a>
              ))}
            </nav>
          </aside>

          {/* sections */}
          <div className="st-content">

            {/* ── privacy & consent ── */}
            <Section
              id="privacy"
              icon={Shield}
              iconAccent="rgba(124,58,237,0.22)"
              title="Privacy & Consent"
              subtitle="Control how NextWatch uses your data."
            >
              {consentLoading ? (
                <div className="st-skeleton-stack">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="st-skel-row">
                      <div>
                        <span className="st-skel st-skel--label" />
                        <span className="st-skel st-skel--desc" />
                      </div>
                      <span className="st-skel st-skel--toggle" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <ToggleRow
                    label="Analytics"
                    description="Help us understand how you use NextWatch so we can improve it."
                    checked={consent.analytics}
                    onChange={(v) => handleToggleConsent("analytics", v)}
                  />
                  <ToggleRow
                    label="Personalization"
                    description="Let us tailor recommendations based on your watch history and ratings."
                    checked={consent.personalization}
                    onChange={(v) => handleToggleConsent("personalization", v)}
                  />
                  <ToggleRow
                    label="Third-party sharing"
                    description="Allow sharing anonymised data with trusted content partners."
                    checked={consent.thirdParty}
                    onChange={(v) => handleToggleConsent("thirdParty", v)}
                  />

                  <div className="st-section-footer">
                    <button
                      type="button"
                      className="st-btn st-btn--primary"
                      onClick={handleSaveConsent}
                      disabled={!consentDirty || consentSaving}
                    >
                      {consentSaving ? (
                        <Loader2 size={14} className="st-spin" />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      {consentSaving ? "Saving…" : "Save preferences"}
                    </button>
                    {!consentDirty && !consentSaving && (
                      <span className="st-saved-hint">
                        <CheckCircle2 size={12} /> Up to date
                      </span>
                    )}
                  </div>
                </>
              )}
            </Section>

            {/* ── viewing history ── */}
            <Section
              id="history"
              icon={Clock}
              iconAccent="rgba(14,165,233,0.2)"
              title="Viewing History"
              subtitle="Your watch history powers recommendations. Clear it any time."
            >
              <div className="st-danger-row">
                <div className="st-danger-text">
                  <span className="st-danger-label">Clear all history</span>
                  <span className="st-danger-desc">
                    Permanently removes every title from your viewing history.
                    This won't affect your ratings or watchlist.
                  </span>
                </div>
                <button
                  type="button"
                  className="st-btn st-btn--danger-outline"
                  onClick={() => setShowClearModal(true)}
                >
                  <Trash2 size={14} />
                  Clear history
                </button>
              </div>
            </Section>

            {/* ── account ── */}
            <Section
              id="account"
              icon={UserX}
              iconAccent="rgba(239,68,68,0.15)"
              title="Account"
              subtitle="Irreversible actions — please read carefully."
            >
              <div className="st-danger-zone">
                <div className="st-danger-zone-label">Danger zone</div>
                <div className="st-danger-row">
                  <div className="st-danger-text">
                    <span className="st-danger-label">Delete account</span>
                    <span className="st-danger-desc">
                      Permanently deletes your NextWatch account, all ratings,
                      preferences, and history. This cannot be undone.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="st-btn st-btn--danger"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <UserX size={14} />
                    Delete account
                  </button>
                </div>
              </div>
            </Section>

            {/* ── logout ── */}
            <Section
              id="logout"
              icon={LogOut}
              iconAccent="rgba(255,255,255,0.06)"
              title="Sign out"
              subtitle="Sign out of NextWatch on this device."
            >
              <div className="st-logout-row">
                <div className="st-danger-text">
                  <span className="st-danger-label">
                    Signed in as {user?.email ?? displayName}
                  </span>
                  <span className="st-danger-desc">
                    Your preferences and data will remain saved.
                  </span>
                </div>
                <button
                  type="button"
                  className="st-btn st-btn--ghost"
                  onClick={handleLogout}
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </Section>

          </div>
        </div>
      </main>

      {/* ── clear history modal ── */}
      {showClearModal && (
        <ConfirmModal
          variant="warning"
          icon={Clock}
          title="Clear viewing history?"
          body="All titles you've watched will be removed from your history. Your ratings and watchlist stay intact. This can't be undone."
          confirmLabel="Yes, clear history"
          loading={clearingHistory}
          onConfirm={handleClearHistory}
          onCancel={() => !clearingHistory && setShowClearModal(false)}
        />
      )}

      {/* ── delete account modal ── */}
      {showDeleteModal && (
        <ConfirmModal
          variant="danger"
          icon={UserX}
          title="Delete your account?"
          body="Your account, ratings, history, and preferences will be permanently deleted. This cannot be undone."
          confirmLabel="Delete my account"
          requirePhrase="DELETE"
          loading={deletingAccount}
          onConfirm={handleDeleteAccount}
          onCancel={() => !deletingAccount && setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}
