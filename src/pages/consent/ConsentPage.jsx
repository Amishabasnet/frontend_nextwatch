import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Clapperboard,
  Shield,
  Smile,
  Tag,
  History,
  Star,
  MessageSquare,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Lock,
  Eye,
  AlertCircle,
  FileText,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { postConsent, getConsent, putConsent } from "../../services/api";
import "./ConsentPage.css";

const DATA_TYPES = [
  {
    id: "mood_selections",
    icon: Smile,
    label: "Mood Selections",
    description:
      "How you're feeling when you open the app — e.g. 'relaxed', 'excited', 'melancholic'. Used to surface films that match your current state.",
    color: "#fbbf24",
  },
  {
    id: "genre_preferences",
    icon: Tag,
    label: "Genre Preferences",
    description:
      "The genres you pick, skip, or linger on. Helps us weight your queue toward what you genuinely enjoy.",
    color: "#34d399",
  },
  {
    id: "viewing_history",
    icon: History,
    label: "Viewing History",
    description:
      "Films and shows you've watched, started, or abandoned. Prevents duplicate recommendations and spots patterns in your taste.",
    color: "#60a5fa",
  },
  {
    id: "ratings",
    icon: Star,
    label: "Ratings",
    description:
      "Star scores you give after watching. Your ratings calibrate the recommendation model to your personal taste, not global averages.",
    color: "#f97316",
  },
  {
    id: "written_feedback",
    icon: MessageSquare,
    label: "Written Feedback",
    description:
      "Any text you leave — micro-reviews or thumbs-up notes. Enriches your preference profile and improves future picks.",
    color: "#a78bfa",
  },
];

const PRIVACY_COMMITMENTS = [
  {
    icon: Lock,
    title: "Never sold",
    body: "Your data is never sold to advertisers, data brokers, or third parties.",
  },
  {
    icon: Eye,
    title: "Transparent use",
    body: "We use your data solely to power recommendations. You can see exactly why each film was suggested.",
  },
  {
    icon: Shield,
    title: "Encrypted at rest",
    body: "All personal data is AES-256 encrypted. You can export or permanently delete it any time from Settings.",
  },
];

