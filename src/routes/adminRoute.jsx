import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute() {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingSpinner />;
  }

  // Not logged in at all — send to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but not an admin — send to the main app
  if (role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

// ─── Minimal inline spinner (shared style) ─────────────────────────────────

function AuthLoadingSpinner() {
  return (
    <div style={styles.wrapper} aria-label="Verifying permissions…">
      <div style={styles.spinner} />
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "var(--color-bg, #0f0f13)",
  },
  spinner: {
    width: 40,
    height: 40,
    border: "3px solid rgba(255,255,255,0.1)",
    borderTop: "3px solid var(--color-accent, #e63946)",
    borderRadius: "50%",
    animation: "nw-spin 0.75s linear infinite",
  },
};
