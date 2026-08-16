import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Clapperboard, Loader2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "react-toastify";
import "./LoginPage.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LEN = 254;
const MAX_PASSWORD_LEN = 128;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";

  const [form, setForm] = useState({ email: location.state?.registeredEmail || "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = () => {
    const errs = {};
    const email = form.email.trim();
    if (!email) errs.email = "Email is required.";
    else if (email.length > MAX_EMAIL_LEN) errs.email = "Email is too long.";
    else if (!EMAIL_REGEX.test(email)) errs.email = "Enter a valid email.";

    if (!form.password) errs.password = "Password is required.";
    else if (form.password.length > MAX_PASSWORD_LEN) errs.password = `Must be ${MAX_PASSWORD_LEN} characters or fewer.`;
    return errs;
  };

  // Recalculated on every render so the button enables the instant the
  // form becomes valid, mirroring RegisterPage's pattern.
  const isFormValid =
    form.email.trim().length > 0 &&
    form.email.trim().length <= MAX_EMAIL_LEN &&
    EMAIL_REGEX.test(form.email.trim()) &&
    form.password.length > 0 &&
    form.password.length <= MAX_PASSWORD_LEN;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Validate a field as soon as the user leaves it, instead of only on submit.
 const handleBlur = (e) => {
  const { name } = e.target;
  const errs = validate();
  setErrors((prev) => ({ ...prev, [name]: errs[name] || "" }));
};

  const handleSubmit = async (e) => {
  e.preventDefault();
  const errs = validate();
  if (Object.keys(errs).length) {
    setErrors(errs);
    return;
  }

    setIsLoading(true);
    const result = await login({ email: form.email.trim(), password: form.password });
    setIsLoading(false);

    if (result.success) {
      const destination = result.user?.consentGiven === false ? "/consent" : from;
      toast.success("Welcome back!");
      navigate(destination, { replace: true });
    } else {
      toast.error(result.error || "Login failed.");
      setErrors({ server: result.error });
    }
  };

  return (
    <div className="auth-root">
      {/* Background blobs */}
      <div className="auth-blob auth-blob--1" />
      <div className="auth-blob auth-blob--2" />

      <div className="auth-card">
        {/* Logo */}
        <Link to="/" className="auth-logo">
          <Clapperboard size={22} className="auth-logo__icon" />
          <span className="auth-logo__text">NextWatch</span>
        </Link>

        <h1 className="auth-heading">Welcome back</h1>
        <p className="auth-subheading">Sign in to your account to continue</p>

        {errors.server && (
          <div className="auth-alert">{errors.server}</div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-field">
            <label htmlFor="email" className="auth-label">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={MAX_EMAIL_LEN}
              placeholder="you@example.com"
              className={`auth-input${errors.email ? " auth-input--error" : ""}`}
            />
            {errors.email && <span className="auth-error">{errors.email}</span>}
          </div>

          <div className="auth-field">
            <div className="auth-label-row">
              <label htmlFor="password" className="auth-label">Password</label>
              <Link to="/forgot-password" className="auth-link auth-link--small">
                Forgot password?
              </Link>
            </div>
            <div className="auth-input-wrap">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
                maxLength={MAX_PASSWORD_LEN}
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
            {errors.password && <span className="auth-error">{errors.password}</span>}
          </div>

          <button type="submit" className="auth-btn" disabled={isLoading || !isFormValid}>
            {isLoading ? (
              <>
                <Loader2 size={16} className="auth-btn__spinner" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{" "}
          <Link to="/register" className="auth-link">Create one</Link>
        </p>
      </div>
    </div>
  );
}