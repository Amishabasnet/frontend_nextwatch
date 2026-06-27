import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Clapperboard, Loader2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "react-toastify";
import "../login/LoginPage.css";
import "./RegisterPage.css";

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

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const strength = getPasswordStrength(form.password);

  const validate = () => {
    const errs = {};
    if (!form.username.trim()) errs.username = "Username is required.";
    else if (form.username.trim().length < 3) errs.username = "Must be at least 3 characters.";
    if (!form.email.trim()) errs.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email.";
    if (!form.password) errs.password = "Password is required.";
    else if (form.password.length < 8) errs.password = "Must be at least 8 characters.";
    if (!form.confirmPassword) errs.confirmPassword = "Please confirm your password.";
    else if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords don't match.";
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setIsLoading(true);
    const result = await register({
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
    });
    setIsLoading(false);

    if (result.success) {
      toast.success("Account created! Welcome to NextWatch 🎬");
      navigate("/consent", { replace: true });
    } else {
      toast.error(result.error || "Registration failed.");
      setErrors({ server: result.error });
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-blob auth-blob--1" />
      <div className="auth-blob auth-blob--2" />

      <div className="auth-card auth-card--register">
        <Link to="/" className="auth-logo">
          <Clapperboard size={22} className="auth-logo__icon" />
          <span className="auth-logo__text">NextWatch</span>
        </Link>

        <h1 className="auth-heading">Create your account</h1>
        <p className="auth-subheading">
          Join NextWatch and discover films matched to your mood
        </p>

        {errors.server && (
          <div className="auth-alert">{errors.server}</div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Username */}
          <div className="auth-field">
            <label htmlFor="username" className="auth-label">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={form.username}
              onChange={handleChange}
              placeholder="johndoe"
              className={`auth-input${errors.username ? " auth-input--error" : ""}`}
            />
            {errors.username && <span className="auth-error">{errors.username}</span>}
          </div>

          {/* Email */}
          <div className="auth-field">
            <label htmlFor="email" className="auth-label">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className={`auth-input${errors.email ? " auth-input--error" : ""}`}
            />
            {errors.email && <span className="auth-error">{errors.email}</span>}
          </div>

          {/* Password */}
          <div className="auth-field">
            <label htmlFor="password" className="auth-label">Password</label>
            <div className="auth-input-wrap">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min. 8 characters"
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
            {/* Strength meter */}
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

          {/* Confirm Password */}
          <div className="auth-field">
            <label htmlFor="confirmPassword" className="auth-label">Confirm password</label>
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
            {errors.confirmPassword && (
              <span className="auth-error">{errors.confirmPassword}</span>
            )}
          </div>

          <button type="submit" className="auth-btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 size={16} className="auth-btn__spinner" />
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
