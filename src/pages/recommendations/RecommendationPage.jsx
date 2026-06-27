import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Clapperboard,
  Sparkles,
  RefreshCw,
  Star,
  Bookmark,
  BookmarkCheck,
  Eye,
  HelpCircle,
  X,
  AlertCircle,
  Compass,
  Loader2,
  SmilePlus,
  LogOut,
  TrendingUp,
} from "lucide-react";
import { getRecommendations } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import "./RecommendationsPage.css";

function normalizeRecommendation(raw) {
  if (!raw) return null;
  return {
    id: raw.movieId ?? raw.movie_id ?? raw.id ?? String(Math.random()),
    title: raw.title ?? "Untitled",
    posterUrl: raw.posterUrl ?? raw.poster_url ?? null,
    genres: Array.isArray(raw.genres) ? raw.genres.filter(Boolean) : [],
    rating: Number(raw.rating ?? raw.averageScore ?? 0) || 0,
    releaseYear: raw.releaseYear ?? raw.release_year ?? null,
    contentType: raw.contentType ?? raw.content_type ?? "movie",
    score: typeof raw.score === "number" ? raw.score : null,
    reason:
      raw.reason ??
      "Recommended based on trending content and your profile.",
  };
}

function normalizeRecommendationsResponse(data) {
  if (!data) return { items: [], source: null };
  const list = Array.isArray(data) ? data : data.recommendations ?? [];
  return {
    items: list.map(normalizeRecommendation).filter(Boolean),
    source: data.source ?? null,
  };
}

function formatScorePercent(score) {
  if (typeof score !== "number") return null;
  return Math.round(Math.max(0, Math.min(1, score)) * 100);
}

// Deterministic gradient fallback for missing posters — mirrors MovieCard's
// approach so a missing image still looks intentional, not broken.
function titleToGradient(title = "") {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 60) % 360;
  return `linear-gradient(155deg, hsl(${hue1},45%,18%) 0%, hsl(${hue2},35%,10%) 100%)`;
}

