import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/Landing";
import "./pages/Landing/LandingPage.css";

// ── Placeholder pages (swap with real components when ready) ────
const Page = ({ title }) => (
  <div style={{ padding: 40, color: "#fff", fontFamily: "sans-serif", background: "#0b0b0f", minHeight: "100svh" }}>
    <h1>{title}</h1>
    <a href="/" style={{ color: "#a78bfa" }}>← Back to home</a>
  </div>
);

const LoginPage    = () => <Page title="Login" />;
const RegisterPage = () => <Page title="Register" />;

export default function App() {
  return (
    <Routes>
      {/* Public landing */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth pages */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
