import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Clapperboard,
  Bookmark,
  Star,
  Film,
  Loader2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Trash2,
  SmilePlus,
  LogOut,
  X,
  TriangleAlert,
} from "lucide-react";
import {  deleteWatchlist } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import GenreBadge from "../../components/GenreBadge";
import "./WatchlistPage.css";

function normalizeMovie(raw) {
  if (!raw) return null;
  const movie = raw.movie ?? raw.movieDetails ?? raw;
  return {
    id:          raw.movieId ?? movie._id ?? movie.id ?? String(Math.random()),
    title:       movie.title ?? raw.title ?? "Untitled",
    posterUrl:   movie.posterUrl ?? movie.poster_url ?? raw.posterUrl ?? null,
    genres:      Array.isArray(movie.genres) ? movie.genres.filter(Boolean) : [],
    rating:      Number(movie.rating ?? movie.averageScore ?? movie.voteAverage ?? raw.rating ?? 0) || 0,
    releaseYear: movie.releaseYear ?? movie.release_year ?? movie.year ?? raw.releaseYear ?? null,
    description: movie.description ?? movie.overview ?? raw.description ?? null,
    addedAt:     raw.addedAt ?? raw.createdAt ?? null,
  };
}

function titleToGradient(title = "") {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash) + title.charCodeAt(i);
    hash |= 0;
  }
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 60) % 360;
  return `linear-gradient(155deg, hsl(${hue1},45%,18%) 0%, hsl(${hue2},35%,10%) 100%)`;
}

function getInitials(name = "") {
  return name.split(" ").map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
}

function formatDate(iso) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
  } catch {
    return null;
  }
}

