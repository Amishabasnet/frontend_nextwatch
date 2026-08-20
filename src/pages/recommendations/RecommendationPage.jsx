import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Clapperboard, Sparkles, RefreshCw, Star, Bookmark, BookmarkCheck,
  Eye, HelpCircle, X, AlertCircle, Compass, Loader2, SmilePlus,
  LogOut, TrendingUp, ArrowLeft, ThumbsUp, ThumbsDown,
  Smile, Frown, Leaf, PartyPopper, Meh, Heart, Ghost, Flame, Hourglass,
} from "lucide-react";
import {
  getRecommendations, postWatchlist, deleteWatchlist, getWatchlist, getMovieById,
  postRecommendationFeedback,
} from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import "../../components/BackButton/BackButton.css";
import "./RecommendationPage.css";

const MOODS = [
  { label: "Happy",     icon: Smile,       color: "#fbbf24" },
  { label: "Sad",       icon: Frown,       color: "#60a5fa" },
  { label: "Excited",   icon: PartyPopper, color: "#fb923c" },
  { label: "Relaxed",   icon: Leaf,        color: "#34d399" },
  { label: "Scared",    icon: Ghost,       color: "#818cf8" },
  { label: "Romantic",  icon: Heart,       color: "#fb7185" },
  { label: "Motivated", icon: Flame,       color: "#f97316" },
  { label: "Bored",     icon: Meh,         color: "#94a3b8" },
  { label: "Nostalgic", icon: Hourglass,   color: "#c084fc" },
];

function normalizeMovie(raw) {
  if (!raw) return null;
  const id = raw._id ?? raw.movieId ?? raw.id ?? null;
  if (!id) {
    // No real id from the API — skip rather than fabricate one, since a
    // fake id would 500 when the user tries to view/save this movie.
    console.warn("Recommendation missing id, skipping:", raw?.title ?? raw);
    return null;
  }
  return {
    id,
    title: raw.title ?? "Untitled",
    posterUrl: raw.posterUrl ?? raw.poster_url ?? null,
    genres: Array.isArray(raw.genres) ? raw.genres.filter(Boolean) : [],
    rating: Number(raw.rating ?? raw.averageScore ?? 0) || 0,
    releaseYear: raw.releaseYear ?? raw.release_year ?? null,
    contentType: raw.contentType ?? raw.content_type ?? "movie",
    score: typeof raw.score === "number" ? raw.score : null,
    reason: raw.reason ?? "Recommended based on your mood.",
  };
}

function normalizeRecommendationsResponse(data) {
  if (!data) return { items: [], source: null };
  const list = Array.isArray(data) ? data : data.recommendations ?? [];
  return {
    items: list.map(normalizeMovie).filter(Boolean),
    source: data.source ?? null,
  };
}

function formatScorePercent(score) {
  if (typeof score !== "number") return null;
  return Math.round(Math.max(0, Math.min(1, score)) * 100);
}

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
    name.split(" ").map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "?"
  );
}

