import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Clapperboard, TrendingUp, Clock, Sparkles,
  Star, SmilePlus, ListChecks, LogOut, Loader2,
} from "lucide-react";
import { useAuth }                     from "../../context/AuthContext";
import {
  getLatestMood, getPreferences, getHistory,
  getRecommendations, getMovies,
}                                      from "../../services/api";
import MoodBadge, { MOOD_CONFIG }      from "../../components/MoodBadge";
import GenreBadge                      from "../../components/GenreBadge";
import MovieSection                    from "../../components/MovieSection";

function normalizeMovie(raw) {
  if (!raw) return null;
  const posterUrl =
    raw.posterUrl ??
    raw.poster   ??
    (raw.poster_path
      ? `https://image.tmdb.org/t/p/w500${raw.poster_path}`
      : null);

  return {
    id: raw._id ?? raw.id ?? raw.movieId ?? String(Math.random()),
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

  const [recs, setRecs]               = useState({ personalized: [], moodBased: [], historyBased: [] });
  const [latestMood, setLatestMood]   = useState(null);
  const [preferences, setPreferences] = useState({ favoriteGenres: [], dislikedGenres: [] });
  const [history, setHistory]         = useState([]);
  const [movies, setMovies]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [watchlist, setWatchlist]     = useState(new Set());

  useEffect(() => {
    let didCancel = false;

    const loadDashboard = async () => {
      if (!user?.id) {
        if (!didCancel) setLoading(false);
        return;
      }
      if (!didCancel) setLoading(true);

      const [recRes, moodRes, prefRes, histRes, movRes] = await Promise.allSettled([
        getRecommendations(user.id),
        getLatestMood(user.id),
        getPreferences(user.id),
        getHistory(user.id),
        getMovies(),
      ]);

      if (didCancel) return;

      if (recRes.status === "fulfilled") setRecs(normalizeRecommendations(recRes.value.data));
      if (moodRes.status === "fulfilled" && moodRes.value.data) setLatestMood(moodRes.value.data);
      if (prefRes.status === "fulfilled" && prefRes.value.data) setPreferences(prefRes.value.data);
      if (histRes.status === "fulfilled") setHistory(normalizeHistory(histRes.value.data));
      if (movRes.status === "fulfilled") setMovies(normalizeMovieList(movRes.value.data));

      if (!didCancel) setLoading(false);
    };

    if (!authLoading) {
      Promise.resolve().then(loadDashboard);
    }

    return () => {
      didCancel = true;
    };
  }, [authLoading, user?.id]);

  const handleAddToWatchlist = useCallback((id) => {
    setWatchlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast("Removed from Watchlist", { icon: "🗑️", theme: "dark" });
      } else {
        next.add(id);
        toast.success("Added to Watchlist");
      }
      return next;
    });
  }, []);

  const handleViewDetails = useCallback(() => {
    toast.info("Movie details coming soon.", { autoClose: 2000 });
    // navigate(`/movies/${id}`);  // uncomment when route is ready
  }, []);

  if (authLoading) return <LoadingScreen />;

  const moodKey     = latestMood?.mood?.toLowerCase() ?? "";
  const moodColor   = MOOD_CONFIG[moodKey]?.color ?? "#8b5cf6";
  const displayName = user?.username ?? user?.name ?? user?.email?.split("@")[0] ?? "there";
  const favoriteGenres = preferences?.favoriteGenres ?? [];

  const hasMoodSection    = loading || latestMood?.mood || recs.moodBased.length > 0;
  const hasHistorySection = loading || recs.historyBased.length > 0;
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
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 no-underline flex-shrink-0">
          <Clapperboard size={20} strokeWidth={1.8} className="text-[#a78bfa]" />
          <span className="text-[1rem] font-bold tracking-[-0.02em] text-[#eeeef5]">
            Next<span className="text-[#a78bfa]">Watch</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/mood"
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/[0.09] bg-[#1a1a24] px-3 py-1.5 text-[0.76rem] font-semibold text-[#9292b0] no-underline hover:border-white/20 hover:text-[#eeeef5] transition-all"
          >
            <SmilePlus size={13} strokeWidth={2} />
            Update Mood
          </Link>

          {/* Avatar */}
          <div className="flex items-center gap-2 pl-1">
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
          </div>

          {/* Sign out */}
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-[0.76rem] font-semibold text-[#6b6b8a] hover:border-white/15 hover:text-[#9292b0] transition-all"
          >
            <LogOut size={13} strokeWidth={2} />
            <span className="hidden sm:block">Sign out</span>
          </button>
        </div>
      </nav>

      <main className="relative z-[1] flex-1 w-full max-w-[1440px] mx-auto px-5 sm:px-8 py-8 space-y-10">

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

        {hasHistorySection && (
          <section className="dash-section" style={{ animationDelay: "165ms" }}>
            <MovieSection
              title="Based on Your Viewing History"
              subtitle="Because you enjoyed titles like these"
              icon={ListChecks}
              iconColor="#34d399"
              movies={recs.historyBased}
              loading={loading}
              emptyMessage="Watch a few movies and we'll build history-based picks for you."
              onAddToWatchlist={handleAddToWatchlist}
              onViewDetails={handleViewDetails}
              watchlist={watchlist}
            />
          </section>
        )}

        <section className="dash-section" style={{ animationDelay: "220ms" }}>
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
          <section className="dash-section" style={{ animationDelay: "275ms" }}>
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
      </main>

      <footer className="relative z-[1] flex items-center justify-center gap-2.5 border-t border-white/[0.06] py-5 mt-4">
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
      </footer>
    </div>
  );
}