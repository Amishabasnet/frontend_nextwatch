import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Clapperboard,
  Search,
  SlidersHorizontal,
  X,
  Film,
  Loader2,
  AlertCircle,
  RefreshCw,
  Star,
  Calendar,
  Globe,
  Smile,
  Tag,
  LogOut,
  SmilePlus,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
} from "lucide-react";
import api, {
  postWatchlist,
  deleteWatchlist,
  getWatchlist,
} from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import GenreBadge from "../../components/GenreBadge";
import "./SearchPage.css";


const GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime",
  "Documentary", "Drama", "Fantasy", "Horror", "Mystery",
  "Romance", "Sci-Fi", "Thriller", "Western",
];

const MOODS = [
  "Happy", "Sad", "Excited", "Relaxed", "Tense",
  "Romantic", "Nostalgic", "Inspired", "Scared",
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "hi", label: "Hindi" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1899 }, (_, i) => CURRENT_YEAR - i);

const DEBOUNCE_MS = 400;

const EMPTY_FILTERS = {
  title: "",
  keyword: "",
  genre: "",
  mood: "",
  rating: "",
  releaseYear: "",
  language: "",
};

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
    language: raw.language ?? raw.original_language ?? null,
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

function hasActiveFilters(filters) {
  return Object.values(filters).some((v) => v !== "");
}

function countActiveFilters(filters) {
  return Object.values(filters).filter((v) => v !== "").length;
}