function getInitials(name = "") {
  return (
    name
      .split(" ")
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

export default function RecommendationsPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState("loading"); // loading | success | error
  const [items, setItems] = useState([]);
  const [source, setSource] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [watchlist, setWatchlist] = useState(new Set());
  const [activeMovie, setActiveMovie] = useState(null);

  const fetchRecommendations = useCallback(async () => {
    if (!user?.id) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await getRecommendations(user.id);
      const normalized = normalizeRecommendationsResponse(res.data);
      setItems(normalized.items);
      setSource(normalized.source);
      setStatus("success");
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message ||
          "We couldn't load your recommendations right now. Please try again."
      );
      setStatus("error");
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) Promise.resolve().then(fetchRecommendations);
  }, [authLoading, fetchRecommendations]);

  // Close the "Why Recommended?" modal on Escape
  useEffect(() => {
    if (!activeMovie) return;
    const onKey = (e) => {
      if (e.key === "Escape") setActiveMovie(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeMovie]);

  const handleAddToWatchlist = useCallback((id, title) => {
    setWatchlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast("Removed from Watchlist", { icon: "🗑️", theme: "dark" });
      } else {
        next.add(id);
        toast.success(`Added "${title}" to Watchlist`);
      }
      return next;
    });
  }, []);

  const handleViewDetails = useCallback((id) => {
    navigate(`/movies/${id}`);
  }, [navigate]);

  const displayName =
    user?.username ?? user?.name ?? user?.email?.split("@")[0] ?? "there";
  const isLoading = authLoading || status === "loading";

  return (
    <div className="recs-root">
      <div className="recs-glow recs-glow-tl" />
      <div className="recs-glow recs-glow-br" />

      {/* Nav */}
      <nav className="recs-nav">
        <Link to="/" className="recs-nav-logo">
          <Clapperboard size={20} strokeWidth={1.8} className="recs-logo-icon" />
          <span className="recs-logo-text">
            Next<span className="recs-logo-accent">Watch</span>
          </span>
        </Link>

        <div className="recs-nav-right">
          <Link to="/dashboard" className="recs-nav-link recs-nav-link--ghost">
            Dashboard
          </Link>
          <Link to="/mood" className="recs-nav-link">
            <SmilePlus size={13} strokeWidth={2} />
            Update Mood
          </Link>

          <div className="recs-nav-user">
            <div className="recs-avatar" title={displayName}>
              {getInitials(displayName)}
            </div>
            <span className="recs-nav-username">{displayName}</span>
          </div>

          <button type="button" onClick={logout} className="recs-nav-signout">
            <LogOut size={13} strokeWidth={2} />
            <span className="recs-nav-signout-label">Sign out</span>
          </button>
        </div>
      </nav>

      <main className="recs-main">
        {/* Page header */}
        <div className="recs-page-header">
          <div>
            <p className="recs-eyebrow">
              <Sparkles size={13} strokeWidth={2} />
              Tailored picks
            </p>
            <h1 className="recs-title">Recommended For You</h1>
            <p className="recs-subtitle">
              Built from your mood, favorite genres, viewing history, and
              ratings.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchRecommendations}
            disabled={isLoading}
            className="recs-refresh-btn"
          >
            {isLoading ? (
              <Loader2 size={15} strokeWidth={2} className="recs-spin" />
            ) : (
              <RefreshCw size={15} strokeWidth={2} />
            )}
            Refresh Recommendations
          </button>
        </div>

        {source === "fallback" && status === "success" && items.length > 0 && (
          <div className="recs-fallback-banner">
            <TrendingUp size={14} strokeWidth={2} />
            Showing trending picks while we learn your taste — log a mood or
            rate a few movies to personalize these further.
          </div>
        )}

        {/* Content */}
        {isLoading && (
          <div className="recs-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <RecommendationSkeletonCard key={i} />
            ))}
          </div>
        )}

        {!isLoading && status === "error" && (
          <ErrorState message={errorMessage} onRetry={fetchRecommendations} />
        )}

        {!isLoading && status === "success" && items.length === 0 && (
          <EmptyState />
        )}

        {!isLoading && status === "success" && items.length > 0 && (
          <div className="recs-grid">
            {items.map((movie) => (
              <RecommendationCard
                key={movie.id}
                movie={movie}
                isInWatchlist={watchlist.has(movie.id)}
                onAddToWatchlist={handleAddToWatchlist}
                onViewDetails={handleViewDetails}
                onWhyRecommended={setActiveMovie}
              />
            ))}
          </div>
        )}
      </main>

      {activeMovie && (
        <WhyRecommendedModal
          movie={activeMovie}
          onClose={() => setActiveMovie(null)}
        />
      )}
    </div>
  );
}

