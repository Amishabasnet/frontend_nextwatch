import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Clapperboard, Loader2, CheckCircle, TriangleAlert } from "lucide-react";
import { resetPassword } from "../../services/api";
import { toast } from "react-toastify";
import "../login/LoginPage.css";
import "./ResetPasswordPage.css";

function getPasswordStrength(pw) {
  if (!pw) return null;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: "Weak",   key: "weak" };
  if (score === 2) return { level: 2, label: "Fair",   key: "fair" };
  if (score === 3) return { level: 3, label: "Good",   key: "good" };
  return              { level: 4, label: "Strong", key: "strong" };
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const strength = getPasswordStrength(form.password);

  const validate = () => {
    const errs = {};
    if (!form.password) errs.password = "Password is required.";
    else if (form.password.length < 6) errs.password = "Must be at least 6 characters.";
    if (form.confirmPassword !== form.password) errs.confirmPassword = "Passwords don't match.";
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setIsLoading(true);
    try {
      await resetPassword(token, form.password);
      setDone(true);
      toast.success("Password reset — you can sign in now.");
    } catch (err) {
      setErrors({ server: err.response?.data?.message ?? "Couldn't reset your password. The link may have expired." });
    } finally {
      setIsLoading(false);
    }
  };

  // No token in the URL at all — someone landed here directly rather than
  // via a reset email link.
  if (!token) {
    return (
      <div className="auth-root">
        <div className="auth-blob auth-blob--1" />
        <div className="auth-blob auth-blob--2" />
        <div className="auth-card">
          <Link to="/" className="auth-logo">
            <Clapperboard size={22} className="auth-logo__icon" />
            <span className="auth-logo__text">NextWatch</span>
          </Link>
          <div className="rp-error-icon"><TriangleAlert size={26} strokeWidth={1.8} /></div>
          <h1 className="auth-heading">Invalid reset link</h1>
          <p className="auth-subheading">
            This link is missing its reset token. Request a new one to continue.
          </p>
          <Link to="/forgot-password" className="auth-btn rp-link-btn">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-root">
      <div className="auth-blob auth-blob--1" />
      <div className="auth-blob auth-blob--2" />

      <div className="auth-card">
        <Link to="/" className="auth-logo">
          <Clapperboard size={22} className="auth-logo__icon" />
          <span className="auth-logo__text">NextWatch</span>
        </Link>

        {done ? (
          <>
            <div className="rp-success-icon"><CheckCircle size={26} strokeWidth={1.8} /></div>
            <h1 className="auth-heading">Password reset</h1>
            <p className="auth-subheading">
              Your password has been updated. You've been signed out of every device for security —
              sign back in with your new password.
            </p>
            <button type="button" className="auth-btn" onClick={() => navigate("/login", { replace: true })}>
              Go to sign in
            </button>
          </>
        ) : (
          <>
            <h1 className="auth-heading">Set a new password</h1>
            <p className="auth-subheading">Choose a new password for your account.</p>

            {errors.server && <div className="auth-alert">{errors.server}</div>}

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <div className="auth-field">
                <label htmlFor="password" className="auth-label">New password</label>
                <div className="auth-input-wrap">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    autoFocus
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`auth-input auth-input--has-icon${errors.password ? " auth-input--error" : ""}`}
                  />
                  <button
                    type="button"
                    className="auth-eye"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {form.password && strength && (
                  <>
                    <div className="auth-strength">
                      {[1, 2, 3, 4].map((n) => (
                        <div
                          key={n}
                          className={`auth-strength__bar${n <= strength.level ? ` auth-strength__bar--${strength.key}` : ""}`}
                        />
                      ))}
                    </div>
                    <span className={`auth-strength__label auth-strength__label--${strength.key}`}>
                      {strength.label}
                    </span>
                  </>
                )}
                {errors.password && <span className="auth-error">{errors.password}</span>}
              </div>

              <div className="auth-field">
                <label htmlFor="confirmPassword" className="auth-label">Confirm new password</label>
                <div className="auth-input-wrap">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`auth-input auth-input--has-icon${errors.confirmPassword ? " auth-input--error" : ""}`}
                  />
                  <button
                    type="button"
                    className="auth-eye"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && <span className="auth-error">{errors.confirmPassword}</span>}
              </div>

              <button type="submit" className="auth-btn" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="auth-btn__spinner" />
                    Resetting…
                  </>
                ) : (
                  "Reset password"
                )}
              </button>
            </form>
          </>
        )}

        <p className="auth-footer">
          <Link to="/login" className="auth-link">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
