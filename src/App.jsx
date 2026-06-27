import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { AuthProvider } from "./context/AuthContext";

import LandingPage     from "./pages/landing";
import LoginPage       from "./pages/login";
import RegisterPage    from "./pages/register";
import ConsentPage     from "./pages/consent";
import PreferencesPage from "./pages/Preferences";
import MoodPage        from "./pages/mood";
import DashboardPage   from "./pages/dashboard";
import RecommendationsPage  from "./pages/recommendations";
import MoviesPage          from "./pages/movies";
import MovieDetailsPage    from "./pages/movieDetails";
import ProtectedRoute  from "./routes/protectedRoute";
import "./pages/landing/LandingPage.css";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/"         element={<LandingPage />} />
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected — require login */}
        <Route element={<ProtectedRoute />}>
          <Route path="/consent"         element={<ConsentPage />} />
          <Route path="/preferences"     element={<PreferencesPage />} />
          <Route path="/mood"            element={<MoodPage />} />
          <Route path="/dashboard"       element={<DashboardPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/movies"          element={<MoviesPage />} />
          <Route path="/movies/:id"      element={<MovieDetailsPage />} />
        </Route>

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
    </AuthProvider>
  );
}
