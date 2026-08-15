import { useState } from "react";
import { Link } from "react-router-dom";
import { Clapperboard, Loader2, ArrowLeft, MailCheck } from "lucide-react";
import { forgotPassword } from "../../services/api";
import "../login/LoginPage.css";
import "./ForgotPasswordPage.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devResetLink, setDevResetLink] = useState(null);

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return setError("Email is required.");
    if (!/\S+@\S+\.\S+/.test(email)) return setError("Enter a valid email.");

    setIsLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      // In non-production environments the backend echoes the reset link
      // back here so the flow can be tested without a real email provider.
      setDevResetLink(res.data?.resetLink ?? null);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message ?? "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-blob auth-blob--1" />
      <div className="auth-blob auth-blob--2" />

      <div className="auth-card">
        <Link to="/" className="auth-logo">
          <Clapperboard size={22} className="auth-logo__icon" />
          <span className="auth-logo__text">NextWatch</span>
        </Link>

        {sent ? (
          <>
            <div className="fp-success-icon">
              <MailCheck size={26} strokeWidth={1.8} />
            </div>
            <h1 className="auth-heading">Check your email</h1>
            <p className="auth-subheading">
              If an account exists for <strong className="fp-email-highlight">{email}</strong>,
              we've sent a link to reset your password. It expires in 15 minutes.
            </p>

            {devResetLink && (
              <div className="fp-dev-box">
                <p className="fp-dev-label">Dev mode — no email server configured</p>
                <a href={devResetLink} className="fp-dev-link">{devResetLink}</a>
              </div>
            )}

            <button
              type="button"
              className="auth-btn"
              onClick={() => { setSent(false); setEmail(""); setDevResetLink(null); }}
            >
              Use a different email
            </button>
          </>
        ) : (
          <>
            <h1 className="auth-heading">Forgot your password?</h1>
            <p className="auth-subheading">
              Enter the email linked to your account and we'll send you a reset link.
            </p>

            {error && <div className="auth-alert">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <div className="auth-field">
                <label htmlFor="email" className="auth-label">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={`auth-input${error ? " auth-input--error" : ""}`}
                />
                {error && <span className="auth-error">{error}</span>}
              </div>

              <button type="submit" className="auth-btn" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="auth-btn__spinner" />
                    Sending link…
                  </>
                ) : (
                  "Send reset link"
                )}
              </button>
            </form>
          </>
        )}

        <p className="auth-footer">
          <Link to="/login" className="auth-link fp-back-link">
            <ArrowLeft size={13} strokeWidth={2} />
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
