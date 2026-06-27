import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

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
    background: "#0b0b0f",
  },
  spinner: {
    width: 40,
    height: 40,
    border: "3px solid rgba(255,255,255,0.1)",
    borderTop: "3px solid #8b5cf6",
    borderRadius: "50%",
    animation: "nw-spin 0.75s linear infinite",
  },
};

if (typeof document !== "undefined") {
  const id = "nw-spinner-keyframes";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `@keyframes nw-spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }
}
