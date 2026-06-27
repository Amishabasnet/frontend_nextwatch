import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Clapperboard,
  User,
  Mail,
  Shield,
  Calendar,
  Globe,
  Heart,
  ThumbsDown,
  SmilePlus,
  Bookmark,
  Clock,
  Star,
  Settings,
  Pencil,
  LogOut,
  AlertCircle,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import api, {
  getPreferences,
  getMoods,
  getRatingsByUser,
  getWatchlistByUser,
  getHistoryByUser,
} from "../../services/api";
import "./ProfilePage.css";


function getInitials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

function moodEmoji(mood = "") {
  const map = {
    happy: "😊", excited: "🤩", relaxed: "😌", sad: "😢",
    anxious: "😟", bored: "😑", adventurous: "🧗", romantic: "💕",
    scared: "😨", angry: "😠", nostalgic: "🥹", curious: "🤔",
  };
  return map[mood.toLowerCase()] ?? "🎭";
}

function formatDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d)) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function Skel({ w = "100%", h = 16, r = 6, mb = 0 }) {
  return (
    <span
      className="pf-skel"
      style={{ width: w, height: h, borderRadius: r, marginBottom: mb, display: "block" }}
    />
  );
}

function Card({ title, icon: Icon, accent, children, className = "" }) {
  return (
    <section className={`pf-card ${className}`}>
      <div className="pf-card-header">
        <span className="pf-card-icon" style={{ background: accent }}>
          <Icon size={14} />
        </span>
        <h2 className="pf-card-title">{title}</h2>
      </div>
      <div className="pf-card-body">{children}</div>
    </section>
  );
}

function StatTile({ icon: Icon, label, value, accent, to, loading }) {
  const inner = (
    <div className="pf-stat" style={{ "--accent": accent }}>
      <span className="pf-stat-icon">
        <Icon size={18} />
      </span>
      {loading ? (
        <Skel w={40} h={28} r={4} />
      ) : (
        <span className="pf-stat-value">{value ?? "—"}</span>
      )}
      <span className="pf-stat-label">{label}</span>
      {to && <ChevronRight size={14} className="pf-stat-arrow" />}
    </div>
  );
  return to ? (
    <Link to={to} className="pf-stat-link">{inner}</Link>
  ) : (
    inner
  );
}

function GenrePill({ genre, variant = "like" }) {
  return (
    <span className={`pf-genre-pill pf-genre-pill--${variant}`}>{genre}</span>
  );
}

function MoodChip({ mood }) {
  return (
    <span className="pf-mood-chip">
      <span className="pf-mood-emoji">{moodEmoji(mood.mood ?? mood)}</span>
      <span className="pf-mood-label">{mood.mood ?? mood}</span>
      {mood.createdAt && (
        <span className="pf-mood-date">{formatDate(mood.createdAt)}</span>
      )}
    </span>
  );
}

