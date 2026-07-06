import { Link } from "react-router-dom";
import { Clapperboard, Film, ArrowLeft } from "lucide-react";

export default function NotFoundPage({ title = "404 — Page Not Found", message = "The page you're looking for doesn't exist." }) {
  return (
    <div style={{
      minHeight: "100svh", background: "#0b0b0f", color: "#c4c4d4",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: "1rem", padding: "2rem", textAlign: "center",
      fontFamily: "system-ui, sans-serif",
    }}>
      <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", marginBottom: 8 }}>
        <Clapperboard size={22} strokeWidth={1.8} style={{ color: "#a78bfa" }} />
        <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#eeeef5" }}>
          Next<span style={{ color: "#a78bfa" }}>Watch</span>
        </span>
      </Link>

      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center", color: "#a78bfa",
      }}>
        <Film size={30} strokeWidth={1.5} />
      </div>

      <h1 style={{ fontSize: "clamp(1.4rem,3vw,2rem)", fontWeight: 800, color: "#eeeef5", margin: 0 }}>{title}</h1>
      <p style={{ fontSize: "0.95rem", color: "#6b6b8a", maxWidth: 380, margin: 0 }}>{message}</p>

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Link to="/dashboard" style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "#8b5cf6", color: "#fff", borderRadius: 10,
          padding: "0.6rem 1.25rem", fontSize: "0.85rem", fontWeight: 700,
          textDecoration: "none",
        }}>
          Go to Dashboard
        </Link>
        <Link to="/" style={{
          display: "flex", alignItems: "center", gap: 6,
          border: "1px solid rgba(255,255,255,0.1)", color: "#9292b0", borderRadius: 10,
          padding: "0.6rem 1.25rem", fontSize: "0.85rem", fontWeight: 600,
          textDecoration: "none",
        }}>
          <ArrowLeft size={14} /> Home
        </Link>
      </div>
    </div>
  );
}
