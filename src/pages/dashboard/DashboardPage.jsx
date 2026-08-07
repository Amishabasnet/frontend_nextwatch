import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Clapperboard, TrendingUp, Clock, Sparkles,
  Star, SmilePlus, ListChecks, LogOut, Loader2, User, Settings,
  Search, SlidersHorizontal, X, RotateCcw,
} from "lucide-react";
import {
  getLatestMood, getPreferences, getHistory,
  getRecommendations, getMovies, getTopRatedMovies, searchMovies,
  postWatchlist, deleteWatchlist, getWatchlist,
} from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import MoodBadge, { MOOD_CONFIG } from "../../components/MoodBadge";
import GenreBadge from "../../components/GenreBadge";
import MovieSection                    from "../../components/MovieSelection";

const DASH_GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime",
  "Documentary", "Drama", "Fantasy", "Horror", "Mystery",
  "Romance", "Sci-Fi", "Thriller", "Western",
];

// Used to fill out genre rows when the user hasn't picked favourite genres yet.
const DEFAULT_GENRE_ROWS = ["Action", "Comedy", "Drama", "Thriller", "Sci-Fi", "Horror"];

const RATING_OPTIONS = [
  { value: "", label: "Any rating" },
  { value: "9", label: "9+ Exceptional" },
  { value: "8", label: "8+ Great" },
  { value: "7", label: "7+ Good" },
  { value: "6", label: "6+ Decent" },
  { value: "5", label: "5+ Okay" },
];

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function normalizeMovie(raw) {
  if (!raw) return null;
  const posterUrl =
    raw.posterUrl ??
    raw.poster   ??
    (raw.poster_path
      ? `https://image.tmdb.org/t/p/w500${raw.poster_path}`
      : null);

  const id = raw._id ?? raw.id ?? raw.movieId ?? null;
  if (!id) {
    // No real id from the API — skip rather than fabricate one, since a
    // fake id would 500 when the user tries to view/save this movie.
    console.warn("Movie missing id, skipping:", raw?.title ?? raw);
    return null;
  }

  return {
    id,
    title: raw.title ?? "Untitled",
    posterUrl,
    genres: Array.isArray(raw.genres)
      ? raw.genres.map((g) => (typeof g === "string" ? g : g?.name ?? ""))
      : [],
    rating: Number(raw.rating ?? raw.voteAverage ?? raw.vote_average ?? raw.score ?? 0),
    releaseYear:
      raw.releaseYear ??
      raw.year ??
      (raw.releaseDate ?? raw.release_date
        ? new Date(raw.releaseDate ?? raw.release_date).getFullYear()
        : null),
    overview: raw.overview ?? raw.description ?? "",
  };
}

function normalizeMovieList(data) {
  const list = Array.isArray(data) ? data : data?.movies ?? data?.results ?? [];
  return list.map(normalizeMovie).filter(Boolean);
}

function normalizeHistory(data) {
  const list = Array.isArray(data) ? data : data?.history ?? data?.items ?? [];
  return list
    .map((entry) => normalizeMovie(entry.movie ?? entry))
    .filter(Boolean);
}

