import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Clapperboard,
  Smile,
  Frown,
  Meh,
  Leaf,
  PartyPopper,
  Heart,
  Brain,
  Angry,
  SmilePlus,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { postMood, getMoods, getLatestMood } from "../../services/api";

const MOODS = [
  { id: "happy", label: "Happy", icon: Smile, color: "#fbbf24" },
  { id: "sad", label: "Sad", icon: Frown, color: "#60a5fa" },
  { id: "relaxed", label: "Relaxed", icon: Leaf, color: "#34d399" },
  { id: "excited", label: "Excited", icon: PartyPopper, color: "#fb923c" },
  { id: "bored", label: "Bored", icon: Meh, color: "#94a3b8" },
  { id: "romantic", label: "Romantic", icon: Heart, color: "#fb7185" },
  { id: "stressed", label: "Stressed", icon: Brain, color: "#c084fc" },
  { id: "angry", label: "Angry", icon: Angry, color: "#ef4444" },
];

const MOOD_LOOKUP = MOODS.reduce((acc, m) => {
  acc[m.id] = m;
  return acc;
}, {});

function formatRelativeTime(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.round(days / 7)}w ago`;
}

export default function MoodPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const [selectedMood, setSelectedMood] = useState(null);
  const [lastLoggedAt, setLastLoggedAt] = useState(null);
  const [moodHistory, setMoodHistory] = useState([]);

  const [pageStatus, setPageStatus] = useState("loading"); // loading | idle | submitting
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let didCancel = false;

    const fetchMoodData = async () => {
      if (!user?.id) {
        if (!didCancel) setPageStatus("idle");
        return;
      }

      setPageStatus("loading");

      const [latestRes, historyRes] = await Promise.allSettled([
        getLatestMood(user.id),
        getMoods(user.id),
      ]);

      if (didCancel) return;

      if (latestRes.status === "fulfilled" && latestRes.value.data?.mood) {
        setSelectedMood(latestRes.value.data.mood);
        setLastLoggedAt(
          latestRes.value.data.timestamp ?? latestRes.value.data.createdAt ?? null
        );
      }

      if (historyRes.status === "fulfilled") {
        const raw = historyRes.value.data;
        const list = Array.isArray(raw) ? raw : raw?.moods ?? [];
        setMoodHistory(list.slice(-5).reverse());
      }

      if (!didCancel) setPageStatus("idle");
    };

    if (!authLoading) {
      Promise.resolve().then(fetchMoodData);
    }

    return () => {
      didCancel = true;
    };
  }, [authLoading, user?.id]);

  const handleShowRecommendations = async () => {
    setSubmitError("");

    if (!selectedMood) {
      toast.error("Pick a mood to continue.");
      return;
    }
    if (!user?.id) {
      toast.error("Please log in to save your mood.");
      return;
    }

    setPageStatus("submitting");
    try {
      await postMood({ mood: selectedMood, timestamp: new Date().toISOString() });
      toast.success("Mood logged! Finding recommendations for you…");
      setPageStatus("idle");
      // Short pause so the toast is visible before navigation
      setTimeout(() => navigate("/recommendations"), 800);
    } catch (err) {
      setPageStatus("idle");
      const msg =
        err.response?.data?.message || "Couldn't save your mood. Please try again.";
      setSubmitError(msg);
      toast.error(msg);
    }
  };

  const isLoading = authLoading || pageStatus === "loading";
  const isSubmitting = pageStatus === "submitting";
  const lastMoodMeta = lastLoggedAt && selectedMood ? MOOD_LOOKUP[selectedMood] : null;

  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-x-hidden bg-[#0b0b0f] text-[#c4c4d4]">
      <style>{`
        @keyframes moodFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Ambient glows */}
      <div
        className="pointer-events-none fixed -left-40 -top-40 z-0 h-[520px] w-[520px] rounded-full opacity-[0.13] blur-[110px]"
        style={{ background: "#8b5cf6" }}
      />
      <div
        className="pointer-events-none fixed -right-20 -bottom-30 z-0 h-[400px] w-[400px] rounded-full opacity-[0.13] blur-[110px]"
        style={{ background: "#2563eb" }}
      />

      <nav className="sticky top-0 z-[100] flex h-[58px] items-center justify-between border-b border-white/[0.07] bg-[#0b0b0f]/82 px-8 backdrop-blur-[14px]">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <Clapperboard size={20} strokeWidth={1.8} className="text-[#a78bfa]" />
          <span className="text-[1.05rem] font-bold tracking-[-0.02em] text-[#eeeef5]">
            Next<span className="text-[#a78bfa]">Watch</span>
          </span>
        </Link>
        <div className="hidden items-center gap-[5px] sm:flex">
          <span className="h-2 w-2 rounded-full bg-[#4ade80]" />
          <span className="h-px w-7 bg-white/10" />
          <span className="h-2 w-2 rounded-full bg-[#4ade80]" />
          <span className="h-px w-7 bg-white/10" />
          <span className="h-2 w-2 rounded-full bg-[#8b5cf6] shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
        </div>
      </nav>

      <main className="relative z-[1] flex flex-1 items-start justify-center px-5 py-10">
        {isLoading ? (
          <LoadingSkeleton />
        ) : !user?.id ? (
          <LoggedOutCard />
        ) : (
          <div
            className="w-full max-w-[680px] rounded-[20px] border border-white/[0.07] bg-[#13131a] p-6 shadow-[0_32px_80px_rgba(0,0,0,0.5)] sm:p-10"
            style={{ animation: "moodFadeUp 0.4s ease both" }}
          >
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mb-[1.1rem] inline-flex rounded-2xl border border-[#8b5cf6]/[0.22] bg-[#8b5cf6]/10 p-3.5 text-[#a78bfa]">
                <SmilePlus size={28} strokeWidth={1.5} />
              </div>
              <p className="mb-[0.55rem] text-xs font-semibold tracking-[0.1em] text-[#a78bfa] uppercase">
                Step 3 of 3
              </p>
              <h1 className="mb-3 text-[clamp(1.5rem,3vw,2rem)] font-extrabold tracking-[-0.03em] text-[#eeeef5]">
                How are you feeling right now?
              </h1>
              <p className="mx-auto max-w-[480px] text-[0.95rem] leading-[1.65] text-[#9292b0]">
                Pick the mood that fits best and we'll match recommendations to
                it. You can check in again any time.
              </p>
              {lastMoodMeta && (
                <p className="mt-3 text-[0.78rem] text-[#6b6b8a]">
                  You last felt{" "}
                  <span style={{ color: lastMoodMeta.color }}>
                    {lastMoodMeta.label.toLowerCase()}
                  </span>{" "}
                  {formatRelativeTime(lastLoggedAt)}.
                </p>
              )}
            </div>

            {/* Mood grid */}
            <section className="mb-6">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {MOODS.map((mood) => (
                  <MoodCard
                    key={mood.id}
                    mood={mood}
                    selected={selectedMood === mood.id}
                    onClick={() => setSelectedMood(mood.id)}
                  />
                ))}
              </div>
            </section>

            {/* Recent moods strip */}
            {moodHistory.length > 0 && (
              <section className="mb-6">
                <h2 className="mb-2.5 text-[0.78rem] font-semibold tracking-[0.07em] text-[#6b6b8a] uppercase">
                  Recent check-ins
                </h2>
                <div className="flex flex-wrap gap-2">
                  {moodHistory.map((entry, i) => {
                    const meta = MOOD_LOOKUP[entry.mood];
                    const Icon = meta?.icon;
                    const when = formatRelativeTime(
                      entry.timestamp ?? entry.createdAt
                    );
                    return (
                      <span
                        key={entry._id ?? entry.id ?? i}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-[#1a1a24] px-3 py-1 text-[0.76rem] text-[#9292b0]"
                      >
                        {Icon && (
                          <Icon
                            size={12}
                            strokeWidth={2}
                            style={{ color: meta.color }}
                          />
                        )}
                        {meta?.label ?? entry.mood}
                        {when && <span className="text-[#52526a]">· {when}</span>}
                      </span>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Submit error banner */}
            {submitError && (
              <div
                className="mb-5 flex items-center gap-2 rounded-[10px] border border-red-500/25 bg-red-500/[0.08] px-3.5 py-2.5 text-[0.82rem] text-red-300"
                role="alert"
              >
                <AlertCircle size={15} strokeWidth={2} />
                {submitError}
              </div>
            )}

            {/* CTA */}
            <button
              type="button"
              onClick={handleShowRecommendations}
              disabled={!selectedMood || isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-[11px] bg-[#8b5cf6] px-6 py-[0.85rem] text-[0.97rem] font-bold tracking-[0.01em] text-white transition-all duration-150 hover:-translate-y-px hover:bg-[#a78bfa] hover:shadow-[0_6px_24px_rgba(139,92,246,0.38)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:bg-[#8b5cf6]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  Show Recommendations
                  <ChevronRight size={17} />
                </>
              )}
            </button>

            {!selectedMood && (
              <p className="mt-2.5 text-center text-[0.77rem] text-[#6b6b8a]">
                Pick a mood above to continue.
              </p>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-[1] flex items-center justify-center gap-2.5 border-t border-white/[0.06] py-5">
        <Link
          to="/privacy-policy"
          className="text-[0.78rem] text-[#6b6b8a] no-underline transition-colors hover:text-[#eeeef5]"
        >
          Full Privacy Policy
        </Link>
        <span className="h-[3px] w-[3px] rounded-full bg-[#3d3d52]" />
        <Link
          to="/terms"
          className="text-[0.78rem] text-[#6b6b8a] no-underline transition-colors hover:text-[#eeeef5]"
        >
          Terms of Service
        </Link>
        <span className="h-[3px] w-[3px] rounded-full bg-[#3d3d52]" />
        <span className="text-[0.78rem] text-[#3d3d52]">© 2025 NextWatch</span>
      </footer>
    </div>
  );
}

function MoodCard({ mood, selected, onClick }) {
  const Icon = mood.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${mood.label}${selected ? ", selected" : ""}`}
      className="relative flex select-none flex-col items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-[#1a1a24] px-3 py-5 transition-all duration-150 cursor-pointer hover:border-white/15 hover:bg-[#1e1e2c]"
      style={
        selected
          ? {
              borderColor: `color-mix(in srgb, ${mood.color} 55%, transparent)`,
              background: `color-mix(in srgb, ${mood.color} 16%, #1a1a24)`,
              boxShadow: `0 0 0 1px color-mix(in srgb, ${mood.color} 35%, transparent)`,
            }
          : undefined
      }
    >
      {selected && (
        <span
          className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-white"
          style={{ background: mood.color }}
        >
          <CheckCircle2 size={12} strokeWidth={2.5} />
        </span>
      )}

      <Icon size={24} strokeWidth={1.6} style={{ color: mood.color }} />
      <span className="text-[0.83rem] font-semibold text-[#eeeef5]">
        {mood.label}
      </span>
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div
      className="flex w-full max-w-[680px] flex-col gap-3.5 rounded-[20px] border border-white/[0.07] bg-[#13131a] p-6 sm:p-10"
      aria-busy="true"
      aria-label="Loading your mood history"
    >
      <div className="mx-auto h-14 w-14 animate-pulse rounded-2xl bg-white/[0.06]" />
      <div className="mx-auto h-7 w-[55%] animate-pulse rounded-lg bg-white/[0.06]" />
      <div className="mx-auto h-4 w-[80%] animate-pulse rounded-lg bg-white/[0.06]" />
      <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-[92px] animate-pulse rounded-xl bg-white/[0.06]"
          />
        ))}
      </div>
      <div className="mt-2 h-12 animate-pulse rounded-[11px] bg-white/[0.06]" />
    </div>
  );
}

function LoggedOutCard() {
  return (
    <div className="w-full max-w-[480px] rounded-[20px] border border-white/[0.07] bg-[#13131a] p-10 text-center">
      <h2 className="mb-2 text-lg font-bold text-[#eeeef5]">
        Log in to check in with your mood
      </h2>
      <p className="mb-6 text-[0.88rem] leading-[1.6] text-[#9292b0]">
        We need to know who you are before saving how you're feeling.
      </p>
      <Link
        to="/login"
        className="inline-flex items-center gap-2 rounded-[11px] bg-[#8b5cf6] px-6 py-3 text-[0.9rem] font-bold text-white no-underline transition-colors hover:bg-[#a78bfa]"
      >
        Go to login
        <ChevronRight size={16} />
      </Link>
    </div>
  );
}