export default function RecommendationsPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [selectedMood, setSelectedMood] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [items, setItems] = useState([]);
  const [source, setSource] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [watchlist, setWatchlist] = useState(new Set());
  const [feedback, setFeedback] = useState({}); // movieId -> { liked, disliked }
  const [activeMovie, setActiveMovie] = useState(null);
  const [detailsMovie, setDetailsMovie] = useState(null);   // basic card data, shown immediately
  const [detailsFull, setDetailsFull] = useState(null);     // full record once fetched
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchByMood = useCallback(async (mood) => {
    if (!user?.id) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      // Route through the same scoring engine as the default recommendations,
      // just with this mood overriding whatever's currently saved for the
      // user. That's what gives mood-filtered results a real match % and a
      // specific reason, instead of falling back to a plain catalogue search
      // with no scoring at all.
      const res = await getRecommendations(user.id, { mood });
      const normalized = normalizeRecommendationsResponse(res.data);
      setItems(normalized.items);
      setSource(normalized.source);
      setStatus("success");
    } catch {
      setErrorMessage("Couldn't load movies for this mood. Please try again.");
      setStatus("error");
    }
  }, [user]);

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

  // Load personalised recs on mount
  useEffect(() => {
    if (!authLoading && !selectedMood) {
      Promise.resolve().then(fetchRecommendations);
    }
  }, [authLoading, fetchRecommendations, selectedMood]);

  // Close modal on Escape
  useEffect(() => {
    if (!activeMovie) return;
    const onKey = (e) => { if (e.key === "Escape") setActiveMovie(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeMovie]);

  const handleMoodSelect = (mood) => {
    if (selectedMood === mood) {
      // Deselect → back to personalised recs
      setSelectedMood(null);
      fetchRecommendations();
    } else {
      setSelectedMood(mood);
      fetchByMood(mood);
    }
  };

  // Load watchlist from backend on mount
  useEffect(() => {
    const loadWatchlist = async () => {
      try {
        const res = await getWatchlist();
        const items = Array.isArray(res.data) ? res.data : (res.data?.watchlist ?? []);
        const ids = new Set(items.map(i => i.movieId ?? i._id ?? i.id).filter(Boolean));
        setWatchlist(ids);
      } catch { /* non-critical */ }
    };
    if (!authLoading) loadWatchlist();
  }, [authLoading]);

  const handleAddToWatchlist = useCallback(async (id, title) => {
    const inList = watchlist.has(id);
    setWatchlist((prev) => {
      const next = new Set(prev);
      if (inList) { next.delete(id); } else { next.add(id); }
      return next;
    });
    try {
      if (inList) {
        await deleteWatchlist(id);
        toast("Removed from Watchlist", { icon: "🗑️", theme: "dark" });
      } else {
        await postWatchlist({ movieId: id });
        toast.success(`Added "${title}" to Watchlist`);
      }
      // Saving to a watchlist is a strong "I'm interested" signal — log it
      // as a click even though the user never opened the details modal.
      postRecommendationFeedback({ movieId: id, clicked: true }).catch(() => {});
    } catch {
      // revert on failure
      setWatchlist((prev) => {
        const next = new Set(prev);
        if (inList) { next.add(id); } else { next.delete(id); }
        return next;
      });
      toast.error("Couldn't update Watchlist");
    }
  }, [watchlist]);

  // Thumbs up/down on a recommendation. Optimistic UI update; clicking the
  // already-active choice clears it (un-like / un-dislike) instead of
  // toggling straight to the opposite, since "neither" is a valid state.
  const handleFeedback = useCallback((id, type) => {
    setFeedback((prev) => {
      const current = prev[id] ?? {};
      const isActive = current[type];
      const next = {
        liked: type === "liked" ? !isActive : false,
        disliked: type === "disliked" ? !isActive : false,
      };
      postRecommendationFeedback({ movieId: id, ...next }).catch(() => {
        // Revert this one entry on failure without disturbing others.
        setFeedback((p) => ({ ...p, [id]: current }));
        toast.error("Couldn't save your feedback");
      });
      return { ...prev, [id]: next };
    });
  }, []);

  const handleViewDetails = useCallback(async (id) => {
    const basic = items.find((m) => m.id === id) ?? null;
    setDetailsMovie(basic);
    setDetailsFull(null);
    setDetailsLoading(true);
    // Opening the details modal is a real interaction, not just a hover —
    // log it as a click, fire-and-forget so it never blocks the UI.
    postRecommendationFeedback({ movieId: id, clicked: true }).catch(() => {});
    try {
      const res = await getMovieById(id);
      setDetailsFull(res.data);
    } catch {
      // keep showing the basic card data with an inline notice below
    } finally {
      setDetailsLoading(false);
    }
  }, [items]);

  const displayName = user?.username ?? user?.name ?? user?.email?.split("@")[0] ?? "there";
  const isLoading = authLoading || status === "loading";

  return (
    <div className="recs-root">
      <div className="recs-glow recs-glow-tl" />
      <div className="recs-glow recs-glow-br" />

      {/* Nav */}
      <nav className="recs-nav">
        <Link to="/" className="recs-nav-logo">
          <Clapperboard size={20} strokeWidth={1.8} className="recs-logo-icon" />
          <span className="recs-logo-text">Next<span className="recs-logo-accent">Watch</span></span>
        </Link>
        <div className="recs-nav-right">
          <Link to="/dashboard" className="recs-nav-link recs-nav-link--ghost">Dashboard</Link>
          <Link to="/mood" className="recs-nav-link">
            <SmilePlus size={13} strokeWidth={2} /> Update Mood
          </Link>
          <div className="recs-nav-user">
            <div className="recs-avatar" title={displayName}>{getInitials(displayName)}</div>
            <span className="recs-nav-username">{displayName}</span>
          </div>
          <button type="button" onClick={logout} className="recs-nav-signout">
            <LogOut size={13} strokeWidth={2} />
            <span className="recs-nav-signout-label">Sign out</span>
          </button>
        </div>
      </nav>

      <main className="recs-main">
        <button type="button" className="bb-back-btn" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={15} strokeWidth={2} />
          Back
        </button>

        {/* Page header */}
        <div className="recs-page-header">
          <div>
            <p className="recs-eyebrow"><Sparkles size={13} strokeWidth={2} /> Tailored picks</p>
            <h1 className="recs-title">Recommended For You</h1>
            <p className="recs-subtitle">
              {selectedMood
                ? `Showing movies for your "${selectedMood}" mood. Click the mood again to reset.`
                : "Built from your mood, favorite genres, viewing history, and ratings."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => selectedMood ? fetchByMood(selectedMood) : fetchRecommendations()}
            disabled={isLoading}
            className="recs-refresh-btn"
          >
            {isLoading
              ? <Loader2 size={15} strokeWidth={2} className="recs-spin" />
              : <RefreshCw size={15} strokeWidth={2} />}
            Refresh Recommendations
          </button>
        </div>

        {/* Mood selector */}
        <div className="recs-mood-section">
          <p className="recs-mood-label">How are you feeling?</p>
          <div className="recs-mood-row">
            {MOODS.map(({ label, icon: Icon, color }) => (
              <button
                key={label}
                type="button"
                onClick={() => handleMoodSelect(label)}
                className={`recs-mood-chip ${selectedMood === label ? "recs-mood-chip--active" : ""}`}
              >
                <Icon size={14} strokeWidth={2} className="recs-mood-icon" style={{ color }} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {source === "fallback" && status === "success" && items.length > 0 && (
          <div className="recs-fallback-banner">
            <TrendingUp size={14} strokeWidth={2} />
            Showing trending picks while we learn your taste — log a mood or rate a few movies to personalize these further.
          </div>
        )}

        {/* Content */}
        {isLoading && (
          <div className="recs-grid">
            {Array.from({ length: 8 }).map((_, i) => <RecommendationSkeletonCard key={i} />)}
          </div>
        )}

        {!isLoading && status === "error" && (
          <ErrorState message={errorMessage} onRetry={() => selectedMood ? fetchByMood(selectedMood) : fetchRecommendations()} />
        )}

        {!isLoading && status === "success" && items.length === 0 && (
          <EmptyState selectedMood={selectedMood} />
        )}

        {!isLoading && (status === "success" || status === "idle") && items.length > 0 && (
          <div className="recs-grid">
            {items.map((movie) => (
              <RecommendationCard
                key={movie.id}
                movie={movie}
                isInWatchlist={watchlist.has(movie.id)}
                feedback={feedback[movie.id]}
                onFeedback={handleFeedback}
                onAddToWatchlist={handleAddToWatchlist}
                onViewDetails={handleViewDetails}
                onWhyRecommended={setActiveMovie}
              />
            ))}
          </div>
        )}
      </main>

      {activeMovie && (
        <WhyRecommendedModal movie={activeMovie} onClose={() => setActiveMovie(null)} />
      )}

      {detailsMovie && (
        <MovieDetailsModal
          basic={detailsMovie}
          full={detailsFull}
          loading={detailsLoading}
          isInWatchlist={watchlist.has(detailsMovie.id)}
          feedback={feedback[detailsMovie.id]}
          onFeedback={handleFeedback}
          onAddToWatchlist={handleAddToWatchlist}
          onClose={() => { setDetailsMovie(null); setDetailsFull(null); }}
        />
      )}
    </div>
  );
}

function RecommendationCard({ movie, isInWatchlist, feedback, onFeedback, onAddToWatchlist, onViewDetails, onWhyRecommended }) {
  const [imgError, setImgError] = useState(false);
  const { id, title, posterUrl, genres, rating, releaseYear, score, reason } = movie;
  const ratingDisplay = rating > 0 ? rating.toFixed(1) : null;
  const scorePercent = formatScorePercent(score);
  const hasPoster = posterUrl && !imgError;
  const visibleGenres = genres.slice(0, 3);
  const isLiked = !!feedback?.liked;
  const isDisliked = !!feedback?.disliked;

  return (
    <article className="recs-card">
      <div className="recs-poster">
        {hasPoster ? (
          <img src={posterUrl} alt={title} loading="lazy" onError={() => setImgError(true)} className="recs-poster-img" />
        ) : (
          <div className="recs-poster-fallback" style={{ background: titleToGradient(title) }}>
            <span>{title.charAt(0).toUpperCase()}</span>
          </div>
        )}
        {ratingDisplay && (
          <div className="recs-badge recs-badge--rating">
            <Star size={9} strokeWidth={0} fill="#fbbf24" />{ratingDisplay}
          </div>
        )}
        {releaseYear && <div className="recs-badge recs-badge--year">{releaseYear}</div>}
        <div className="recs-feedback-row">
          <button
            type="button"
            className={`recs-feedback-btn recs-feedback-btn--like ${isLiked ? "is-active" : ""}`}
            onClick={() => onFeedback(id, "liked")}
            aria-label={isLiked ? "Remove like" : "Like this recommendation"}
            aria-pressed={isLiked}
          >
            <ThumbsUp size={13} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            className={`recs-feedback-btn recs-feedback-btn--dislike ${isDisliked ? "is-active" : ""}`}
            onClick={() => onFeedback(id, "disliked")}
            aria-label={isDisliked ? "Remove dislike" : "Dislike this recommendation"}
            aria-pressed={isDisliked}
          >
            <ThumbsDown size={13} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div className="recs-card-body">
        <h3 className="recs-card-title">{title}</h3>
        {visibleGenres.length > 0 && (
          <div className="recs-genre-row">
            {visibleGenres.map((g) => <span key={g} className="recs-genre-chip">{g}</span>)}
          </div>
        )}
        {scorePercent !== null ? (
          <div className="recs-score">
            <div className="recs-score-bar"><div className="recs-score-fill" style={{ width: `${scorePercent}%` }} /></div>
            <span className="recs-score-label">{scorePercent}% match</span>
          </div>
        ) : (
          <div className="recs-score recs-score--trending">
            <TrendingUp size={12} strokeWidth={2} />
            <span className="recs-score-label">Trending pick</span>
          </div>
        )}
        <p className="recs-reason">{reason}</p>
        <button type="button" className="recs-why-btn" onClick={() => onWhyRecommended(movie)}>
          <HelpCircle size={12} strokeWidth={2} /> Why recommended?
        </button>
        <div className="recs-card-actions">
          <button type="button" onClick={() => onViewDetails(id)} className="recs-btn recs-btn--details">
            <Eye size={13} strokeWidth={2} /> Details
          </button>
          <button
            type="button"
            onClick={() => onAddToWatchlist(id, title)}
            className={`recs-btn recs-btn--watchlist ${isInWatchlist ? "is-saved" : ""}`}
          >
            {isInWatchlist ? <BookmarkCheck size={13} strokeWidth={2.5} /> : <Bookmark size={13} strokeWidth={2} />}
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
      <div className="recs-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="recs-modal-close" onClick={onClose}><X size={16} strokeWidth={2} /></button>
        <div className="recs-modal-icon"><HelpCircle size={22} strokeWidth={1.8} /></div>
        <p className="recs-modal-eyebrow">Why Recommended?</p>
        <h2 className="recs-modal-title">{movie.title}</h2>
        {scorePercent !== null && (
          <div className="recs-modal-score">
            <div className="recs-score-bar"><div className="recs-score-fill" style={{ width: `${scorePercent}%` }} /></div>
            <span className="recs-score-label">{scorePercent}% match</span>
          </div>
        )}
        <p className="recs-modal-reason">{movie.reason}</p>
        <button type="button" className="recs-modal-ok" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

function MovieDetailsModal({ basic, full, loading, isInWatchlist, feedback, onFeedback, onAddToWatchlist, onClose }) {
  const [imgError, setImgError] = useState(false);
  const movie = { ...basic, ...(full ?? {}) };
  const title = movie.title ?? "Untitled";
  const posterUrl = movie.posterUrl ?? basic.posterUrl ?? null;
  const genres = movie.genres ?? [];
  const rating = Number(movie.rating ?? movie.averageScore ?? basic.rating ?? 0) || 0;
  const releaseYear = movie.releaseYear ?? basic.releaseYear ?? null;
  const contentType = movie.contentType ?? basic.contentType ?? null;
  const hasPoster = posterUrl && !imgError;
  const isLiked = !!feedback?.liked;
  const isDisliked = !!feedback?.disliked;

  return (
    <div className="recs-modal-backdrop" onClick={onClose}>
      <div className="recs-modal recs-details-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="recs-modal-close" onClick={onClose}><X size={16} strokeWidth={2} /></button>

        <div className="recs-details-body">
          <div className="recs-details-poster">
            {hasPoster ? (
              <img src={posterUrl} alt={title} onError={() => setImgError(true)} />
            ) : (
              <div className="recs-details-poster-fallback" style={{ background: titleToGradient(title) }}>
                <span>{title.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>

          <div className="recs-details-info">
            <div className="recs-details-title-row">
              <h2 className="recs-modal-title" style={{ textAlign: "left" }}>{title}</h2>
              <div className="recs-feedback-row recs-feedback-row--inline">
                <button
                  type="button"
                  className={`recs-feedback-btn recs-feedback-btn--like ${isLiked ? "is-active" : ""}`}
                  onClick={() => onFeedback(basic.id, "liked")}
                  aria-label={isLiked ? "Remove like" : "Like this recommendation"}
                  aria-pressed={isLiked}
                >
                  <ThumbsUp size={14} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  className={`recs-feedback-btn recs-feedback-btn--dislike ${isDisliked ? "is-active" : ""}`}
                  onClick={() => onFeedback(basic.id, "disliked")}
                  aria-label={isDisliked ? "Remove dislike" : "Dislike this recommendation"}
                  aria-pressed={isDisliked}
                >
                  <ThumbsDown size={14} strokeWidth={2.2} />
                </button>
              </div>
            </div>

            <div className="recs-details-meta">
              {rating > 0 && (
                <span className="recs-details-meta-rating">
                  <Star size={12} strokeWidth={0} fill="#fbbf24" /> {rating.toFixed(1)}
                </span>
              )}
              {releaseYear && <span>{releaseYear}</span>}
              {contentType && <span style={{ textTransform: "capitalize" }}>{contentType}</span>}
            </div>

            {genres.length > 0 && (
              <div className="recs-genre-row">
                {genres.map((g) => <span key={g} className="recs-genre-chip">{g}</span>)}
              </div>
            )}

            {loading ? (
              <p className="recs-details-desc recs-details-desc--loading">Loading description…</p>
            ) : (
              <p className="recs-details-desc">
                {movie.description?.trim() || "No description available for this title yet."}
              </p>
            )}

            <div className="recs-details-actions">
              <button
                type="button"
                onClick={() => onAddToWatchlist(basic.id, title)}
                className={`recs-btn recs-btn--watchlist ${isInWatchlist ? "is-saved" : ""}`}
              >
                {isInWatchlist ? <BookmarkCheck size={13} strokeWidth={2.5} /> : <Bookmark size={13} strokeWidth={2} />}
                {isInWatchlist ? "Saved" : "Watchlist"}
              </button>
              <button type="button" className="recs-btn recs-btn--details" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
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

function EmptyState({ selectedMood }) {
  return (
    <div className="recs-state-card">
      <div className="recs-state-icon"><Compass size={26} strokeWidth={1.5} /></div>
      <h2 className="recs-state-title">
        {selectedMood ? `No movies found for "${selectedMood}" mood` : "No recommendations yet"}
      </h2>
      <p className="recs-state-body">
        {selectedMood
          ? "No movies are tagged with this mood yet. Try a different mood or add movies via the admin panel."
          : "Log how you're feeling and pick a few favorite genres so we can start personalizing picks for you."}
      </p>
      <div className="recs-state-actions">
        <Link to="/mood" className="recs-btn recs-btn--details">Set Your Mood</Link>
        <Link to="/preferences" className="recs-btn recs-btn--watchlist">Choose Genres</Link>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="recs-state-card recs-state-card--error">
      <div className="recs-state-icon recs-state-icon--error"><AlertCircle size={26} strokeWidth={1.5} /></div>
      <h2 className="recs-state-title">Couldn't load recommendations</h2>
      <p className="recs-state-body">{message}</p>
      <button type="button" onClick={onRetry} className="recs-retry-btn">
        <RefreshCw size={14} strokeWidth={2} /> Try Again
      </button>
    </div>
  );
}
