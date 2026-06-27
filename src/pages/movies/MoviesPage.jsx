import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Clapperboard,
  Film,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Star,
  Calendar,
  ArrowUpDown,
  LogOut,
  SmilePlus,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { getMovies, postWatchlist, deleteWatchlist, getWatchlist } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import GenreBadge from "../../components/GenreBadge";
import "./MoviesPage.css";

const PAGE_SIZE = 24;

function normalizeMovie(raw) {
  if (!raw) return null;
  return {
    id: raw._id ?? raw.id ?? raw.movieId ?? String(Math.random()),
    title: raw.title ?? "Untitled",
    posterUrl: raw.posterUrl ?? raw.poster_url ?? null,
    genres: Array.isArray(raw.genres) ? raw.genres.filter(Boolean) : [],
    rating: Number(raw.rating ?? raw.averageScore ?? raw.voteAverage ?? 0) || 0,
    releaseYear: raw.releaseYear ?? raw.release_year ?? raw.year ?? null,
    description: raw.description ?? raw.overview ?? null,
    duration: raw.duration ?? raw.runtime ?? null,
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

const SORT_OPTIONS = [
  { value: "title_asc",    label: "Title A–Z",     icon: ArrowUpDown },
  { value: "title_desc",   label: "Title Z–A",     icon: ArrowUpDown },
  { value: "rating_desc",  label: "Highest Rated", icon: Star },
  { value: "rating_asc",   label: "Lowest Rated",  icon: Star },
  { value: "year_desc",    label: "Newest First",  icon: Calendar },
  { value: "year_asc",     label: "Oldest First",  icon: Calendar },
];

function sortMovies(movies, sort) {
  const sorted = [...movies];
  switch (sort) {
    case "title_asc":   return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "title_desc":  return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case "rating_desc": return sorted.sort((a, b) => b.rating - a.rating);
    case "rating_asc":  return sorted.sort((a, b) => a.rating - b.rating);
    case "year_desc":   return sorted.sort((a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0));
    case "year_asc":    return sorted.sort((a, b) => (a.releaseYear ?? 0) - (b.releaseYear ?? 0));
    default:            return sorted;
  }
}

export default function MoviesPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [allMovies, setAllMovies]   = useState([]);
  const [status, setStatus]         = useState("loading");
  const [errorMsg, setErrorMsg]     = useState("");
  const [sortKey, setSortKey]       = useState("title_asc");
  const [page, setPage]             = useState(1);
  const [watchlist, setWatchlist]   = useState(new Set());
  const [sortOpen, setSortOpen]     = useState(false);

  const displayName = user?.username ?? user?.name ?? user?.email?.split("@")[0] ?? "there";

  const fetchMovies = useCallback(async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await getMovies();
      const raw = Array.isArray(res.data) ? res.data : (res.data?.movies ?? []);
      setAllMovies(raw.map(normalizeMovie).filter(Boolean));
      setStatus("success");
      setPage(1);
    } catch (err) {
      setErrorMsg(err.response?.data?.message ?? "Couldn't load movies. Please try again.");
      setStatus("error");
    }
  }, []);

  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await getWatchlist();
      const items = Array.isArray(res.data) ? res.data : (res.data?.watchlist ?? []);
      const ids = new Set(items.map((i) => i.movieId ?? i._id ?? i.id).filter(Boolean));
      setWatchlist(ids);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchMovies();
      fetchWatchlist();
    }
  }, [authLoading, fetchMovies, fetchWatchlist]);

  const sorted = sortMovies(allMovies, sortKey);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key) => {
    setSortKey(key);
    setSortOpen(false);
    setPage(1);
  };

  const handleWatchlist = useCallback(async (id, title) => {
    const inList = watchlist.has(id);
    setWatchlist((prev) => {
      const next = new Set(prev);
      if (inList) next.delete(id);
      else next.add(id);
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
    } catch {
      // revert
      setWatchlist((prev) => {
        const next = new Set(prev);
        if (inList) next.add(id);
        else next.delete(id);
        return next;
      });
      toast.error("Couldn't update Watchlist");
    }
  }, [watchlist]);

  const currentSort = SORT_OPTIONS.find((o) => o.value === sortKey);
  const isLoading = authLoading || status === "loading";

  return (
    <div className="mv-root">
      <div className="mv-glow mv-glow-tl" />
      <div className="mv-glow mv-glow-br" />

      {/* Nav */}
      <nav className="mv-nav">
        <Link to="/" className="mv-nav-logo">
          <Clapperboard size={20} strokeWidth={1.8} className="mv-logo-icon" />
          <span className="mv-logo-text">Next<span className="mv-logo-accent">Watch</span></span>
        </Link>

        <div className="mv-nav-right">
          <Link to="/dashboard" className="mv-nav-link mv-nav-link--ghost">Dashboard</Link>
          <Link to="/mood" className="mv-nav-link">
            <SmilePlus size={13} strokeWidth={2} />
            Mood
          </Link>

          <div className="mv-nav-user">
            <div className="mv-avatar" title={displayName}>{getInitials(displayName)}</div>
            <span className="mv-nav-username">{displayName}</span>
          </div>

          <button type="button" onClick={logout} className="mv-nav-signout">
            <LogOut size={13} strokeWidth={2} />
            <span className="mv-nav-signout-label">Sign out</span>
          </button>
        </div>
      </nav>

      <main className="mv-main">
        {/* Header */}
        <div className="mv-page-header">
          <div>
            <p className="mv-eyebrow">
              <Film size={13} strokeWidth={2} />
              Browse
            </p>
            <h1 className="mv-title">All Movies</h1>
            {status === "success" && (
              <p className="mv-subtitle">{allMovies.length.toLocaleString()} titles available</p>
            )}
          </div>

          {/* Sort control */}
          <div className="mv-controls">
            <div className="mv-sort-wrapper">
              <button
                type="button"
                className="mv-sort-btn"
                onClick={() => setSortOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={sortOpen}
              >
                <SlidersHorizontal size={14} strokeWidth={2} />
                <span>{currentSort?.label ?? "Sort"}</span>
                <ChevronRight
                  size={13}
                  strokeWidth={2}
                  className={`mv-sort-chevron ${sortOpen ? "mv-sort-chevron--open" : ""}`}
                />
              </button>

              {sortOpen && (
                <>
                  <div className="mv-sort-backdrop" onClick={() => setSortOpen(false)} />
                  <ul className="mv-sort-menu" role="listbox">
                    {SORT_OPTIONS.map((opt) => (
                      <li
                        key={opt.value}
                        role="option"
                        aria-selected={sortKey === opt.value}
                        className={`mv-sort-option ${sortKey === opt.value ? "mv-sort-option--active" : ""}`}
                        onClick={() => handleSort(opt.value)}
                      >
                        <opt.icon size={13} strokeWidth={2} />
                        {opt.label}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="mv-grid">
            {Array.from({ length: 12 }).map((_, i) => <MovieSkeleton key={i} />)}
          </div>
        )}

        {/* Error */}
        {!isLoading && status === "error" && (
          <ErrorState message={errorMsg} onRetry={fetchMovies} />
        )}

        {/* Empty */}
        {!isLoading && status === "success" && allMovies.length === 0 && (
          <div className="mv-empty">
            <Film size={36} strokeWidth={1.2} className="mv-empty-icon" />
            <h2 className="mv-empty-title">No movies found</h2>
            <p className="mv-empty-body">The library appears to be empty.</p>
          </div>
        )}

        {/* Grid */}
        {!isLoading && status === "success" && paginated.length > 0 && (
          <>
            <div className="mv-grid">
              {paginated.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  isInWatchlist={watchlist.has(movie.id)}
                  onWatchlist={handleWatchlist}
                  onViewDetails={(id) => navigate(`/movies/${id}`)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination page={page} totalPages={totalPages} onChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function MovieCard({ movie, isInWatchlist, onWatchlist, onViewDetails }) {
  const [imgError, setImgError] = useState(false);
  const { id, title, posterUrl, genres, rating, releaseYear } = movie;
  const hasPoster = posterUrl && !imgError;
  const ratingDisplay = rating > 0 ? Number(rating).toFixed(1) : null;

  return (
    <article className="mv-card" onClick={() => onViewDetails(id)}>
      <div className="mv-card-poster">
        {hasPoster ? (
          <img
            src={posterUrl}
            alt={title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="mv-card-img"
          />
        ) : (
          <div className="mv-card-fallback" style={{ background: titleToGradient(title) }}>
            <span>{title.charAt(0).toUpperCase()}</span>
          </div>
        )}

        {ratingDisplay && (
          <div className="mv-badge mv-badge--rating">
            <Star size={9} strokeWidth={0} fill="#fbbf24" />
            {ratingDisplay}
          </div>
        )}
        {releaseYear && (
          <div className="mv-badge mv-badge--year">{releaseYear}</div>
        )}

        <div className="mv-card-overlay">
          <button
            type="button"
            className="mv-card-details-btn"
            onClick={(e) => { e.stopPropagation(); onViewDetails(id); }}
          >
            View Details
          </button>
        </div>
      </div>

      <div className="mv-card-body">
        <h3 className="mv-card-title">{title}</h3>

        {genres.length > 0 && (
          <div className="mv-card-genres">
            {genres.slice(0, 2).map((g) => <GenreBadge key={g} genre={g} size="xs" />)}
          </div>
        )}

        <button
          type="button"
          className={`mv-watchlist-btn ${isInWatchlist ? "mv-watchlist-btn--saved" : ""}`}
          onClick={(e) => { e.stopPropagation(); onWatchlist(id, title); }}
        >
          {isInWatchlist
            ? <><BookmarkCheck size={12} strokeWidth={2.5} /> Saved</>
            : <><Bookmark size={12} strokeWidth={2} /> + Watchlist</>
          }
        </button>
      </div>
    </article>
  );
}

function Pagination({ page, totalPages, onChange }) {
  const pages = [];
  const delta = 2;
  const left  = Math.max(1, page - delta);
  const right = Math.min(totalPages, page + delta);

  if (left > 1) {
    pages.push(1);
    if (left > 2) pages.push("…");
  }
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages) {
    if (right < totalPages - 1) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <nav className="mv-pagination" aria-label="Pagination">
      <button
        type="button"
        className="mv-page-btn mv-page-nav"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft size={15} strokeWidth={2} />
      </button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="mv-page-ellipsis">…</span>
        ) : (
          <button
            key={p}
            type="button"
            className={`mv-page-btn ${page === p ? "mv-page-btn--active" : ""}`}
            onClick={() => onChange(p)}
            aria-current={page === p ? "page" : undefined}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        className="mv-page-btn mv-page-nav"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight size={15} strokeWidth={2} />
      </button>
    </nav>
  );
}

function MovieSkeleton() {
  return (
    <div className="mv-card mv-skeleton" aria-hidden="true">
      <div className="mv-sk mv-sk-poster" />
      <div className="mv-card-body">
        <div className="mv-sk mv-sk-title" />
        <div className="mv-sk mv-sk-genres" />
        <div className="mv-sk mv-sk-btn" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="mv-state-card mv-state-card--error">
      <AlertCircle size={26} strokeWidth={1.5} className="mv-state-icon mv-state-icon--error" />
      <h2 className="mv-state-title">Couldn't load movies</h2>
      <p className="mv-state-body">{message}</p>
      <button type="button" onClick={onRetry} className="mv-retry-btn">
        <RefreshCw size={14} strokeWidth={2} />
        Try Again
      </button>
    </div>
  );
}
