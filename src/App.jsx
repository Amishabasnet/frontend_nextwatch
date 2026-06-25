import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import LandingPage     from "./pages/Landing";
import ConsentPage     from "./pages/Consent";
import PreferencesPage from "./pages/Preferences";
import MoodPage        from "./pages/Mood";
import "./pages/Landing/LandingPage.css";

const Page = ({ title }) => (
  <div
    style={{
      padding: 40,
      color: "#fff",
      fontFamily: "sans-serif",
      background: "#0b0b0f",
      minHeight: "100svh",
    }}
  >
    <h1 style={{ color: "#a78bfa" }}>{title}</h1>
    <a href="/" style={{ color: "#9292b0", fontSize: 14 }}>
      ← Back to home
    </a>
  </div>
);

const LoginPage          = () => <Page title="Login" />;
const RegisterPage       = () => <Page title="Register" />;
const RecommendationsPage = () => <Page title="Recommendations" />;

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/"           element={<LandingPage />} />
        <Route path="/login"      element={<LoginPage />} />
        <Route path="/register"   element={<RegisterPage />} />

        <Route path="/consent"     element={<ConsentPage />} />
        <Route path="/preferences" element={<PreferencesPage />} />
        <Route path="/mood"        element={<MoodPage />} />

        <Route path="/recommendations" element={<RecommendationsPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={3500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastStyle={{
          background: "#1a1a24",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "12px",
          color: "#eeeef5",
          fontSize: "0.875rem",
        }}
      />
    </>
  );
}