function normalizeRecommendations(data) {
  if (!data) return { personalized: [], moodBased: [], historyBased: [] };
  if (Array.isArray(data)) {
    return { personalized: data.map(normalizeMovie).filter(Boolean), moodBased: [], historyBased: [] };
  }
  return {
    personalized: (data.personalized  ?? data.recommendations ?? []).map(normalizeMovie).filter(Boolean),
    moodBased:    (data.moodBased     ?? data.mood_based ?? data.byMood  ?? []).map(normalizeMovie).filter(Boolean),
    historyBased: (data.historyBased  ?? data.history_based ?? data.byHistory ?? []).map(normalizeMovie).filter(Boolean),
  };
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getInitials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

function StatCard({ label, value, icon: Icon, iconColor = "#a78bfa" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/[0.07] bg-[#13131a] px-4 py-3 min-w-[76px]">
      <Icon size={15} strokeWidth={1.8} style={{ color: iconColor }} />
      <span className="text-[1.25rem] font-extrabold text-[#eeeef5] leading-none tabular-nums">
        {value}
      </span>
      <span className="text-[0.62rem] font-bold uppercase tracking-[0.07em] text-[#52526a]">
        {label}
      </span>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center gap-5 bg-[#0b0b0f]">
      <div className="flex items-center gap-2">
        <Clapperboard size={24} strokeWidth={1.6} className="text-[#a78bfa]" />
        <span className="text-[1.05rem] font-bold tracking-tight text-[#eeeef5]">
          Next<span className="text-[#a78bfa]">Watch</span>
        </span>
      </div>
      <Loader2 size={22} strokeWidth={2} className="text-[#8b5cf6] animate-spin" />
    </div>
  );
}

export default function DashboardPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef(null);

  // Close avatar dropdown on outside click only (clicks inside — e.g. the
  // Profile/Settings links — must be left alone or Link's own click handler
  // never gets to fire since mousedown precedes click).
  useEffect(() => {
    if (!avatarOpen) return;
    const close = (e) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [avatarOpen]);

  const [recs, setRecs]               = useState({ personalized: [], moodBased: [], historyBased: [] });
  const [latestMood, setLatestMood]   = useState(null);
  const [preferences, setPreferences] = useState({ favoriteGenres: [], dislikedGenres: [] });
  const [history, setHistory]         = useState([]);
  const [movies, setMovies]           = useState([]);
  const [topRated, setTopRated]       = useState([]);
  const [genreRows, setGenreRows]     = useState([]); // [{ genre, movies }]
  const [loading, setLoading]         = useState(true);
  const [watchlist, setWatchlist]     = useState(new Set());

  // --- Search + side filter panel state ---
  const [searchQuery, setSearchQuery]   = useState("");
  const [filterGenre, setFilterGenre]   = useState("");
  const [filterRating, setFilterRating] = useState("");
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [searchResults, setSearchResults]     = useState([]);
  const [searchStatus, setSearchStatus]       = useState("idle"); // idle | loading | success | error
  const filterPanelRef = useRef(null);
  const searchAbortRef = useRef(null);

  const debouncedQuery = useDebouncedValue(searchQuery, 400);
  const isSearchActive = Boolean(debouncedQuery.trim() || filterGenre || filterRating);
  const activeFilterCount = (filterGenre ? 1 : 0) + (filterRating ? 1 : 0);

  // Close the side filter panel on outside click
  useEffect(() => {
    if (!filterPanelOpen) return;
    const handleClick = (e) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target)) {
        setFilterPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [filterPanelOpen]);

  // Run search whenever the debounced query or the side filters change
  useEffect(() => {
    if (!isSearchActive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults([]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchStatus("idle");
      return;
    }

    if (searchAbortRef.current) searchAbortRef.current.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    const run = async () => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchStatus("loading");
      try {
        const params = {};
        if (debouncedQuery.trim()) params.q = debouncedQuery.trim();
        if (filterGenre) params.genre = filterGenre;
        if (filterRating) params.rating = filterRating;

        const res = await searchMovies(params, { signal: controller.signal });
        setSearchResults(normalizeMovieList(res.data));
        setSearchStatus("success");
      } catch (err) {
        if (err.name === "CanceledError" || err.name === "AbortError") return;
        console.error("Dashboard search failed:", err);
        setSearchStatus("error");
      }
    };
    run();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filterGenre, filterRating]);

  const handleClearSearch = () => {
    setSearchQuery("");
    setFilterGenre("");
    setFilterRating("");
    setFilterPanelOpen(false);
  };

  useEffect(() => {
    let didCancel = false;

    const loadDashboard = async () => {
      if (!user?.id) {
        if (!didCancel) setLoading(false);
        return;
      }
      if (!didCancel) setLoading(true);

      // Fetch recs, mood, prefs, history first — use results to inform movie fetch
      const [recRes, moodRes, prefRes, histRes] = await Promise.allSettled([
        getRecommendations(user.id),
        getLatestMood(user.id),
        getPreferences(user.id),
        getHistory(user.id),
      ]);

      if (didCancel) return;

      if (recRes.status === "fulfilled") setRecs(normalizeRecommendations(recRes.value.data));
      if (moodRes.status === "fulfilled" && moodRes.value.data) setLatestMood(moodRes.value.data);
      if (prefRes.status === "fulfilled" && prefRes.value.data) setPreferences(prefRes.value.data);
      if (histRes.status === "fulfilled") setHistory(normalizeHistory(histRes.value.data));

      // Build movie fetch params from mood + preferences
      const mood = moodRes.status === "fulfilled" ? moodRes.value.data?.mood : null;
      const favGenres = prefRes.status === "fulfilled"
        ? (prefRes.value.data?.favoriteGenres ?? [])
        : [];
      const movieParams = {};
      if (mood) movieParams.mood = mood;
      else if (favGenres.length > 0) movieParams.genre = favGenres[0];

      const movRes = await getMovies(Object.keys(movieParams).length ? movieParams : undefined)
        .catch(() => null);

      if (didCancel) return;
      if (movRes) setMovies(normalizeMovieList(movRes.data));

      // Netflix/Prime-style rows: a platform-wide Top 10, then one row per
      // genre (user's favourites first, padded out with defaults).
      const genresForRows = Array.from(
        new Set([...favGenres, ...DEFAULT_GENRE_ROWS])
      ).slice(0, 6);

      const [topRatedRes, ...genreResList] = await Promise.allSettled([
        getTopRatedMovies({ limit: 10 }),
        ...genresForRows.map((g) => getMovies({ genre: g, limit: 10, sort: "rating" })),
      ]);

      if (didCancel) return;

      if (topRatedRes.status === "fulfilled") {
        setTopRated(normalizeMovieList(topRatedRes.value.data));
      }

      const rows = genresForRows
        .map((genre, i) => {
          const res = genreResList[i];
          if (res.status !== "fulfilled") return null;
          const list = normalizeMovieList(res.value.data);
          return list.length > 0 ? { genre, movies: list } : null;
        })
        .filter(Boolean);
      setGenreRows(rows);

      if (!didCancel) setLoading(false);
    };

    if (!authLoading) {
      Promise.resolve().then(loadDashboard);
    }

    return () => {
      didCancel = true;
    };
  }, [authLoading, user?.id]);

  // Load persisted watchlist from backend
  useEffect(() => {
    const loadWatchlist = async () => {
      try {
        const res = await getWatchlist();
        const items = Array.isArray(res.data) ? res.data : (res.data?.watchlist ?? res.data?.items ?? []);
        const ids = new Set(items.map(i => String(i.movieId ?? i._id ?? i.id)).filter(Boolean));
        setWatchlist(ids);
      } catch { /* non-critical */ }
    };
    if (!authLoading) loadWatchlist();
  }, [authLoading]);

  const handleAddToWatchlist = useCallback(async (id) => {
    const inList = watchlist.has(id);
    // Optimistic update
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
        toast.success("Added to Watchlist");
      }
    } catch {
      // Revert on failure
      setWatchlist((prev) => {
        const next = new Set(prev);
        if (inList) { next.add(id); } else { next.delete(id); }
        return next;
      });
      toast.error("Couldn't update Watchlist");
    }
  }, [watchlist]);

  const handleViewDetails = useCallback((id) => {
    navigate(`/movies/${id}`);
  }, [navigate]);

  if (authLoading) return <LoadingScreen />;

  const moodKey     = latestMood?.mood?.toLowerCase() ?? "";
  const moodColor   = MOOD_CONFIG[moodKey]?.color ?? "#8b5cf6";
  const displayName = user?.username ?? user?.name ?? user?.email?.split("@")[0] ?? "there";
  const favoriteGenres = preferences?.favoriteGenres ?? [];

  const hasMoodSection    = loading || latestMood?.mood || recs.moodBased.length > 0;
  const hasTopRatedSection = loading || topRated.length > 0;
  const hasRecentSection  = loading || history.length > 0;

  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-x-hidden bg-[#0b0b0f] text-[#c4c4d4]">
      <style>{`
        @keyframes dashFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dash-section { animation: dashFadeUp 0.45s ease both; }
      `}</style>

      <div
        className="pointer-events-none fixed z-0 rounded-full opacity-[0.09] blur-[130px]"
        style={{
          background:  moodColor,
          width: 640, height: 600,
          top: "-15%", left: "-8%",
          transition: "background 1.8s ease",
        }}
      />
      <div
        className="pointer-events-none fixed z-0 rounded-full opacity-[0.07] blur-[110px]"
        style={{ background: "#2563eb", width: 440, height: 420, bottom: "-8%", right: "-6%" }}
      />

      <nav className="sticky top-0 z-[100] flex h-[58px] items-center justify-between gap-4 border-b border-white/[0.07] bg-[#0b0b0f]/85 px-5 sm:px-8 backdrop-blur-[14px]">
        {/* Logo — refreshes the dashboard in place instead of routing to the
            public landing page (this nav only appears once logged in) */}
        <a
          href="/dashboard"
          onClick={(e) => {
            e.preventDefault();
            window.location.assign("/dashboard");
          }}
          className="flex items-center gap-2 no-underline flex-shrink-0"
        >
          <Clapperboard size={20} strokeWidth={1.8} className="text-[#a78bfa]" />
          <span className="text-[1rem] font-bold tracking-[-0.02em] text-[#eeeef5]">
            Next<span className="text-[#a78bfa]">Watch</span>
          </span>
        </a>

        <div className="flex items-center gap-2">
          <Link
            to="/mood"
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/[0.09] bg-[#1a1a24] px-3 py-1.5 text-[0.76rem] font-semibold text-[#9292b0] no-underline hover:border-white/20 hover:text-[#eeeef5] transition-all"
          >
            <SmilePlus size={13} strokeWidth={2} />
            Update Mood
          </Link>

          {/* Avatar dropdown */}
          <div className="relative" style={{ position: "relative" }} ref={avatarRef}>
            <button
              type="button"
              onClick={() => setAvatarOpen(prev => !prev)}
              className="flex items-center gap-2 pl-1 cursor-pointer bg-transparent border-none"
            >
              <div
                className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-[0.68rem] font-black text-white"
                style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #2563eb 100%)" }}
                title={displayName}
              >
                {getInitials(displayName)}
              </div>
              <span className="hidden sm:block text-[0.82rem] font-semibold text-[#eeeef5] max-w-[120px] truncate">
                {displayName}
              </span>
            </button>
            {avatarOpen && (
              <div
                style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0,
                  background: "#1a1a24", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12, padding: "6px", minWidth: 160, zIndex: 200,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}
                onClick={() => setAvatarOpen(false)}
              >
                <Link to="/profile" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, color: "#9292b0", textDecoration: "none", fontSize: "0.82rem", fontWeight: 600 }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <User size={13} strokeWidth={2} /> Profile
                </Link>
                <Link to="/settings" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, color: "#9292b0", textDecoration: "none", fontSize: "0.82rem", fontWeight: 600 }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <Settings size={13} strokeWidth={2} /> Settings
                </Link>
                <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "4px 0" }} />
                <button type="button" onClick={logout} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, color: "#f87171", background: "transparent", border: "none", fontSize: "0.82rem", fontWeight: 600, width: "100%", cursor: "pointer" }}
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

      <main className="relative z-[1] flex-1 w-full max-w-[1440px] mx-auto px-5 sm:px-8 py-8 space-y-10">
        {/* Search bar + side filter panel */}
        <section className="dash-section relative z-30" style={{ animationDelay: "0ms" }}>
          <div className="flex items-stretch gap-2 relative">
            <div className="relative flex-1">
              <Search
                size={16}
                strokeWidth={2}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b6b8a]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies by title..."
                className="w-full rounded-xl border border-white/[0.08] bg-[#13131a] py-2.5 pl-10 pr-9 text-[0.86rem] font-medium text-[#eeeef5] placeholder:text-[#52526a] outline-none transition-colors focus:border-[#8b5cf6]/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6b8a] hover:text-[#eeeef5] bg-transparent border-none cursor-pointer p-0.5"
                  aria-label="Clear search text"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>

            <div className="relative" ref={filterPanelRef}>
              <button
                type="button"
                onClick={() => setFilterPanelOpen((prev) => !prev)}
                className="relative flex h-full items-center gap-1.5 rounded-xl border px-3.5 text-[0.82rem] font-semibold cursor-pointer transition-colors"
                style={{
                  borderColor: activeFilterCount ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.08)",
                  background: activeFilterCount ? "rgba(139,92,246,0.12)" : "#13131a",
                  color: activeFilterCount ? "#c4b5fd" : "#9292b0",
                }}
              >
                <SlidersHorizontal size={14} strokeWidth={2} />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#8b5cf6] text-[0.62rem] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Side filter panel */}
              {filterPanelOpen && (
                <div
                  className="absolute right-0 top-[calc(100%+8px)] z-[150] w-[240px] rounded-xl border border-white/[0.1] bg-[#15151d] p-4 shadow-[0_12px_36px_rgba(0,0,0,0.5)]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-[#a78bfa]">
                      Filter results
                    </span>
                    <button
                      type="button"
                      onClick={() => setFilterPanelOpen(false)}
                      className="text-[#6b6b8a] hover:text-[#eeeef5] bg-transparent border-none cursor-pointer p-0.5"
                      aria-label="Close filters"
                    >
                      <X size={14} strokeWidth={2} />
                    </button>
                  </div>

                  <label className="block text-[0.7rem] font-bold uppercase tracking-[0.06em] text-[#52526a] mb-1.5">
                    Genre
                  </label>
                  <select
                    value={filterGenre}
                    onChange={(e) => setFilterGenre(e.target.value)}
                    className="w-full mb-3.5 rounded-lg border border-white/[0.08] bg-[#0b0b0f] px-2.5 py-2 text-[0.8rem] font-medium text-[#eeeef5] outline-none cursor-pointer focus:border-[#8b5cf6]/50"
                  >
                    <option value="">Any genre</option>
                    {DASH_GENRES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>

                  <label className="block text-[0.7rem] font-bold uppercase tracking-[0.06em] text-[#52526a] mb-1.5">
                    Minimum rating
                  </label>
                  <select
                    value={filterRating}
                    onChange={(e) => setFilterRating(e.target.value)}
                    className="w-full mb-4 rounded-lg border border-white/[0.08] bg-[#0b0b0f] px-2.5 py-2 text-[0.8rem] font-medium text-[#eeeef5] outline-none cursor-pointer focus:border-[#8b5cf6]/50"
                  >
                    {RATING_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => { setFilterGenre(""); setFilterRating(""); }}
                    disabled={!activeFilterCount}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-transparent py-2 text-[0.78rem] font-semibold text-[#9292b0] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:border-white/20 hover:enabled:text-[#eeeef5] transition-colors"
                  >
                    <RotateCcw size={12} strokeWidth={2} />
                    Reset filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {isSearchActive ? (
          <section className="dash-section" style={{ animationDelay: "20ms" }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[0.8rem] text-[#6b6b8a]">
                {searchStatus === "loading" && "Searching..."}
                {searchStatus === "error" && (
                  <span className="text-[#f87171]">Search failed — couldn't reach the server.</span>
                )}
                {searchStatus === "success" &&
                  `${searchResults.length} result${searchResults.length === 1 ? "" : "s"} found`}
              </p>
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-[0.78rem] font-semibold text-[#a78bfa] bg-transparent border-none cursor-pointer p-0"
              >
                Clear search
              </button>
            </div>
            <MovieSection
              title="Search Results"
              subtitle={
                [
                  debouncedQuery.trim() && `"${debouncedQuery.trim()}"`,
                  filterGenre,
                  filterRating && `${filterRating}+ rating`,
                ].filter(Boolean).join(" · ") || "Matching your search"
              }
              icon={Search}
              iconColor="#a78bfa"
              movies={searchResults}
              loading={searchStatus === "loading"}
              emptyMessage={
                searchStatus === "error"
                  ? "Something went wrong reaching the server. Please try again."
                  : "No movies matched your search. Try a different title, genre, or rating."
              }
              onAddToWatchlist={handleAddToWatchlist}
              onViewDetails={handleViewDetails}
              watchlist={watchlist}
            />
          </section>
        ) : (
        <>
        <section className="dash-section" style={{ animationDelay: "0ms" }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[#a78bfa] mb-1.5">
                {getGreeting()}
              </p>
              <h1 className="text-[clamp(1.55rem,3.5vw,2.15rem)] font-extrabold tracking-[-0.03em] text-[#eeeef5] mb-3 leading-tight">
                {displayName} 👋
              </h1>

              {/* Mood + genre strip */}
              <div className="flex flex-wrap items-center gap-2">
                {latestMood?.mood ? (
                  <MoodBadge
                    mood={latestMood.mood}
                    timestamp={latestMood.timestamp ?? latestMood.createdAt}
                    showTime
                    size="md"
                  />
                ) : (
                  <Link
                    to="/mood"
                    className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/[0.18] px-3 py-1 text-[0.76rem] text-[#6b6b8a] no-underline hover:border-white/30 hover:text-[#9292b0] transition-all"
                  >
                    <SmilePlus size={11} strokeWidth={2} />
                    Set your mood
                  </Link>
                )}

                {favoriteGenres.slice(0, 4).map((g) => (
                  <GenreBadge key={g} genre={g} size="sm" />
                ))}

                {favoriteGenres.length === 0 && (
                  <Link
                    to="/preferences"
                    className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/[0.18] px-3 py-1 text-[0.76rem] text-[#6b6b8a] no-underline hover:border-white/30 hover:text-[#9292b0] transition-all"
                  >
                    Add favourite genres
                  </Link>
                )}
              </div>
            </div>

            {/* Right: quick stats */}
            <div className="flex gap-2.5 flex-shrink-0">
              <StatCard label="Watched" value={history.length} icon={Clock}     iconColor="#60a5fa" />
              <StatCard label="Genres"  value={favoriteGenres.length} icon={Star} iconColor="#fbbf24" />
            </div>
          </div>
        </section>

        <section className="dash-section" style={{ animationDelay: "55ms" }}>
          <MovieSection
            title="Recommended for You"
            subtitle="Personalised picks based on your taste"
            icon={Sparkles}
            iconColor="#a78bfa"
            movies={recs.personalized}
            loading={loading}
            emptyMessage="Personalised recommendations appear once we learn your taste. Start watching!"
            onAddToWatchlist={handleAddToWatchlist}
            onViewDetails={handleViewDetails}
            watchlist={watchlist}
          />
          <div style={{ textAlign: "right", marginTop: 10 }}>
            <Link
              to="/recommendations"
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#a78bfa",
                textDecoration: "none",
              }}
            >
              See all recommendations →
            </Link>
          </div>
        </section>

        {hasMoodSection && (
          <section className="dash-section" style={{ animationDelay: "110ms" }}>
            <MovieSection
              title={
                latestMood?.mood
                  ? `Because you're feeling ${latestMood.mood}`
                  : "Based on Your Mood"
              }
              subtitle="Curated for how you feel right now"
              icon={SmilePlus}
              iconColor={moodColor}
              movies={recs.moodBased}
              loading={loading}
              emptyMessage="Set a mood on the Mood page to unlock mood-matched recommendations."
              onAddToWatchlist={handleAddToWatchlist}
              onViewDetails={handleViewDetails}
              watchlist={watchlist}
            />
          </section>
        )}

        {hasTopRatedSection && (
          <section className="dash-section" style={{ animationDelay: "165ms" }}>
            <MovieSection
              title="Top 10 Movies"
              subtitle="The highest-rated titles on NextWatch right now"
              icon={ListChecks}
              iconColor="#34d399"
              movies={topRated}
              loading={loading}
              emptyMessage="Top-rated movies will appear here soon."
              onAddToWatchlist={handleAddToWatchlist}
              onViewDetails={handleViewDetails}
              watchlist={watchlist}
            />
          </section>
        )}

        {genreRows.map(({ genre, movies: genreMovies }, i) => (
          <section
            className="dash-section"
            key={genre}
            style={{ animationDelay: `${200 + i * 55}ms` }}
          >
            <MovieSection
              title={`${genre} Movies`}
              subtitle={`Top picks in ${genre}`}
              icon={Clapperboard}
              iconColor="#f472b6"
              movies={genreMovies}
              loading={loading}
              emptyMessage={`No ${genre} movies available right now.`}
              onAddToWatchlist={handleAddToWatchlist}
              onViewDetails={handleViewDetails}
              watchlist={watchlist}
            />
          </section>
        ))}

        <section className="dash-section" style={{ animationDelay: "550ms" }}>
          <MovieSection
            title="Trending Now"
            subtitle="What everyone is watching this week"
            icon={TrendingUp}
            iconColor="#fb923c"
            movies={movies}
            loading={loading}
            emptyMessage="Trending movies will appear here soon."
            onAddToWatchlist={handleAddToWatchlist}
            onViewDetails={handleViewDetails}
            watchlist={watchlist}
          />
        </section>

        {hasRecentSection && (
          <section className="dash-section" style={{ animationDelay: "605ms" }}>
            <MovieSection
              title="Recently Viewed"
              subtitle="Pick up where you left off"
              icon={Clock}
              iconColor="#60a5fa"
              movies={history}
              loading={loading}
              emptyMessage="Movies you watch will appear here."
              onAddToWatchlist={handleAddToWatchlist}
              onViewDetails={handleViewDetails}
              watchlist={watchlist}
            />
          </section>
        )}
        </>
        )}
      </main>

      <footer className="relative z-[1] flex flex-col items-center justify-center gap-1.5 border-t border-white/[0.06] py-5 mt-4">
        <div className="flex items-center gap-2.5">
          <Link
            to="/privacy-policy"
            className="text-[0.76rem] text-[#52526a] no-underline hover:text-[#9292b0] transition-colors"
          >
            Privacy Policy
          </Link>
          <span className="h-[3px] w-[3px] rounded-full bg-[#3d3d52]" />
          <Link
            to="/terms"
            className="text-[0.76rem] text-[#52526a] no-underline hover:text-[#9292b0] transition-colors"
          >
            Terms
          </Link>
          <span className="h-[3px] w-[3px] rounded-full bg-[#3d3d52]" />
          <span className="text-[0.76rem] text-[#3d3d52]">© 2025 NextWatch</span>
        </div>
        <span className="text-[0.68rem] text-[#3d3d52]">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </span>
      </footer>
    </div>
  );
}