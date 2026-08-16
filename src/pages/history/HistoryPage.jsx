import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Clapperboard, Clock, Film, LogOut,
  AlertCircle, RefreshCw, SmilePlus, Star, Eye,
  Settings, ShieldCheck, User,
} from "lucide-react";
import { getHistory } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import BackButton from "../../components/BackButton";
import "./HistoryPage.css";

function normalizeItem(raw) {
  if (!raw) return null;
  const movie = raw.movie ?? raw.movieDetails ?? raw;
  return {
    id:          raw.movieId ?? movie._id ?? movie.id ?? String(Math.random()),
    title:       movie.title ?? raw.title ?? "Untitled",
    posterUrl:   movie.posterUrl ?? movie.poster_url ?? raw.posterUrl ?? null,
    genres:      Array.isArray(movie.genres) ? movie.genres.filter(Boolean) : [],
    rating:      Number(movie.rating ?? movie.averageScore ?? 0) || 0,
    releaseYear: movie.releaseYear ?? movie.year ?? raw.releaseYear ?? null,
    watchedAt:   raw.watchedAt ?? raw.createdAt ?? null,
  };
}

function titleToGradient(title = "") {
  let hash = 0;
  for (let i = 0; i < title.length; i++) { hash = ((hash << 5) - hash) + title.charCodeAt(i); hash |= 0; }
  const h1 = Math.abs(hash % 360), h2 = (h1 + 60) % 360;
  return `linear-gradient(155deg, hsl(${h1},45%,18%) 0%, hsl(${h2},35%,10%) 100%)`;
}

function getInitials(name = "") {
  return name.split(" ").map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
}

function formatDate(iso) {
  if (!iso) return null;
  try { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso)); }
  catch { return null; }
}