export default function ConsentPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [consentChecked, setConsentChecked] = useState(false);
  const [pageStatus, setPageStatus] = useState("idle"); // idle | loading | submitting | error
  const [existingConsent, setExistingConsent] = useState(null); // null | object

  useEffect(() => {
    if (!user?.id) return;

    let didCancel = false;

    const fetchConsent = async () => {
      setPageStatus("loading");
      try {
        const { data } = await getConsent(user.id);
        if (didCancel) return;

        setExistingConsent(data);
        if (data?.consentGiven) setConsentChecked(true);
      } catch (err) {
        if (didCancel) return;
        if (err.response?.status !== 404) {
          toast.error("Couldn't load your privacy settings. Please try again.");
        }
      } finally {
        if (!didCancel) setPageStatus("idle");
      }
    };

    Promise.resolve().then(fetchConsent);

    return () => {
      didCancel = true;
    };
  }, [user?.id]);

  const handleContinue = async () => {
    if (!consentChecked) return;
    setPageStatus("submitting");

    const payload = {
      userId: user?.id ?? "guest",
      consentGiven: true,
      dataTypes: DATA_TYPES.map((d) => d.id),
      timestamp: new Date().toISOString(),
    };

    try {
      if (existingConsent) {
        await putConsent(payload.userId, {
          consentGiven: payload.consentGiven,
          dataTypes: payload.dataTypes,
          timestamp: payload.timestamp,
        });
        toast.success("Privacy preferences updated!");
      } else {
        // First-time submission
        await postConsent(payload);
        toast.success("Thanks for agreeing — let's personalise your experience!");
      }

      setTimeout(() => navigate("/preferences"), 900);
    } catch {
      setPageStatus("error");
      toast.error("Something went wrong. Please try again.");
    } finally {
      if (pageStatus !== "error") setPageStatus("idle");
    }
  };

  const isSubmitting = pageStatus === "submitting";
  const isLoading = pageStatus === "loading";

  return (
    <div className="consent-root">
      {/* Ambient glows */}
      <div className="consent-glow consent-glow-tl" />
      <div className="consent-glow consent-glow-br" />

      <nav className="consent-nav">
        <Link to="/" className="nav-logo">
          <Clapperboard size={20} strokeWidth={1.8} className="logo-icon" />
          <span className="logo-text">
            Next<span className="logo-accent">Watch</span>
          </span>
        </Link>
        <div className="nav-step-indicator">
          <span className="step-dot step-done" />
          <span className="step-line" />
          <span className="step-dot step-active" />
          <span className="step-line" />
          <span className="step-dot" />
        </div>
      </nav>

      <main className="consent-main">
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <div className="consent-card">
            {/* Header */}
            <div className="consent-header">
              <div className="consent-shield-wrap">
                <Shield size={28} strokeWidth={1.5} className="consent-shield-icon" />
              </div>
              <p className="consent-eyebrow">Before we begin</p>
              <h1 className="consent-title">Your Privacy & Data</h1>
              <p className="consent-subtitle">
                NextWatch learns your taste to recommend films you'll actually
                love. Here's exactly what data we use and why — no surprises.
              </p>
            </div>

            {/* Data types */}
            <section className="consent-section">
              <h2 className="consent-section-title">
                <FileText size={15} />
                Data we collect and use
              </h2>
              <div className="data-type-list">
                {DATA_TYPES.map(({ id, icon: Icon, label, description, color }) => (
                  <div key={id} className="data-type-item">
                    <div
                      className="data-type-icon"
                      style={{
                        background: `color-mix(in srgb, ${color} 14%, #1a1a24)`,
                        borderColor: `color-mix(in srgb, ${color} 28%, transparent)`,
                      }}
                    >
                      <Icon size={17} strokeWidth={1.8} style={{ color }} />
                    </div>
                    <div className="data-type-body">
                      <span className="data-type-label">{label}</span>
                      <p className="data-type-desc">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Privacy commitments */}
            <section className="consent-section">
              <h2 className="consent-section-title">
                <Lock size={15} />
                Our commitments to you
              </h2>
              <div className="commitment-grid">
                {PRIVACY_COMMITMENTS.map(({ icon: Icon, title, body }) => (
                  <div key={title} className="commitment-card">
                    <Icon size={18} strokeWidth={1.5} className="commitment-icon" />
                    <strong className="commitment-title">{title}</strong>
                    <p className="commitment-body">{body}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Divider */}
            <hr className="consent-divider" />

            {/* Checkbox */}
            <label
              className={`consent-checkbox-row ${consentChecked ? "is-checked" : ""}`}
              htmlFor="consent-cb"
            >
              <span className="checkbox-custom" aria-hidden="true">
                {consentChecked && <CheckCircle2 size={16} strokeWidth={2.5} />}
              </span>
              <input
                id="consent-cb"
                type="checkbox"
                className="checkbox-real"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                disabled={isSubmitting}
              />
              <span className="consent-checkbox-label">
                I understand and agree to NextWatch collecting and using the
                data described above to personalise my recommendations. I know I
                can withdraw consent or delete my data at any time from{" "}
                <Link to="/settings" className="consent-inline-link">
                  Settings
                </Link>
                .
              </span>
            </label>

            {/* Error state */}
            {pageStatus === "error" && (
              <div className="consent-error-banner" role="alert">
                <AlertCircle size={15} strokeWidth={2} />
                Submission failed. Check your connection and try again.
              </div>
            )}

            {/* CTA */}
            <button
              className="consent-continue-btn"
              onClick={handleContinue}
              disabled={!consentChecked || isSubmitting}
              aria-disabled={!consentChecked || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={17} className="spin" />
                  Saving…
                </>
              ) : (
                <>
                  Continue to Preferences
                  <ChevronRight size={17} />
                </>
              )}
            </button>

            {!consentChecked && (
              <p className="consent-hint">
                Please accept the data policy above to continue.
              </p>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="consent-footer">
        <Link to="/privacy-policy" className="footer-link">
          Full Privacy Policy
        </Link>
        <span className="footer-dot" />
        <Link to="/terms" className="footer-link">
          Terms of Service
        </Link>
        <span className="footer-dot" />
        <span className="footer-copy">© 2025 NextWatch</span>
      </footer>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="consent-card skeleton-card" aria-busy="true" aria-label="Loading privacy settings">
      <div className="sk sk-icon" />
      <div className="sk sk-title" />
      <div className="sk sk-subtitle" />
      {[1, 2, 3, 4, 5].map((n) => (
        <div key={n} className="sk sk-row" />
      ))}
      <div className="sk sk-btn" />
    </div>
  );
}
