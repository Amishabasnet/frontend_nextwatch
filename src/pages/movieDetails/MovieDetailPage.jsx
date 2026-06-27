import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Clapperboard,
  ArrowLeft,
  Star,
  Clock,
  Calendar,
  Globe,
  User,
  Users,
  Bookmark,
  BookmarkCheck,
  Play,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Tag,
  Hash,
  LogOut,
  SmilePlus,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  Trash2,
  CheckCircle,
  TriangleAlert,
} from "lucide-react";
import {
  getMovieById,
  postHistory,
  postWatchlist,
  deleteWatchlist,
  getWatchlist,
  postRating,
  getRatingsByMovie,
  putRating,
  deleteRating,
  getRecommendations,
} from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import GenreBadge from "../../components/GenreBadge";
import "./MovieDetailsPage.css";

function titleToGradient(title = "") {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash) + title.charCodeAt(i);
    hash |= 0;
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 60) % 360;
  return `linear-gradient(155deg, hsl(${h1},45%,20%) 0%, hsl(${h2},35%,11%) 100%)`;
}

function getInitials(name = "") {
  return name.split(" ").map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
}

function formatDuration(minutes) {
  if (!minutes || isNaN(Number(minutes))) return null;
  const m = Number(minutes);
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

function normalizeMovie(raw) {
  if (!raw) return null;
  const movie = raw.movie ?? raw;
  return {
    id:          movie._id ?? movie.id ?? movie.movieId,
    title:       movie.title ?? "Untitled",
    description: movie.description ?? movie.overview ?? movie.plot ?? null,
    posterUrl:   movie.posterUrl ?? movie.poster_url ?? null,
    backdropUrl: movie.backdropUrl ?? movie.backdrop_url ?? null,
    genres:      Array.isArray(movie.genres) ? movie.genres.filter(Boolean) : [],
    releaseYear: movie.releaseYear ?? movie.release_year ?? movie.year ?? null,
    duration:    movie.duration ?? movie.runtime ?? null,
    rating:      Number(movie.rating ?? movie.averageScore ?? movie.voteAverage ?? 0) || 0,
    cast:        Array.isArray(movie.cast) ? movie.cast.filter(Boolean) : [],
    director:    movie.director ?? null,
    language:    movie.language ?? movie.originalLanguage ?? null,
    trailerUrl:  movie.trailerUrl ?? movie.trailer_url ?? movie.trailer ?? null,
    moodTags:    Array.isArray(movie.moodTags) ? movie.moodTags.filter(Boolean) : [],
    keywords:    Array.isArray(movie.keywords) ? movie.keywords.filter(Boolean) : [],
    userRating:  movie.userRating ?? null,
  };
}

export default function MovieDetailsPage() {
  const { id } = useParams();
  const { user, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [movie, setMovie]             = useState(null);
  const [status, setStatus]           = useState("loading");
  const [errorMsg, setErrorMsg]       = useState("");
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);

  // Full rating panel state
  const [existingRating, setExistingRating]   = useState(null); // rating object from API
  const [ratingStatus, setRatingStatus]       = useState("idle"); // idle|loading|submitting|deleting
  const [isEditing, setIsEditing]             = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const historyPosted = useRef(false);

  const displayName = user?.username ?? user?.name ?? user?.email?.split("@")[0] ?? "there";

  const fetchMovie = useCallback(async () => {
    if (!id) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await getMovieById(id);
      const m = normalizeMovie(res.data);
      setMovie(m);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err.response?.data?.message ?? "Couldn't load movie details.");
      setStatus("error");
    }
  }, [id]);

  const fetchExistingRating = useCallback(async () => {
    if (!id) return;
    setRatingStatus("loading");
    try {
      const res = await getRatingsByMovie(id);
      const list = Array.isArray(res.data) ? res.data : (res.data?.ratings ?? []);
      // Find this user's rating
      const userId = user?._id ?? user?.id;
      const mine = list.find(
        (r) => (r.userId ?? r.user?._id ?? r.user?.id) === userId
      ) ?? null;
      setExistingRating(mine);
    } catch {
      // non-critical — user just can't see/edit their prior rating
    } finally {
      setRatingStatus("idle");
    }
  }, [id, user]);

  const fetchWatchlistStatus = useCallback(async () => {
    try {
      const res = await getWatchlist();
      const items = Array.isArray(res.data) ? res.data : (res.data?.watchlist ?? []);
      const inList = items.some((i) => (i.movieId ?? i._id ?? i.id) === id);
      setInWatchlist(inList);
    } catch {
      // non-critical
    }
  }, [id]);

  // Post view history once per page load
  useEffect(() => {
    if (!id || historyPosted.current || authLoading) return;
    historyPosted.current = true;
    postHistory({ movieId: id, actionType: "viewed" }).catch(() => {});
  }, [id, authLoading]);

  useEffect(() => {
    if (!authLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchMovie();
      fetchWatchlistStatus();
      fetchExistingRating();
    }
  }, [authLoading, fetchMovie, fetchWatchlistStatus, fetchExistingRating]);

  // Trap scroll when trailer modal open
  useEffect(() => {
    if (trailerOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [trailerOpen]);

  // Close trailer on Escape
  useEffect(() => {
    if (!trailerOpen) return;
    const fn = (e) => { if (e.key === "Escape") setTrailerOpen(false); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [trailerOpen]);

  const handleWatchlist = async () => {
    if (watchlistLoading) return;
    setWatchlistLoading(true);
    const prev = inWatchlist;
    setInWatchlist(!prev);
    try {
      if (prev) {
        await deleteWatchlist(id);
        toast("Removed from Watchlist", { icon: "🗑️", theme: "dark" });
      } else {
        await postWatchlist({ movieId: id });
        toast.success(`Added "${movie?.title}" to Watchlist`);
      }
    } catch {
      setInWatchlist(prev);
      toast.error("Couldn't update Watchlist");
    } finally {
      setWatchlistLoading(false);
    }
  };

  const handleSubmitRating = useCallback(async (formData) => {
    const { stars, sentiment, feedback } = formData;
    setRatingStatus("submitting");
    try {
      let saved;
      if (existingRating && !isEditing) {
        // Shouldn't happen, but guard anyway
        return;
      }
      if (existingRating) {
        // Update
        const res = await putRating(existingRating._id ?? existingRating.id, {
          rating: stars, sentiment, feedback, movieId: id,
        });
        saved = res.data?.rating ?? res.data ?? { ...existingRating, rating: stars, sentiment, feedback };
        toast.success("Rating updated!");
      } else {
        // Create
        const res = await postRating({ movieId: id, rating: stars, sentiment, feedback });
        saved = res.data?.rating ?? res.data ?? { rating: stars, sentiment, feedback };
        toast.success("Rating submitted!");
      }
      setExistingRating(saved);
      setIsEditing(false);

      // Record rated action in history
      postHistory({ movieId: id, action: "rated" }).catch(() => {});

      // Refresh recommendations (non-blocking)
      const userId = user?._id ?? user?.id;
      if (userId) getRecommendations(userId).catch(() => {});

    } catch (err) {
      toast.error(err.response?.data?.message ?? "Couldn't save your rating.");
    } finally {
      setRatingStatus("idle");
    }
  }, [existingRating, isEditing, id, user]);

  const handleDeleteRating = useCallback(async () => {
    if (!existingRating) return;
    setShowDeleteModal(false);
    setRatingStatus("deleting");
    try {
      await deleteRating(existingRating._id ?? existingRating.id);
      setExistingRating(null);
      setIsEditing(false);
      toast("Rating removed", { icon: "🗑️", theme: "dark" });
    } catch (err) {
      toast.error(err.response?.data?.message ?? "Couldn't delete your rating.");
    } finally {
      setRatingStatus("idle");
    }
  }, [existingRating]);

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&?/\s]+)/);
    if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
    if (url.includes("youtube.com/embed/")) return url;
    return null;
  };

  const embedUrl = movie?.trailerUrl ? getYouTubeEmbedUrl(movie.trailerUrl) : null;

  const isLoading = authLoading || status === "loading";

  return (
    <div className="md-root">
      <div className="md-glow md-glow-tl" />
      <div className="md-glow md-glow-br" />

      {/* Nav */}
      <nav className="md-nav">
        <Link to="/" className="md-nav-logo">
          <Clapperboard size={20} strokeWidth={1.8} className="md-logo-icon" />
          <span className="md-logo-text">Next<span className="md-logo-accent">Watch</span></span>
        </Link>

        <div className="md-nav-right">
          <Link to="/movies" className="md-nav-link md-nav-link--ghost">All Movies</Link>
          <Link to="/mood" className="md-nav-link">
            <SmilePlus size={13} strokeWidth={2} />
            Mood
          </Link>
          <div className="md-nav-user">
            <div className="md-avatar" title={displayName}>{getInitials(displayName)}</div>
            <span className="md-nav-username">{displayName}</span>
          </div>
          <button type="button" onClick={logout} className="md-nav-signout">
            <LogOut size={13} strokeWidth={2} />
            <span className="md-nav-signout-label">Sign out</span>
          </button>
        </div>
      </nav>

      <main className="md-main">
        {/* Back */}
        <button type="button" className="md-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} strokeWidth={2} />
          Back
        </button>

        {/* Loading */}
        {isLoading && <DetailsSkeleton />}

        {/* Error */}
        {!isLoading && status === "error" && (
          <ErrorState message={errorMsg} onRetry={fetchMovie} />
        )}

        {/* Content */}
        {!isLoading && status === "success" && movie && (
          <MovieContent
            movie={movie}
            inWatchlist={inWatchlist}
            watchlistLoading={watchlistLoading}
            onWatchlist={handleWatchlist}
            embedUrl={embedUrl}
            trailerOpen={trailerOpen}
            setTrailerOpen={setTrailerOpen}
            existingRating={existingRating}
            ratingStatus={ratingStatus}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            onSubmitRating={handleSubmitRating}
            onDeleteRating={() => setShowDeleteModal(true)}
          />
        )}
      </main>

      {/* Trailer Modal */}
      {trailerOpen && embedUrl && (
        <div className="md-trailer-backdrop" onClick={() => setTrailerOpen(false)}>
          <div className="md-trailer-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="md-trailer-close" onClick={() => setTrailerOpen(false)}>
              <X size={18} strokeWidth={2} />
            </button>
            <iframe
              src={embedUrl}
              title="Movie Trailer"
              allow="autoplay; fullscreen"
              allowFullScreen
              className="md-trailer-iframe"
            />
          </div>
        </div>
      )}

      {/* Rating delete confirmation */}
      {showDeleteModal && (
        <RatingDeleteModal
          onConfirm={handleDeleteRating}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}

function MovieContent({
  movie, inWatchlist, watchlistLoading, onWatchlist,
  embedUrl, setTrailerOpen,
  existingRating, ratingStatus, isEditing, setIsEditing,
  onSubmitRating, onDeleteRating,
}) {
  const [imgError, setImgError] = useState(false);
  const {
    title, description, posterUrl, genres, releaseYear, duration,
    rating, cast, director, language, moodTags, keywords,
  } = movie;

  const hasPoster = posterUrl && !imgError;
  const ratingDisplay = rating > 0 ? Number(rating).toFixed(1) : null;
  const durationDisplay = formatDuration(duration);

  return (
    <div className="md-content">
      {/* Hero — poster + info */}
      <div className="md-hero">
        {/* Poster */}
        <div className="md-poster-wrap">
          {hasPoster ? (
            <img
              src={posterUrl}
              alt={title}
              onError={() => setImgError(true)}
              className="md-poster-img"
            />
          ) : (
            <div className="md-poster-fallback" style={{ background: titleToGradient(title) }}>
              <span>{title.charAt(0).toUpperCase()}</span>
            </div>
          )}
          {ratingDisplay && (
            <div className="md-poster-rating">
              <Star size={12} strokeWidth={0} fill="#fbbf24" />
              {ratingDisplay}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="md-info">
          <h1 className="md-movie-title">{title}</h1>

          {/* Meta pills */}
          <div className="md-meta-row">
            {releaseYear && (
              <span className="md-meta-pill">
                <Calendar size={13} strokeWidth={2} />
                {releaseYear}
              </span>
            )}
            {durationDisplay && (
              <span className="md-meta-pill">
                <Clock size={13} strokeWidth={2} />
                {durationDisplay}
              </span>
            )}
            {language && (
              <span className="md-meta-pill">
                <Globe size={13} strokeWidth={2} />
                {language.toUpperCase()}
              </span>
            )}
            {ratingDisplay && (
              <span className="md-meta-pill md-meta-pill--rating">
                <Star size={13} strokeWidth={0} fill="#fbbf24" />
                {ratingDisplay} / 10
              </span>
            )}
          </div>

          {/* Genres */}
          {genres.length > 0 && (
            <div className="md-genres-row">
              {genres.map((g) => <GenreBadge key={g} genre={g} size="md" />)}
            </div>
          )}

          {/* Description */}
          {description && <p className="md-description">{description}</p>}

          {/* Actions */}
          <div className="md-actions">
            <button
              type="button"
              className={`md-watchlist-btn ${inWatchlist ? "md-watchlist-btn--saved" : ""}`}
              onClick={onWatchlist}
              disabled={watchlistLoading}
            >
              {watchlistLoading ? (
                <Loader2 size={15} strokeWidth={2} className="md-spin" />
              ) : inWatchlist ? (
                <BookmarkCheck size={15} strokeWidth={2.5} />
              ) : (
                <Bookmark size={15} strokeWidth={2} />
              )}
              {inWatchlist ? "Saved to Watchlist" : "Add to Watchlist"}
            </button>

            {embedUrl && (
              <button
                type="button"
                className="md-trailer-btn"
                onClick={() => setTrailerOpen(true)}
              >
                <Play size={15} strokeWidth={2} fill="currentColor" />
                Watch Trailer
              </button>
            )}
          </div>

          {/* Director */}
          {director && (
            <div className="md-director">
              <User size={14} strokeWidth={2} className="md-director-icon" />
              <span className="md-director-label">Director</span>
              <span className="md-director-name">{director}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom sections */}
      <div className="md-sections">
        {/* Cast */}
        {cast.length > 0 && (
          <section className="md-section">
            <h2 className="md-section-title">
              <Users size={16} strokeWidth={2} />
              Cast
            </h2>
            <div className="md-cast-grid">
              {cast.map((actor, i) => {
                const name = typeof actor === "string" ? actor : (actor.name ?? actor.actor ?? String(actor));
                const role = typeof actor === "object" ? (actor.character ?? actor.role ?? null) : null;
                return (
                  <div key={i} className="md-cast-card">
                    <div className="md-cast-avatar">{getInitials(name)}</div>
                    <div>
                      <div className="md-cast-name">{name}</div>
                      {role && <div className="md-cast-role">{role}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Mood Tags */}
        {moodTags.length > 0 && (
          <section className="md-section">
            <h2 className="md-section-title">
              <Tag size={16} strokeWidth={2} />
              Mood Tags
            </h2>
            <div className="md-tags-row">
              {moodTags.map((tag) => (
                <span key={tag} className="md-mood-tag">{tag}</span>
              ))}
            </div>
          </section>
        )}

        {/* Keywords */}
        {keywords.length > 0 && (
          <section className="md-section">
            <h2 className="md-section-title">
              <Hash size={16} strokeWidth={2} />
              Keywords
            </h2>
            <div className="md-tags-row">
              {keywords.map((kw) => (
                <span key={kw} className="md-keyword-tag">{kw}</span>
              ))}
            </div>
          </section>
        )}

        {/* Full Rating Panel */}
        <RatingPanel
          existingRating={existingRating}
          ratingStatus={ratingStatus}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          onSubmit={onSubmitRating}
          onDelete={onDeleteRating}
        />
      </div>
    </div>
  );
}

const SENTIMENTS = [
  { value: "like",    label: "Like",    Icon: ThumbsUp },
  { value: "dislike", label: "Dislike", Icon: ThumbsDown },
];

function RatingPanel({ existingRating, ratingStatus, isEditing, setIsEditing, onSubmit, onDelete }) {
  const hasRating  = !!existingRating;
  
  const isBusy     = ratingStatus === "submitting" || ratingStatus === "deleting";

  // Form state (seeded from existingRating when editing)
  const [stars,     setStars]     = useState(existingRating?.rating ?? 0);
  const [hovered,   setHovered]   = useState(0);
  const [sentiment, setSentiment] = useState(existingRating?.sentiment ?? "");
  const [feedback,  setFeedback]  = useState(existingRating?.feedback ?? "");
  const [errors,    setErrors]    = useState({});

  // Re-seed when switching to edit mode or when existingRating changes
  useEffect(() => {
    if (isEditing || !hasRating) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStars(existingRating?.rating ?? 0);
      setSentiment(existingRating?.sentiment ?? "");
      setFeedback(existingRating?.feedback ?? "");
      setErrors({});
    }
  }, [isEditing, existingRating, hasRating]);

  const validate = () => {
    const e = {};
    if (!stars || stars < 1 || stars > 5) e.stars = "Please select a rating between 1 and 5.";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    onSubmit({ stars, sentiment, feedback });
  };

  const displayStars = hovered || stars;

  // Read-only view for an existing, non-editing rating
  if (hasRating && !isEditing) {
    const { rating: r, sentiment: s, feedback: f } = existingRating;
    return (
      <section className="md-section md-rating-section">
        <div className="md-rp-header">
          <h2 className="md-section-title">
            <Star size={16} strokeWidth={2} />
            Your Rating
          </h2>
          <div className="md-rp-header-actions">
            <button
              type="button"
              className="md-rp-edit-btn"
              onClick={() => setIsEditing(true)}
              disabled={isBusy}
            >
              <Pencil size={13} strokeWidth={2} />
              Edit
            </button>
            <button
              type="button"
              className="md-rp-delete-btn"
              onClick={onDelete}
              disabled={isBusy}
            >
              {ratingStatus === "deleting"
                ? <Loader2 size={13} className="md-spin" />
                : <Trash2 size={13} strokeWidth={2} />
              }
              Delete
            </button>
          </div>
        </div>

        {/* Submitted stars */}
        <div className="md-rp-submitted-stars">
          {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
            <Star
              key={n}
              size={28}
              strokeWidth={1.4}
              fill={r >= n ? "#fbbf24" : "transparent"}
              color={r >= n ? "#fbbf24" : "#3b3b52"}
            />
          ))}
          <span className="md-rp-score-label">{r} / 5</span>
        </div>

        {/* Sentiment */}
        {s && (
          <div className={`md-rp-sentiment-display md-rp-sentiment-display--${s}`}>
            {s === "like"
              ? <ThumbsUp  size={14} strokeWidth={2} />
              : <ThumbsDown size={14} strokeWidth={2} />
            }
            You {s === "like" ? "liked" : "disliked"} this movie
          </div>
        )}

        {/* Feedback */}
        {f && (
          <div className="md-rp-feedback-display">
            <p className="md-rp-feedback-label">Your feedback</p>
            <p className="md-rp-feedback-text">"{f}"</p>
          </div>
        )}

        <div className="md-rp-success-badge">
          <CheckCircle size={13} strokeWidth={2.5} />
          Rating submitted
        </div>
      </section>
    );
  }

  return (
    <section className="md-section md-rating-section">
      <div className="md-rp-header">
        <h2 className="md-section-title">
          <Star size={16} strokeWidth={2} />
          {isEditing ? "Edit Your Rating" : "Rate This Movie"}
        </h2>
        {isEditing && (
          <button
            type="button"
            className="md-rp-cancel-btn"
            onClick={() => setIsEditing(false)}
            disabled={isBusy}
          >
            <X size={13} strokeWidth={2} />
            Cancel
          </button>
        )}
      </div>

      {/* Star picker 1–5 */}
      <div className="md-rp-star-group">
        <p className="md-rp-field-label">Star Rating <span className="md-rp-required">*</span></p>
        <div
          className="md-rp-stars"
          onMouseLeave={() => setHovered(0)}
        >
          {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className={`md-rp-star-btn ${displayStars >= n ? "md-rp-star-btn--active" : ""}`}
              onMouseEnter={() => setHovered(n)}
              onClick={() => { setStars(n); setErrors((e) => ({ ...e, stars: undefined })); }}
              disabled={isBusy}
              aria-label={`${n} star${n !== 1 ? "s" : ""}`}
            >
              <Star
                size={36}
                strokeWidth={1.3}
                fill={displayStars >= n ? "#fbbf24" : "transparent"}
                color={displayStars >= n ? "#fbbf24" : "#3b3b52"}
              />
            </button>
          ))}
          {stars > 0 && (
            <span className="md-rp-star-score">{stars} / 5</span>
          )}
        </div>
        {errors.stars && <p className="md-rp-error">{errors.stars}</p>}
      </div>

      {/* Sentiment */}
      <div className="md-rp-field-group">
        <p className="md-rp-field-label">Did you like it?</p>
        <div className="md-rp-sentiment-row">
          {SENTIMENTS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              className={`md-rp-sentiment-btn md-rp-sentiment-btn--${value} ${sentiment === value ? "md-rp-sentiment-btn--active" : ""}`}
              onClick={() => setSentiment(sentiment === value ? "" : value)}
              disabled={isBusy}
            >
              <Icon size={15} strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback */}
      <div className="md-rp-field-group">
        <label className="md-rp-field-label" htmlFor="md-rp-feedback">
          Feedback <span className="md-rp-optional">(optional)</span>
        </label>
        <textarea
          id="md-rp-feedback"
          className="md-rp-textarea"
          placeholder="What did you think? Any standout moments, performances, or criticisms…"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
          maxLength={500}
          disabled={isBusy}
        />
        <p className="md-rp-char-count">{feedback.length} / 500</p>
      </div>

      {/* Submit */}
      <button
        type="button"
        className="md-rp-submit-btn"
        onClick={handleSubmit}
        disabled={isBusy}
      >
        {ratingStatus === "submitting"
          ? <><Loader2 size={15} className="md-spin" /> Saving…</>
          : isEditing
            ? <><CheckCircle size={15} strokeWidth={2.5} /> Update Rating</>
            : <><Star size={15} strokeWidth={2} /> Submit Rating</>
        }
      </button>
    </section>
  );
}

function RatingDeleteModal({ onConfirm, onCancel }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div className="md-modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="md-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="md-modal-close" onClick={onCancel}>
          <X size={15} strokeWidth={2} />
        </button>
        <div className="md-modal-icon-wrap">
          <TriangleAlert size={24} strokeWidth={1.8} />
        </div>
        <h2 className="md-modal-title">Delete your rating?</h2>
        <p className="md-modal-body">
          Your star rating, sentiment, and feedback will be permanently removed.
        </p>
        <div className="md-modal-actions">
          <button type="button" className="md-modal-cancel" onClick={onCancel}>Keep It</button>
          <button type="button" className="md-modal-confirm" onClick={onConfirm}>
            <Trash2 size={13} strokeWidth={2} />
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="md-content md-skeleton" aria-hidden="true">
      <div className="md-hero">
        <div className="md-sk md-sk-poster" />
        <div className="md-info">
          <div className="md-sk md-sk-title" />
          <div className="md-sk md-sk-meta" />
          <div className="md-sk md-sk-desc" />
          <div className="md-sk md-sk-desc md-sk-desc--short" />
          <div className="md-sk md-sk-actions" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="md-error-state">
      <AlertCircle size={28} strokeWidth={1.5} className="md-error-icon" />
      <h2 className="md-error-title">Couldn't load movie</h2>
      <p className="md-error-body">{message}</p>
      <button type="button" onClick={onRetry} className="md-retry-btn">
        <RefreshCw size={14} strokeWidth={2} />
        Try Again
      </button>
    </div>
  );
}