export default function WatchlistPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [movies, setMovies]         = useState([]);
  const [, setMovieIds]     = useState(new Set()); // fast duplicate check
  const [status, setStatus]         = useState("loading");
  const [errorMsg, setErrorMsg]     = useState("");
  const [removing, setRemoving]     = useState(new Set()); // ids mid-removal
  const [confirmTarget, setConfirmTarget] = useState(null); // { id, title } | null

  const displayName = user?.username ?? user?.name ?? user?.email?.split("@")[0] ?? "there";
  const userId      = user?._id ?? user?.id;

  /* ── Fetch ── */
  const fetchWatchlist = useCallback(async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      // Supports both JWT-scoped /watchlist and userId-scoped /watchlist/:userId
      const endpoint = userId ? `/watchlist/${userId}` : "/watchlist";
      const { default: api } = await import("../../services/api");
      const res = await api.get(endpoint);
      const raw = Array.isArray(res.data)
        ? res.data
        : (res.data?.watchlist ?? res.data?.items ?? []);
      const normalized = raw.map(normalizeMovie).filter(Boolean);
      setMovies(normalized);
      setMovieIds(new Set(normalized.map((m) => m.id)));
      setStatus("success");
    } catch (err) {
      setErrorMsg(err.response?.data?.message ?? "Couldn't load your watchlist.");
      setStatus("error");
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!authLoading) fetchWatchlist();
  }, [authLoading, fetchWatchlist]);

  /* ── Add (called externally or from browse — duplicate guard) ── */
  

  /* ── Remove flow ── */
  const requestRemove = (id, title) => setConfirmTarget({ id, title });
  const cancelRemove  = () => setConfirmTarget(null);

  const confirmRemove = useCallback(async () => {
    if (!confirmTarget) return;
    const { id, title } = confirmTarget;
    setConfirmTarget(null);

    setRemoving((prev) => new Set(prev).add(id));
    // Optimistic UI
    setMovies((prev) => prev.filter((m) => m.id !== id));
    setMovieIds((prev) => { const s = new Set(prev); s.delete(id); return s; });

    try {
      await deleteWatchlist(id);
      toast(`Removed "${title}"`, { icon: "🗑️", theme: "dark" });
    // eslint-disable-next-line no-unused-vars
    } catch (err) {
      // Revert on failure
      toast.error("Couldn't remove movie — please try again.");
      fetchWatchlist();
    } finally {
      setRemoving((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }, [confirmTarget, fetchWatchlist]);

  const isLoading = authLoading || status === "loading";

  return (
    <div className="wl-root">
      <div className="wl-glow wl-glow-tl" />
      <div className="wl-glow wl-glow-br" />

      {/* ── Nav ── */}
      <nav className="wl-nav">
        <Link to="/" className="wl-nav-logo">
          <Clapperboard size={20} strokeWidth={1.8} className="wl-logo-icon" />
          <span className="wl-logo-text">Next<span className="wl-logo-accent">Watch</span></span>
        </Link>

        <div className="wl-nav-right">
          <Link to="/movies"    className="wl-nav-link wl-nav-link--ghost">Browse</Link>
          <Link to="/search"    className="wl-nav-link wl-nav-link--ghost">Search</Link>
          <Link to="/dashboard" className="wl-nav-link wl-nav-link--ghost">Dashboard</Link>
          <Link to="/mood"      className="wl-nav-link">
            <SmilePlus size={13} strokeWidth={2} />
            Mood
          </Link>

          <div className="wl-nav-user">
            <div className="wl-avatar" title={displayName}>{getInitials(displayName)}</div>
            <span className="wl-nav-username">{displayName}</span>
          </div>

          <button type="button" onClick={logout} className="wl-nav-signout">
            <LogOut size={13} strokeWidth={2} />
            <span className="wl-nav-signout-label">Sign out</span>
          </button>
        </div>
      </nav>

      <main className="wl-main">
        {/* ── Header ── */}
        <div className="wl-page-header">
          <div className="wl-header-left">
            <p className="wl-eyebrow">
              <Bookmark size={13} strokeWidth={2} />
              Saved
            </p>
            <h1 className="wl-title">My Watchlist</h1>
            {status === "success" && movies.length > 0 && (
              <p className="wl-subtitle">
                {movies.length} {movies.length === 1 ? "movie" : "movies"} saved
              </p>
            )}
          </div>

          {status === "success" && movies.length > 0 && (
            <Link to="/movies" className="wl-browse-btn">
              <Film size={14} strokeWidth={2} />
              Browse More
            </Link>
          )}
        </div>

        {/* ── Loading skeletons ── */}
        {isLoading && (
          <div className="wl-grid">
            {Array.from({ length: 8 }).map((_, i) => <WatchlistSkeleton key={i} />)}
          </div>
        )}

        {/* ── Error ── */}
        {!isLoading && status === "error" && (
          <div className="wl-state">
            <div className="wl-state-icon wl-state-icon--error">
              <AlertCircle size={28} strokeWidth={1.5} />
            </div>
            <h2 className="wl-state-title">Couldn't load watchlist</h2>
            <p className="wl-state-body">{errorMsg}</p>
            <button type="button" className="wl-retry-btn" onClick={fetchWatchlist}>
              <RefreshCw size={14} strokeWidth={2} />
              Try Again
            </button>
          </div>
        )}

        {/* ── Empty ── */}
        {!isLoading && status === "success" && movies.length === 0 && (
          <div className="wl-empty">
            <div className="wl-empty-illustration">
              <div className="wl-empty-ring wl-empty-ring--outer" />
              <div className="wl-empty-ring wl-empty-ring--inner" />
              <Bookmark size={36} strokeWidth={1.2} className="wl-empty-icon" />
            </div>
            <h2 className="wl-empty-title">Your watchlist is empty</h2>
            <p className="wl-empty-body">Start saving movies you love.</p>
            <Link to="/movies" className="wl-empty-cta">
              <Film size={14} strokeWidth={2} />
              Browse Movies
            </Link>
          </div>
        )}

        {/* ── Grid ── */}
        {!isLoading && status === "success" && movies.length > 0 && (
          <div className="wl-grid">
            {movies.map((movie) => (
              <WatchlistCard
                key={movie.id}
                movie={movie}
                isRemoving={removing.has(movie.id)}
                onViewDetails={(id) => navigate(`/movies/${id}`)}
                onRemove={requestRemove}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Confirmation modal ── */}
      {confirmTarget && (
        <ConfirmModal
          title={confirmTarget.title}
          onConfirm={confirmRemove}
          onCancel={cancelRemove}
        />
      )}
    </div>
  );
}

function WatchlistCard({ movie, isRemoving, onViewDetails, onRemove }) {
  const [imgError, setImgError] = useState(false);
  const { id, title, posterUrl, genres, rating, releaseYear, addedAt } = movie;
  const hasPoster     = posterUrl && !imgError;
  const ratingDisplay = rating > 0 ? Number(rating).toFixed(1) : null;
  const dateLabel     = formatDate(addedAt);

  return (
    <article className={`wl-card ${isRemoving ? "wl-card--removing" : ""}`}>
      {/* Poster */}
      <div className="wl-card-poster" onClick={() => onViewDetails(id)}>
        {hasPoster ? (
          <img
            src={posterUrl}
            alt={title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="wl-card-img"
          />
        ) : (
          <div className="wl-card-fallback" style={{ background: titleToGradient(title) }}>
            <span className="wl-card-initial">{title.charAt(0).toUpperCase()}</span>
          </div>
        )}

        {/* Badges */}
        {ratingDisplay && (
          <div className="wl-badge wl-badge--rating">
            <Star size={9} strokeWidth={0} fill="#fbbf24" />
            {ratingDisplay}
          </div>
        )}
        {releaseYear && (
          <div className="wl-badge wl-badge--year">{releaseYear}</div>
        )}

        {/* Hover overlay */}
        <div className="wl-card-overlay">
          <button
            type="button"
            className="wl-details-btn"
            onClick={(e) => { e.stopPropagation(); onViewDetails(id); }}
          >
            <ExternalLink size={12} strokeWidth={2.5} />
            View Details
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="wl-card-body">
        <div className="wl-card-meta">
          <h3 className="wl-card-title" title={title}>{title}</h3>
          {dateLabel && <span className="wl-card-date">Added {dateLabel}</span>}
        </div>

        {genres.length > 0 && (
          <div className="wl-card-genres">
            {genres.slice(0, 3).map((g) => <GenreBadge key={g} genre={g} size="xs" />)}
          </div>
        )}

        <div className="wl-card-actions">
          <button
            type="button"
            className="wl-view-btn"
            onClick={() => onViewDetails(id)}
          >
            <ExternalLink size={12} strokeWidth={2.5} />
            View Details
          </button>

          <button
            type="button"
            className="wl-remove-btn"
            onClick={() => onRemove(id, title)}
            disabled={isRemoving}
            aria-label={`Remove ${title} from watchlist`}
          >
            {isRemoving
              ? <Loader2 size={13} className="wl-spin" />
              : <Trash2 size={13} strokeWidth={2} />
            }
          </button>
        </div>
      </div>
    </article>
  );
}

function ConfirmModal({ title, onConfirm, onCancel }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div className="wl-modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="wl-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="wl-modal-close" onClick={onCancel} aria-label="Cancel">
          <X size={16} strokeWidth={2} />
        </button>

        <div className="wl-modal-icon-wrap">
          <TriangleAlert size={24} strokeWidth={1.8} className="wl-modal-icon" />
        </div>

        <h2 className="wl-modal-title">Remove from Watchlist?</h2>
        <p className="wl-modal-body">
          <span className="wl-modal-movie-name">"{title}"</span> will be removed from your saved list.
          You can always add it back later.
        </p>

        <div className="wl-modal-actions">
          <button type="button" className="wl-modal-cancel" onClick={onCancel}>
            Keep It
          </button>
          <button type="button" className="wl-modal-confirm" onClick={onConfirm}>
            <Trash2 size={14} strokeWidth={2} />
            Yes, Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function WatchlistSkeleton() {
  return (
    <div className="wl-card wl-skeleton" aria-hidden="true">
      <div className="wl-sk wl-sk-poster" />
      <div className="wl-card-body">
        <div className="wl-sk wl-sk-title" />
        <div className="wl-sk wl-sk-date" />
        <div className="wl-sk wl-sk-genres" />
        <div className="wl-sk wl-sk-actions" />
      </div>
    </div>
  );
}