function RecommendationCard({
  movie,
  isInWatchlist,
  onAddToWatchlist,
  onViewDetails,
  onWhyRecommended,
}) {
  const [imgError, setImgError] = useState(false);
  const {
    id,
    title,
    posterUrl,
    genres,
    rating,
    releaseYear,
    score,
    reason,
  } = movie;

  const ratingDisplay = rating > 0 ? rating.toFixed(1) : null;
  const scorePercent = formatScorePercent(score);
  const hasPoster = posterUrl && !imgError;
  const visibleGenres = genres.slice(0, 3);

  return (
    <article className="recs-card">
      <div className="recs-poster">
        {hasPoster ? (
          <img
            src={posterUrl}
            alt={title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="recs-poster-img"
          />
        ) : (
          <div
            className="recs-poster-fallback"
            style={{ background: titleToGradient(title) }}
          >
            <span>{title.charAt(0).toUpperCase()}</span>
          </div>
        )}

        {ratingDisplay && (
          <div className="recs-badge recs-badge--rating">
            <Star size={9} strokeWidth={0} fill="#fbbf24" />
            {ratingDisplay}
          </div>
        )}

        {releaseYear && (
          <div className="recs-badge recs-badge--year">{releaseYear}</div>
        )}
      </div>

      <div className="recs-card-body">
        <h3 className="recs-card-title">{title}</h3>

        {visibleGenres.length > 0 && (
          <div className="recs-genre-row">
            {visibleGenres.map((g) => (
              <span key={g} className="recs-genre-chip">
                {g}
              </span>
            ))}
          </div>
        )}

        {scorePercent !== null ? (
          <div className="recs-score">
            <div className="recs-score-bar">
              <div
                className="recs-score-fill"
                style={{ width: `${scorePercent}%` }}
              />
            </div>
            <span className="recs-score-label">{scorePercent}% match</span>
          </div>
        ) : (
          <div className="recs-score recs-score--trending">
            <TrendingUp size={12} strokeWidth={2} />
            <span className="recs-score-label">Trending pick</span>
          </div>
        )}

        <p className="recs-reason">{reason}</p>
        <button
          type="button"
          className="recs-why-btn"
          onClick={() => onWhyRecommended(movie)}
        >
          <HelpCircle size={12} strokeWidth={2} />
          Why recommended?
        </button>

        <div className="recs-card-actions">
          <button
            type="button"
            onClick={() => onViewDetails(id)}
            className="recs-btn recs-btn--details"
          >
            <Eye size={13} strokeWidth={2} />
            Details
          </button>
          <button
            type="button"
            onClick={() => onAddToWatchlist(id, title)}
            className={`recs-btn recs-btn--watchlist ${
              isInWatchlist ? "is-saved" : ""
            }`}
          >
            {isInWatchlist ? (
              <BookmarkCheck size={13} strokeWidth={2.5} />
            ) : (
              <Bookmark size={13} strokeWidth={2} />
            )}
            {isInWatchlist ? "Saved" : "Watchlist"}
          </button>
        </div>
      </div>
    </article>
  );
}

function WhyRecommendedModal({ movie, onClose }) {
  const scorePercent = formatScorePercent(movie.score);

  return (
    <div className="recs-modal-backdrop" onClick={onClose}>
      <div
        className="recs-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Why ${movie.title} was recommended`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="recs-modal-close" onClick={onClose}>
          <X size={16} strokeWidth={2} />
        </button>

        <div className="recs-modal-icon">
          <HelpCircle size={22} strokeWidth={1.8} />
        </div>

        <p className="recs-modal-eyebrow">Why Recommended?</p>
        <h2 className="recs-modal-title">{movie.title}</h2>

        {scorePercent !== null && (
          <div className="recs-modal-score">
            <div className="recs-score-bar">
              <div
                className="recs-score-fill"
                style={{ width: `${scorePercent}%` }}
              />
            </div>
            <span className="recs-score-label">{scorePercent}% match</span>
          </div>
        )}

        <p className="recs-modal-reason">{movie.reason}</p>

        <button type="button" className="recs-modal-ok" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}

function RecommendationSkeletonCard() {
  return (
    <div className="recs-card recs-skeleton-card" aria-hidden="true">
      <div className="recs-sk recs-sk-poster" />
      <div className="recs-card-body">
        <div className="recs-sk recs-sk-title" />
        <div className="recs-sk recs-sk-chip-row" />
        <div className="recs-sk recs-sk-bar" />
        <div className="recs-sk recs-sk-text" />
        <div className="recs-sk recs-sk-text recs-sk-text--short" />
        <div className="recs-sk recs-sk-actions" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="recs-state-card">
      <div className="recs-state-icon">
        <Compass size={26} strokeWidth={1.5} />
      </div>
      <h2 className="recs-state-title">No recommendations yet</h2>
      <p className="recs-state-body">
        Log how you're feeling and pick a few favorite genres so we can start
        personalizing picks for you.
      </p>
      <div className="recs-state-actions">
        <Link to="/mood" className="recs-btn recs-btn--details">
          Set Your Mood
        </Link>
        <Link to="/preferences" className="recs-btn recs-btn--watchlist">
          Choose Genres
        </Link>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="recs-state-card recs-state-card--error">
      <div className="recs-state-icon recs-state-icon--error">
        <AlertCircle size={26} strokeWidth={1.5} />
      </div>
      <h2 className="recs-state-title">Couldn't load recommendations</h2>
      <p className="recs-state-body">{message}</p>
      <button type="button" onClick={onRetry} className="recs-retry-btn">
        <RefreshCw size={14} strokeWidth={2} />
        Try Again
      </button>
    </div>
  );
}
