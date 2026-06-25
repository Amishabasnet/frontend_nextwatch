import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
/**
 * ProtectedRoute
 *
 * Allows access only to authenticated users.
 * Unauthenticated users are redirected to /login.
 * The original destination is saved so the user can be
 * returned there after a successful login.
 *
 * Usage (in your router):
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/dashboard" element={<Dashboard />} />
 *     <Route path="/watchlist"  element={<Watchlist />} />
 *   </Route>
 */
export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // While the session is being restored from localStorage, render nothing
  // (or a spinner) to avoid a flash of the login redirect.
  if (isLoading) {
    return <AuthLoadingSpinner />;
  }

  if (!isAuthenticated) {
    // Pass the attempted URL so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

// ─── Minimal inline spinner ────────────────────────────────────────────────

function AuthLoadingSpinner() {
  return (
    <div style={styles.wrapper} aria-label="Checking authentication…">
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

// Inject keyframes once
if (typeof document !== "undefined") {
  const id = "nw-spinner-keyframes";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `@keyframes nw-spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }
}