export default function HistoryPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [status, setStatus]   = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef(null);

  const displayName = user?.username ?? user?.name ?? user?.email?.split("@")[0] ?? "there";

  const fetchHistory = useCallback(async () => {
    if (!user?.id) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await getHistory(user.id);
      const raw = Array.isArray(res.data)
        ? res.data
        : (res.data?.history ?? res.data?.items ?? []);
      setHistory(raw.map(normalizeItem).filter(Boolean));
      setStatus("success");
    } catch (err) {
      setErrorMsg(err.response?.data?.message ?? "Couldn't load your history.");
      setStatus("error");
      toast.error("Failed to load history");
    }
  }, [user]);

  useEffect(() => {
    if (authLoading || !user?.id) return;

    let canceled = false;

    const loadHistory = async () => {
      if (canceled) return;
      await fetchHistory();
    };

    loadHistory();
    return () => {
      canceled = true;
    };
  }, [authLoading, fetchHistory, user?.id]);

  // Close avatar dropdown on outside click
  useEffect(() => {
    if (!avatarOpen) return;
    const handleClick = (e) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [avatarOpen]);

  const isLoading = authLoading || status === "loading";

  return (
    <div className="hy-root">
      <div className="hy-glow hy-glow-tl" />
      <div className="hy-glow hy-glow-br" />

      <nav className="hy-nav">
        <Link to="/" className="hy-nav-logo">
          <Clapperboard size={20} strokeWidth={1.8} className="hy-logo-icon" />
          <span className="hy-logo-text">Next<span className="hy-logo-accent">Watch</span></span>
        </Link>
        <div className="hy-nav-right">
          <Link to="/dashboard" className="hy-nav-link hy-nav-link--ghost">Dashboard</Link>
          <Link to="/mood" className="hy-nav-link">
            <SmilePlus size={13} strokeWidth={2} /> Mood
          </Link>
          <div style={{ position: "relative" }} ref={avatarRef}>
            <button
              type="button"
              onClick={() => setAvatarOpen(prev => !prev)}
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: "transparent", border: "none" }}
            >
              <div
                className="hy-avatar"
                title={displayName}
                style={{ cursor: "pointer" }}
              >
                {getInitials(displayName)}
              </div>
              <span className="hy-nav-username" style={{ cursor: "pointer" }}>{displayName}</span>
            </button>
            {avatarOpen && (
              <div
                style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0,
                  background: "#1a1a24", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12, padding: "6px", minWidth: 160, zIndex: 200,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}
              >
                <Link to="/profile" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, color: "#9292b0", textDecoration: "none", fontSize: "0.82rem", fontWeight: 600 }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  onClick={() => setAvatarOpen(false)}
                >
                  <User size={13} strokeWidth={2} /> Profile
                </Link>
                <Link to="/settings" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, color: "#9292b0", textDecoration: "none", fontSize: "0.82rem", fontWeight: 600 }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  onClick={() => setAvatarOpen(false)}
                >
                  <Settings size={13} strokeWidth={2} /> Settings
                </Link>
                {user?.role === "admin" && (
                  <Link to="/admin/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, color: "#a78bfa", textDecoration: "none", fontSize: "0.82rem", fontWeight: 600 }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(167,139,250,0.08)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    onClick={() => setAvatarOpen(false)}
                  >
                    <ShieldCheck size={13} strokeWidth={2} /> Admin Panel
                  </Link>
                )}
                <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "4px 0" }} />
                <button type="button" onClick={() => { setAvatarOpen(false); logout(); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, color: "#f87171", background: "transparent", border: "none", fontSize: "0.82rem", fontWeight: 600, width: "100%", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <LogOut size={13} strokeWidth={2} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="hy-main">
        <BackButton />

        <div className="hy-page-header">
          <div>
            <p className="hy-eyebrow"><Clock size={13} strokeWidth={2} /> Library</p>
            <h1 className="hy-title">Watch History</h1>
            {status === "success" && (
              <p className="hy-subtitle">{history.length} {history.length === 1 ? "title" : "titles"} watched</p>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="hy-grid">
            {Array.from({ length: 8 }).map((_, i) => <HistorySkeleton key={i} />)}
          </div>
        )}

        {!isLoading && status === "error" && (
          <div className="hy-state">
            <AlertCircle size={28} strokeWidth={1.5} className="hy-state-icon hy-state-icon--error" />
            <h2 className="hy-state-title">Couldn't load history</h2>
            <p className="hy-state-body">{errorMsg}</p>
            <button type="button" className="hy-retry-btn" onClick={fetchHistory}>
              <RefreshCw size={14} strokeWidth={2} /> Try Again
            </button>
          </div>
        )}

        {!isLoading && status === "success" && history.length === 0 && (
          <div className="hy-state">
            <div className="hy-state-icon-wrap"><Film size={28} strokeWidth={1.5} /></div>
            <h2 className="hy-state-title">No watch history yet</h2>
            <p className="hy-state-body">Movies you watch will appear here.</p>
            <Link to="/movies" className="hy-browse-btn"><Film size={14} /> Browse Movies</Link>
          </div>
        )}

        {!isLoading && status === "success" && history.length > 0 && (
          <div className="hy-grid">
            {history.map((item) => (
              <HistoryCard key={item.id} item={item} onViewDetails={(id) => navigate(`/movies/${id}`)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function HistoryCard({ item, onViewDetails }) {
  const [imgError, setImgError] = useState(false);
  const { id, title, posterUrl, genres, rating, releaseYear, watchedAt } = item;
  const hasPoster = posterUrl && !imgError;
  const ratingDisplay = rating > 0 ? Number(rating).toFixed(1) : null;
  const dateLabel = formatDate(watchedAt);

  return (
    <article className="hy-card" onClick={() => onViewDetails(id)}>
      <div className="hy-card-poster">
        {hasPoster ? (
          <img src={posterUrl} alt={title} loading="lazy" onError={() => setImgError(true)} className="hy-card-img" />
        ) : (
          <div className="hy-card-fallback" style={{ background: titleToGradient(title) }}>
            <span>{title.charAt(0).toUpperCase()}</span>
          </div>
        )}
        {ratingDisplay && (
          <div className="hy-badge hy-badge--rating">
            <Star size={9} strokeWidth={0} fill="#fbbf24" />{ratingDisplay}
          </div>
        )}
        {releaseYear && <div className="hy-badge hy-badge--year">{releaseYear}</div>}
        <div className="hy-card-overlay">
          <button type="button" className="hy-details-btn" onClick={(e) => { e.stopPropagation(); onViewDetails(id); }}>
            <Eye size={12} strokeWidth={2.5} /> View Details
          </button>
        </div>
      </div>
      <div className="hy-card-body">
        <h3 className="hy-card-title">{title}</h3>
        {genres.length > 0 && (
          <div className="hy-card-genres">
            {genres.slice(0, 2).map(g => (
              <span key={g} className="hy-genre-chip">{g}</span>
            ))}
          </div>
        )}
        {dateLabel && <p className="hy-card-date"><Clock size={11} strokeWidth={2} /> Watched {dateLabel}</p>}
        <button type="button" className="hy-view-btn" onClick={(e) => { e.stopPropagation(); onViewDetails(id); }}>
          <Eye size={13} strokeWidth={2} /> View Details
        </button>
      </div>
    </article>
  );
}

function HistorySkeleton() {
  return (
    <div className="hy-card hy-skeleton" aria-hidden="true">
      <div className="hy-sk hy-sk-poster" />
      <div className="hy-card-body">
        <div className="hy-sk hy-sk-title" />
        <div className="hy-sk hy-sk-genres" />
        <div className="hy-sk hy-sk-date" />
        <div className="hy-sk hy-sk-btn" />
      </div>
    </div>
  );
}