function buildQueryParams(filters) {
  const params = new URLSearchParams();
  if (filters.title)       params.set("title",       filters.title);
  if (filters.keyword)     params.set("keyword",     filters.keyword);
  if (filters.genre)       params.set("genre",       filters.genre);
  if (filters.mood)        params.set("mood",        filters.mood);
  if (filters.rating)      params.set("rating",      filters.rating);
  if (filters.releaseYear) params.set("releaseYear", filters.releaseYear);
  if (filters.language)    params.set("language",    filters.language);
  return params;
}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function SearchPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const debouncedTitle   = useDebounce(filters.title,   DEBOUNCE_MS);
  const debouncedKeyword = useDebounce(filters.keyword, DEBOUNCE_MS);

  const [applied, setApplied] = useState(null); // null = no search yet

  const [movies, setMovies]     = useState([]);
  const [status, setStatus]     = useState("idle"); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [watchlist, setWatchlist] = useState(new Set());

  const [panelOpen, setPanelOpen] = useState(true);
  const abortRef = useRef(null);

  const displayName = user?.username ?? user?.name ?? user?.email?.split("@")[0] ?? "there";

  /* Fetch watchlist once */
  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await getWatchlist();
      const items = Array.isArray(res.data) ? res.data : (res.data?.watchlist ?? []);
      const ids = new Set(items.map((i) => i.movieId ?? i._id ?? i.id).filter(Boolean));
      setWatchlist(ids);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!authLoading) fetchWatchlist();
  }, [authLoading, fetchWatchlist]);

  /* Auto-search when debounced text fields change (if a search already ran) */
  useEffect(() => {
    if (applied === null) return;
    const merged = {
      ...applied,
      title:   debouncedTitle,
      keyword: debouncedKeyword,
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApplied(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitle, debouncedKeyword]);

  /* Trigger API call whenever `applied` changes */
  useEffect(() => {
    if (applied === null) return;

    // Abort previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const run = async () => {
      setStatus("loading");
      setErrorMsg("");
      try {
        const params = buildQueryParams(applied);
        const res = await api.get(`/movies/search?${params.toString()}`, {
          signal: controller.signal,
        });
        const raw = Array.isArray(res.data)
          ? res.data
          : (res.data?.movies ?? res.data?.results ?? []);
        setMovies(raw.map(normalizeMovie).filter(Boolean));
        setStatus("success");
      } catch (err) {
        if (err.name === "CanceledError" || err.name === "AbortError") return;
        setErrorMsg(err.response?.data?.message ?? "Search failed. Please try again.");
        setStatus("error");
      }
    };
    run();

    return () => controller.abort();
  }, [applied]);

  /* Handlers */
  const setFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const handleApply = () => {
    setApplied({ ...filters });
  };

  const handleClear = () => {
    setFilters(EMPTY_FILTERS);
    setApplied(null);
    setMovies([]);
    setStatus("idle");
  };

  const handleRetry = () => {
    if (applied) setApplied({ ...applied });
  };

  const handleWatchlist = useCallback(async (id, title) => {
    const inList = watchlist.has(id);
    setWatchlist((prev) => {
      const next = new Set(prev);
      inList ? next.delete(id) : next.add(id);
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
      setWatchlist((prev) => {
        const next = new Set(prev);
        inList ? next.add(id) : next.delete(id);
        return next;
      });
      toast.error("Couldn't update Watchlist");
    }
  }, [watchlist]);

  const activeCount = countActiveFilters(filters);

  return (
    <div className="sp-root">
      <div className="sp-glow sp-glow-tl" />
      <div className="sp-glow sp-glow-br" />

      {/* Nav */}
      <nav className="sp-nav">
        <Link to="/" className="sp-nav-logo">
          <Clapperboard size={20} strokeWidth={1.8} className="sp-logo-icon" />
          <span className="sp-logo-text">Next<span className="sp-logo-accent">Watch</span></span>
        </Link>

        <div className="sp-nav-right">
          <Link to="/movies"    className="sp-nav-link sp-nav-link--ghost">Browse</Link>
          <Link to="/dashboard" className="sp-nav-link sp-nav-link--ghost">Dashboard</Link>
          <Link to="/mood"      className="sp-nav-link">
            <SmilePlus size={13} strokeWidth={2} />
            Mood
          </Link>

          <div className="sp-nav-user">
            <div className="sp-avatar" title={displayName}>{getInitials(displayName)}</div>
            <span className="sp-nav-username">{displayName}</span>
          </div>

          <button type="button" onClick={logout} className="sp-nav-signout">
            <LogOut size={13} strokeWidth={2} />
            <span className="sp-nav-signout-label">Sign out</span>
          </button>
        </div>
      </nav>

      <main className="sp-main">
        {/* Page header */}
        <div className="sp-page-header">
          <div>
            <p className="sp-eyebrow">
              <Search size={13} strokeWidth={2} />
              Discover
            </p>
            <h1 className="sp-title">Search Movies</h1>
            {status === "success" && (
              <p className="sp-subtitle">
                {movies.length === 0
                  ? "No results for your filters"
                  : `${movies.length.toLocaleString()} result${movies.length !== 1 ? "s" : ""} found`}
              </p>
            )}
          </div>
        </div>

        <div className="sp-layout">
          {/* ── Filter panel ── */}
          <aside className="sp-sidebar">
            <div className="sp-panel">
              <button
                type="button"
                className="sp-panel-toggle"
                onClick={() => setPanelOpen((v) => !v)}
              >
                <span className="sp-panel-toggle-left">
                  <SlidersHorizontal size={14} strokeWidth={2} />
                  Filters
                  {activeCount > 0 && (
                    <span className="sp-active-badge">{activeCount}</span>
                  )}
                </span>
                <ChevronDown
                  size={14}
                  strokeWidth={2}
                  className={`sp-panel-chevron ${panelOpen ? "sp-panel-chevron--open" : ""}`}
                />
              </button>

              {panelOpen && (
                <div className="sp-panel-body">

                  {/* Title */}
                  <FilterGroup icon={<Search size={13} />} label="Title">
                    <div className="sp-input-wrap">
                      <input
                        type="text"
                        className="sp-input"
                        placeholder="Search by title…"
                        value={filters.title}
                        onChange={(e) => setFilter("title", e.target.value)}
                      />
                      {filters.title && (
                        <button
                          type="button"
                          className="sp-input-clear"
                          onClick={() => setFilter("title", "")}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </FilterGroup>

                  {/* Keyword */}
                  <FilterGroup icon={<Tag size={13} />} label="Keyword">
                    <div className="sp-input-wrap">
                      <input
                        type="text"
                        className="sp-input"
                        placeholder="e.g. space, detective…"
                        value={filters.keyword}
                        onChange={(e) => setFilter("keyword", e.target.value)}
                      />
                      {filters.keyword && (
                        <button
                          type="button"
                          className="sp-input-clear"
                          onClick={() => setFilter("keyword", "")}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </FilterGroup>

                  {/* Genre */}
                  <FilterGroup icon={<Film size={13} />} label="Genre">
                    <div className="sp-chip-grid">
                      {GENRES.map((g) => (
                        <button
                          key={g}
                          type="button"
                          className={`sp-chip ${filters.genre === g ? "sp-chip--active" : ""}`}
                          onClick={() => setFilter("genre", filters.genre === g ? "" : g)}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </FilterGroup>

                  {/* Mood */}
                  <FilterGroup icon={<Smile size={13} />} label="Mood">
                    <div className="sp-chip-grid">
                      {MOODS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          className={`sp-chip sp-chip--mood ${filters.mood === m ? "sp-chip--active" : ""}`}
                          onClick={() => setFilter("mood", filters.mood === m ? "" : m)}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </FilterGroup>

                  {/* Min Rating */}
                  <FilterGroup icon={<Star size={13} />} label={`Min Rating${filters.rating ? ` — ${filters.rating}+` : ""}`}>
                    <div className="sp-rating-row">
                      <span className="sp-rating-label">0</span>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        className="sp-range"
                        value={filters.rating || 0}
                        onChange={(e) =>
                          setFilter("rating", e.target.value === "0" ? "" : e.target.value)
                        }
                      />
                      <span className="sp-rating-label">10</span>
                    </div>
                    {filters.rating && (
                      <p className="sp-rating-display">
                        <Star size={10} strokeWidth={0} fill="#fbbf24" />
                        {filters.rating} and above
                      </p>
                    )}
                  </FilterGroup>

                  {/* Release Year */}
                  <FilterGroup icon={<Calendar size={13} />} label="Release Year">
                    <select
                      className="sp-select"
                      value={filters.releaseYear}
                      onChange={(e) => setFilter("releaseYear", e.target.value)}
                    >
                      <option value="">Any year</option>
                      {YEAR_OPTIONS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </FilterGroup>

                  {/* Language */}
                  <FilterGroup icon={<Globe size={13} />} label="Language">
                    <select
                      className="sp-select"
                      value={filters.language}
                      onChange={(e) => setFilter("language", e.target.value)}
                    >
                      <option value="">Any language</option>
                      {LANGUAGES.map((l) => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </select>
                  </FilterGroup>

                  {/* Actions */}
                  <div className="sp-panel-actions">
                    <button
                      type="button"
                      className="sp-btn-apply"
                      onClick={handleApply}
                      disabled={status === "loading"}
                    >
                      {status === "loading"
                        ? <><Loader2 size={14} className="sp-spin" /> Searching…</>
                        : <><Search size={14} /> Apply Filters</>
                      }
                    </button>

                    {hasActiveFilters(filters) && (
                      <button
                        type="button"
                        className="sp-btn-clear"
                        onClick={handleClear}
                      >
                        <X size={13} />
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* ── Results area ── */}
          <section className="sp-results">

            {/* Idle */}
            {status === "idle" && (
              <div className="sp-state">
                <div className="sp-state-icon-wrap">
                  <Search size={32} strokeWidth={1.2} />
                </div>
                <h2 className="sp-state-title">Find your next watch</h2>
                <p className="sp-state-body">
                  Set your filters and hit <strong>Apply Filters</strong> to search the library.
                </p>
              </div>
            )}

            {/* Loading */}
            {status === "loading" && (
              <div className="sp-grid">
                {Array.from({ length: 12 }).map((_, i) => (
                  <MovieSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Error */}
            {status === "error" && (
              <div className="sp-state sp-state--error">
                <AlertCircle size={32} strokeWidth={1.5} className="sp-state-err-icon" />
                <h2 className="sp-state-title">Search failed</h2>
                <p className="sp-state-body">{errorMsg}</p>
                <button type="button" className="sp-btn-retry" onClick={handleRetry}>
                  <RefreshCw size={14} strokeWidth={2} />
                  Try Again
                </button>
              </div>
            )}

            {/* No results */}
            {status === "success" && movies.length === 0 && (
              <div className="sp-state">
                <div className="sp-state-icon-wrap">
                  <Film size={32} strokeWidth={1.2} />
                </div>
                <h2 className="sp-state-title">No movies found</h2>
                <p className="sp-state-body">
                  Try broadening your filters — fewer constraints usually surface more titles.
                </p>
                <button type="button" className="sp-btn-clear sp-btn-clear--center" onClick={handleClear}>
                  <X size={13} />
                  Clear Filters
                </button>
              </div>
            )}

            {/* Results grid */}
            {status === "success" && movies.length > 0 && (
              <div className="sp-grid">
                {movies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    isInWatchlist={watchlist.has(movie.id)}
                    onWatchlist={handleWatchlist}
                    onViewDetails={(id) => navigate(`/movies/${id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function FilterGroup({ icon, label, children }) {
  return (
    <div className="sp-filter-group">
      <p className="sp-filter-label">
        {icon}
        {label}
      </p>
      {children}
    </div>
  );
}

function MovieCard({ movie, isInWatchlist, onWatchlist, onViewDetails }) {
  const [imgError, setImgError] = useState(false);
  const { id, title, posterUrl, genres, rating, releaseYear } = movie;
  const hasPoster = posterUrl && !imgError;
  const ratingDisplay = rating > 0 ? Number(rating).toFixed(1) : null;

  return (
    <article className="sp-card" onClick={() => onViewDetails(id)}>
      <div className="sp-card-poster">
        {hasPoster ? (
          <img
            src={posterUrl}
            alt={title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="sp-card-img"
          />
        ) : (
          <div className="sp-card-fallback" style={{ background: titleToGradient(title) }}>
            <span>{title.charAt(0).toUpperCase()}</span>
          </div>
        )}

        {ratingDisplay && (
          <div className="sp-badge sp-badge--rating">
            <Star size={9} strokeWidth={0} fill="#fbbf24" />
            {ratingDisplay}
          </div>
        )}
        {releaseYear && (
          <div className="sp-badge sp-badge--year">{releaseYear}</div>
        )}

        <div className="sp-card-overlay">
          <button
            type="button"
            className="sp-card-details-btn"
            onClick={(e) => { e.stopPropagation(); onViewDetails(id); }}
          >
            View Details
          </button>
        </div>
      </div>

      <div className="sp-card-body">
        <h3 className="sp-card-title">{title}</h3>

        {genres.length > 0 && (
          <div className="sp-card-genres">
            {genres.slice(0, 2).map((g) => <GenreBadge key={g} genre={g} size="xs" />)}
          </div>
        )}

        <button
          type="button"
          className={`sp-watchlist-btn ${isInWatchlist ? "sp-watchlist-btn--saved" : ""}`}
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

function MovieSkeleton() {
  return (
    <div className="sp-card sp-skeleton" aria-hidden="true">
      <div className="sp-sk sp-sk-poster" />
      <div className="sp-card-body">
        <div className="sp-sk sp-sk-title" />
        <div className="sp-sk sp-sk-genres" />
        <div className="sp-sk sp-sk-btn" />
      </div>
    </div>
  );
}