function InfoRow({ icon: Icon, label, value, loading }) {
  return (
    <div className="pf-info-row">
      <span className="pf-info-icon"><Icon size={14} /></span>
      <span className="pf-info-label">{label}</span>
      {loading ? (
        <Skel w="120px" h={13} r={4} />
      ) : (
        <span className="pf-info-value">{value ?? "—"}</span>
      )}
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="pf-error">
      <AlertCircle size={16} />
      <span>{message}</span>
      {onRetry && (
        <button className="pf-error-retry" onClick={onRetry}>
          <RefreshCw size={13} /> Retry
        </button>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile]           = useState(null);
  const [prefs, setPrefs]               = useState(null);
  const [moods, setMoods]               = useState([]);
  const [ratingsCount, setRatingsCount] = useState(null);
  const [watchlistCount, setWatchlistCount] = useState(null);
  const [historyCount, setHistoryCount] = useState(null);

  const [loading, setLoading] = useState({
    profile: true, prefs: true, moods: true,
    ratings: true, watchlist: true, history: true,
  });
  const [errors, setErrors] = useState({});

  const userId = user?._id ?? user?.id;
  const displayName = user?.name ?? user?.username ?? user?.email?.split("@")[0] ?? "You";

  // fetch profile (me)
  useEffect(() => {
    if (!user && !authLoading) { navigate("/login"); return; }
    if (!user) return;
    api.get("/auth/me")
      .then((r) => setProfile(r.data))
      .catch(() => setErrors((e) => ({ ...e, profile: "Couldn't load profile." })))
      .finally(() => setLoading((l) => ({ ...l, profile: false })));
  }, [user, authLoading, navigate]);

  // fetch preferences
  useEffect(() => {
    if (!user) return;
    getPreferences()
      .then((r) => setPrefs(r.data))
      .catch(() => setErrors((e) => ({ ...e, prefs: "Couldn't load preferences." })))
      .finally(() => setLoading((l) => ({ ...l, prefs: false })));
  }, [user]);

  // fetch moods
  useEffect(() => {
    if (!user) return;
    getMoods()
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : r.data?.moods ?? [];
        setMoods(list.slice(0, 5));
      })
      .catch(() => setErrors((e) => ({ ...e, moods: "Couldn't load moods." })))
      .finally(() => setLoading((l) => ({ ...l, moods: false })));
  }, [user]);

  // fetch counts
  useEffect(() => {
    if (!userId) return;

    getRatingsByUser(userId)
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : r.data?.ratings ?? [];
        setRatingsCount(list.length);
      })
      .catch(() => setErrors((e) => ({ ...e, ratings: "Couldn't load ratings." })))
      .finally(() => setLoading((l) => ({ ...l, ratings: false })));

    getWatchlistByUser(userId)
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : r.data?.watchlist ?? [];
        setWatchlistCount(list.length);
      })
      .catch(() => setErrors((e) => ({ ...e, watchlist: "Couldn't load watchlist." })))
      .finally(() => setLoading((l) => ({ ...l, watchlist: false })));

    getHistoryByUser(userId)
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : r.data?.history ?? [];
        setHistoryCount(list.length);
      })
      .catch(() => setErrors((e) => ({ ...e, history: "Couldn't load history." })))
      .finally(() => setLoading((l) => ({ ...l, history: false })));
  }, [userId]);

  const profileData   = profile ?? user ?? {};
  const likedGenres   = prefs?.favoriteGenres   ?? prefs?.likedGenres   ?? [];
  const dislikedGenres = prefs?.dislikedGenres  ?? prefs?.bannedGenres  ?? [];
  const prefLang      = prefs?.preferredLanguage ?? prefs?.language ?? null;
  const ageGroup      = profileData.ageGroup ?? profileData.age_group ?? null;
  const role          = profileData.role ?? profileData.userRole ?? null;

  if (authLoading) {
    return (
      <div className="pf-root">
        <div className="pf-glow pf-glow-tl" />
        <div className="pf-glow pf-glow-br" />
        <div className="pf-main">
          <div className="pf-hero-skel">
            <Skel w={80} h={80} r={40} />
            <div style={{ flex: 1 }}>
              <Skel w="55%" h={24} r={6} mb={10} />
              <Skel w="35%" h={14} r={4} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pf-root">
      {/* ambient glows */}
      <div className="pf-glow pf-glow-tl" />
      <div className="pf-glow pf-glow-br" />

      {/* ── nav ── */}
      <nav className="pf-nav">
        <Link to="/" className="pf-nav-logo">
          <Clapperboard size={20} className="pf-logo-icon" />
          <span className="pf-logo-text">
            Next<span className="pf-logo-accent">Watch</span>
          </span>
        </Link>
        <div className="pf-nav-right">
          <Link to="/discover" className="pf-nav-link pf-nav-link--ghost">
            Discover
          </Link>
          <div className="pf-nav-user">
            <div className="pf-avatar pf-avatar--nav">{getInitials(displayName)}</div>
            <span className="pf-nav-username">{displayName}</span>
          </div>
          <button className="pf-nav-signout" onClick={logout} title="Sign out">
            <LogOut size={14} />
            <span className="pf-nav-signout-label">Sign out</span>
          </button>
        </div>
      </nav>

      {/* ── main ── */}
      <main className="pf-main">

        {/* ── hero / identity card ── */}
        <div className="pf-hero-card">
          <div className="pf-hero-backdrop" />
          <div className="pf-hero-inner">
            <div className="pf-avatar pf-avatar--lg">
              {getInitials(profileData.name ?? profileData.username ?? displayName)}
            </div>
            <div className="pf-hero-info">
              {loading.profile ? (
                <>
                  <Skel w="50%" h={26} r={6} mb={8} />
                  <Skel w="38%" h={14} r={4} mb={6} />
                </>
              ) : (
                <>
                  <h1 className="pf-hero-name">
                    {profileData.name ?? profileData.username ?? displayName}
                  </h1>
                  <p className="pf-hero-email">
                    <Mail size={13} />
                    {profileData.email ?? "—"}
                  </p>
                </>
              )}
              <div className="pf-hero-badges">
                {ageGroup && <span className="pf-badge pf-badge--age">{ageGroup}</span>}
                {role     && <span className="pf-badge pf-badge--role">{role}</span>}
                {!ageGroup && !role && loading.profile && (
                  <Skel w={70} h={22} r={11} />
                )}
              </div>
            </div>
            {/* action buttons */}
            <div className="pf-hero-actions">
              <Link to="/preferences/edit" className="pf-action-btn pf-action-btn--primary">
                <Pencil size={14} />
                Edit Preferences
              </Link>
              <Link to="/settings" className="pf-action-btn pf-action-btn--ghost">
                <Settings size={14} />
                Settings
              </Link>
            </div>
          </div>
        </div>

        {/* ── stats row ── */}
        <div className="pf-stats-row">
          <StatTile
            icon={Bookmark}
            label="Watchlist"
            value={watchlistCount}
            accent="rgba(168,139,250,0.25)"
            to="/watchlist"
            loading={loading.watchlist}
          />
          <StatTile
            icon={Clock}
            label="Watched"
            value={historyCount}
            accent="rgba(14,165,233,0.25)"
            to="/history"
            loading={loading.history}
          />
          <StatTile
            icon={Star}
            label="Ratings"
            value={ratingsCount}
            accent="rgba(251,191,36,0.2)"
            loading={loading.ratings}
          />
        </div>

        {/* ── two-col grid ── */}
        <div className="pf-grid">

          {/* ── account info ── */}
          <Card title="Account" icon={User} accent="rgba(168,139,250,0.2)">
            {errors.profile && <ErrorBanner message={errors.profile} />}
            <InfoRow icon={User}     label="Name"      value={profileData.name ?? profileData.username} loading={loading.profile} />
            <InfoRow icon={Mail}     label="Email"     value={profileData.email}    loading={loading.profile} />
            <InfoRow icon={Calendar} label="Age group" value={ageGroup}             loading={loading.profile} />
            <InfoRow icon={Shield}   label="Role"      value={role}                 loading={loading.profile} />
          </Card>

          {/* ── preferences ── */}
          <Card title="Preferences" icon={Settings} accent="rgba(14,165,233,0.2)">
            {errors.prefs && <ErrorBanner message={errors.prefs} />}
            <InfoRow icon={Globe} label="Language" value={prefLang} loading={loading.prefs} />

            <div className="pf-pref-section">
              <div className="pf-pref-label">
                <Heart size={13} className="pf-pref-icon pf-pref-icon--like" />
                Favorite genres
              </div>
              {loading.prefs ? (
                <div className="pf-pill-row">
                  {[80, 60, 90, 70].map((w, i) => <Skel key={i} w={w} h={26} r={13} />)}
                </div>
              ) : likedGenres.length ? (
                <div className="pf-pill-row">
                  {likedGenres.map((g) => <GenrePill key={g} genre={g} variant="like" />)}
                </div>
              ) : (
                <p className="pf-empty-hint">No favorites set yet.</p>
              )}
            </div>

            <div className="pf-pref-section">
              <div className="pf-pref-label">
                <ThumbsDown size={13} className="pf-pref-icon pf-pref-icon--dislike" />
                Disliked genres
              </div>
              {loading.prefs ? (
                <div className="pf-pill-row">
                  {[65, 85].map((w, i) => <Skel key={i} w={w} h={26} r={13} />)}
                </div>
              ) : dislikedGenres.length ? (
                <div className="pf-pill-row">
                  {dislikedGenres.map((g) => <GenrePill key={g} genre={g} variant="dislike" />)}
                </div>
              ) : (
                <p className="pf-empty-hint">Nothing excluded.</p>
              )}
            </div>

            <Link to="/preferences/edit" className="pf-card-cta">
              <Pencil size={12} /> Update preferences <ChevronRight size={12} />
            </Link>
          </Card>

          {/* ── recent moods ── */}
          <Card title="Recent Moods" icon={SmilePlus} accent="rgba(251,191,36,0.18)">
            {errors.moods && <ErrorBanner message={errors.moods} />}
            {loading.moods ? (
              <div className="pf-mood-list">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="pf-mood-skel-row">
                    <Skel w={32} h={32} r={16} />
                    <Skel w="55%" h={14} r={4} />
                    <Skel w={60} h={12} r={4} />
                  </div>
                ))}
              </div>
            ) : moods.length ? (
              <div className="pf-mood-list">
                {moods.map((m, i) => <MoodChip key={i} mood={m} />)}
              </div>
            ) : (
              <p className="pf-empty-hint">No moods logged yet.</p>
            )}
          </Card>

          {/* ── quick links ── */}
          <Card title="Library" icon={Bookmark} accent="rgba(16,185,129,0.18)">
            <Link to="/watchlist" className="pf-lib-row">
              <span className="pf-lib-icon pf-lib-icon--purple"><Bookmark size={16} /></span>
              <div className="pf-lib-text">
                <span className="pf-lib-name">Watchlist</span>
                <span className="pf-lib-sub">
                  {loading.watchlist ? "—" : `${watchlistCount ?? 0} titles saved`}
                </span>
              </div>
              <ChevronRight size={15} className="pf-lib-arrow" />
            </Link>

            <Link to="/history" className="pf-lib-row">
              <span className="pf-lib-icon pf-lib-icon--blue"><Clock size={16} /></span>
              <div className="pf-lib-text">
                <span className="pf-lib-name">Viewing History</span>
                <span className="pf-lib-sub">
                  {loading.history ? "—" : `${historyCount ?? 0} titles watched`}
                </span>
              </div>
              <ChevronRight size={15} className="pf-lib-arrow" />
            </Link>

            <Link to="/settings" className="pf-lib-row">
              <span className="pf-lib-icon pf-lib-icon--gray"><Settings size={16} /></span>
              <div className="pf-lib-text">
                <span className="pf-lib-name">Settings</span>
                <span className="pf-lib-sub">Notifications, privacy, account</span>
              </div>
              <ChevronRight size={15} className="pf-lib-arrow" />
            </Link>
          </Card>

        </div>
      </main>
    </div>
  );
}
