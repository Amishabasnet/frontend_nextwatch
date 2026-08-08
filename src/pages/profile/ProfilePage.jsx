import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Clapperboard,
  User,
  Mail,
  Phone,
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
  X,
  Trash2,
  Loader2,
  Film,
  PlayCircle,
  MessageSquare,
  LayoutGrid,
  Check,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import BackButton from "../../components/BackButton";
import api, {
  getPreferences,
  getMoods,
  getRatingsByUser,
  getWatchlistByUser,
  getHistoryByUser,
  deleteWatchlist,
  putRating,
  updateHistoryEntry,
  removeHistoryItem,
  updateProfile,
  changePassword,
} from "../../services/api";
import GenreBadge from "../../components/GenreBadge";
import "./ProfilePage.css";

function normalizeWatchlistMovie(raw) {
  if (!raw) return null;
  const movie = raw.movie ?? raw.movieDetails ?? raw;
  return {
    id:          raw.movieId ?? movie._id ?? movie.id ?? String(Math.random()),
    title:       movie.title ?? raw.title ?? "Untitled",
    posterUrl:   movie.posterUrl ?? movie.poster_url ?? raw.posterUrl ?? null,
    genres:      Array.isArray(movie.genres) ? movie.genres.filter(Boolean) : [],
    rating:      Number(movie.averageScore ?? movie.voteAverage ?? raw.rating ?? 0) || 0,
    releaseYear: movie.releaseYear ?? movie.release_year ?? movie.year ?? raw.releaseYear ?? null,
    addedAt:     raw.addedAt ?? raw.createdAt ?? null,
  };
}

function normalizeRatingMovie(raw) {
  if (!raw) return null;
  const movie = raw.movieId && typeof raw.movieId === "object" ? raw.movieId : {};
  return {
    ratingId:     raw.id,
    id:           movie._id ?? movie.id ?? String(raw.movieId ?? Math.random()),
    title:        movie.title ?? "Untitled",
    posterUrl:    movie.posterUrl ?? null,
    genres:       Array.isArray(movie.genres) ? movie.genres.filter(Boolean) : [],
    releaseYear:  movie.releaseYear ?? null,
    userRating:   raw.rating,
    liked:        !!raw.liked,
    disliked:     !!raw.disliked,
    feedbackText: raw.feedbackText ?? "",
    updatedAt:    raw.updatedAt ?? raw.createdAt,
  };
}

function normalizeHistoryMovie(raw) {
  if (!raw) return null;
  const movie = raw.movie && typeof raw.movie === "object" ? raw.movie : {};
  return {
    historyId:  raw.id,
    id:         movie._id ?? movie.id ?? String(raw.movie ?? Math.random()),
    title:      movie.title ?? "Untitled",
    posterUrl:  movie.posterUrl ?? null,
    genres:     Array.isArray(movie.genres) ? movie.genres.filter(Boolean) : [],
    releaseYear: movie.releaseYear ?? null,
    watchedAt:  raw.watchedAt,
    completed:  !!raw.completed,
    rating:     raw.rating,
    review:     raw.review ?? "",
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

function StatTile({ icon: Icon, label, value, accent, onClick, loading }) {
  return (
    <button type="button" className="pf-stat-link pf-stat-link--btn" onClick={onClick}>
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
        <ChevronRight size={14} className="pf-stat-arrow" />
      </div>
    </button>
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

/* ── shared poster thumbnail for the grid tabs ── */
function PosterThumb({ title, posterUrl, size = "md" }) {
  const [imgError, setImgError] = useState(false);
  const hasPoster = posterUrl && !imgError;
  const dims = size === "sm" ? "w-14 h-20" : "w-full aspect-[2/3]";
  return (
    <div className={`${dims} rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center`} style={!hasPoster ? { background: titleToGradient(title) } : undefined}>
      {hasPoster ? (
        <img
          src={posterUrl}
          alt={title}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-white/10 font-black text-2xl">{title.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

/* ── empty state for tab panels ── */
function TabEmptyState({ icon: Icon, title, body, ctaLabel, ctaTo }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2 py-16 px-4">
      <Icon size={30} strokeWidth={1.3} className="text-[#454560] mb-1" />
      <p className="text-[0.92rem] font-semibold text-[#c4c4d4]">{title}</p>
      <p className="text-[0.8rem] text-[#6b6b8a] max-w-xs">{body}</p>
      {ctaTo && (
        <Link to={ctaTo} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#7c3aed] px-3.5 py-2 text-[0.78rem] font-semibold text-white hover:bg-[#6d28d9] transition-colors">
          <Film size={13} /> {ctaLabel}
        </Link>
      )}
    </div>
  );
}

function TabLoadingGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 py-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="w-full aspect-[2/3] rounded-lg bg-white/[0.05] animate-pulse" />
          <div className="h-3 w-4/5 rounded bg-white/[0.05] animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/* ── Watchlist tab ── */
function WatchlistTab({ movies, loading, error, onRetry, onRemove, removingIds, navigate }) {
  if (loading) return <TabLoadingGrid />;
  if (error) return <ErrorBanner message={error} onRetry={onRetry} />;
  if (!movies.length) {
    return (
      <TabEmptyState
        icon={Bookmark}
        title="Your watchlist is empty"
        body="Save movies you want to watch later and they'll show up here."
        ctaLabel="Browse Movies"
        ctaTo="/movies"
      />
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 py-2">
      {movies.map((m) => (
        <div key={m.id} className="group flex flex-col rounded-xl overflow-hidden border border-white/[0.07] bg-[#13131a] hover:border-white/[0.15] transition-colors">
          <div className="relative">
            <PosterThumb title={m.title} posterUrl={m.posterUrl} />
            <div className="absolute inset-0 flex items-end p-2 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => navigate(`/movies/${m.id}`)}
                className="flex-1 flex items-center justify-center gap-1 rounded-md bg-[#8b5cf6]/90 py-1.5 text-[0.7rem] font-bold text-white hover:bg-[#a78bfa]"
              >
                <Eye size={12} /> View
              </button>
            </div>
          </div>
          <div className="p-2.5 flex flex-col gap-1.5">
            <h3 className="text-[0.8rem] font-bold text-[#eeeef5] leading-tight line-clamp-2 min-h-[2.1rem]">{m.title}</h3>
            {m.genres.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {m.genres.slice(0, 2).map((g) => <GenreBadge key={g} genre={g} size="xs" />)}
              </div>
            )}
            <button
              type="button"
              disabled={removingIds.has(m.id)}
              onClick={() => onRemove(m.id, m.title)}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.09] bg-[#1a1a24] py-[6px] text-[0.7rem] font-semibold text-[#6b6b8a] hover:border-red-500/30 hover:text-red-400 transition-colors"
            >
              {removingIds.has(m.id) ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Favorites tab (liked ratings) ── */
function FavoritesTab({ movies, loading, error, onRetry, onUnfavorite, busyIds, navigate }) {
  if (loading) return <TabLoadingGrid />;
  if (error) return <ErrorBanner message={error} onRetry={onRetry} />;
  if (!movies.length) {
    return (
      <TabEmptyState
        icon={Heart}
        title="No favorite movies yet"
        body="Like a movie while rating it and it'll be saved here."
        ctaLabel="Browse Movies"
        ctaTo="/movies"
      />
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 py-2">
      {movies.map((m) => (
        <div key={m.ratingId} className="group flex flex-col rounded-xl overflow-hidden border border-white/[0.07] bg-[#13131a] hover:border-white/[0.15] transition-colors">
          <div className="relative">
            <PosterThumb title={m.title} posterUrl={m.posterUrl} />
            <div className="absolute top-2 left-2 flex items-center gap-[3px] rounded-md bg-black/65 backdrop-blur-sm px-1.5 py-[3px]">
              <Star size={9} strokeWidth={0} fill="#fbbf24" />
              <span className="text-[0.68rem] font-bold text-[#fbbf24]">{m.userRating}</span>
            </div>
            <div className="absolute inset-0 flex items-end p-2 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => navigate(`/movies/${m.id}`)}
                className="flex-1 flex items-center justify-center gap-1 rounded-md bg-[#8b5cf6]/90 py-1.5 text-[0.7rem] font-bold text-white hover:bg-[#a78bfa]"
              >
                <Eye size={12} /> View
              </button>
            </div>
          </div>
          <div className="p-2.5 flex flex-col gap-1.5">
            <h3 className="text-[0.8rem] font-bold text-[#eeeef5] leading-tight line-clamp-2 min-h-[2.1rem]">{m.title}</h3>
            <button
              type="button"
              disabled={busyIds.has(m.ratingId)}
              onClick={() => onUnfavorite(m)}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-pink-500/30 bg-pink-500/10 py-[6px] text-[0.7rem] font-semibold text-pink-300 hover:bg-pink-500/20 transition-colors"
            >
              {busyIds.has(m.ratingId) ? <Loader2 size={12} className="animate-spin" /> : <Heart size={12} fill="currentColor" />}
              Unfavorite
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Reviews tab (ratings with feedbackText) ── */
function ReviewRow({ movie, onSave, onDelete, navigate }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(movie.feedbackText);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await onSave(movie.ratingId, text.trim());
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="flex gap-3 rounded-xl border border-white/[0.07] bg-[#13131a] p-3">
      <div onClick={() => navigate(`/movies/${movie.id}`)} className="cursor-pointer">
        <PosterThumb title={movie.title} posterUrl={movie.posterUrl} size="sm" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3
            onClick={() => navigate(`/movies/${movie.id}`)}
            className="text-[0.86rem] font-bold text-[#eeeef5] cursor-pointer hover:text-[#c4b5fd] leading-tight"
          >
            {movie.title}
          </h3>
          <span className="flex items-center gap-1 flex-shrink-0 text-[0.75rem] font-bold text-[#fbbf24]">
            <Star size={11} strokeWidth={0} fill="#fbbf24" /> {movie.userRating}
          </span>
        </div>
        {editing ? (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              rows={3}
              className="w-full rounded-lg bg-[#0b0b0f] border border-white/[0.1] p-2 text-[0.78rem] text-[#c4c4d4] focus:outline-none focus:border-[#7c3aed]/50 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={save} disabled={busy} className="flex items-center gap-1 rounded-lg bg-[#7c3aed] px-3 py-1.5 text-[0.72rem] font-semibold text-white hover:bg-[#6d28d9]">
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
              </button>
              <button onClick={() => { setEditing(false); setText(movie.feedbackText); }} className="rounded-lg border border-white/[0.09] px-3 py-1.5 text-[0.72rem] font-semibold text-[#6b6b8a] hover:text-[#eeeef5]">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[0.8rem] text-[#9292b0] leading-relaxed">{movie.feedbackText}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[0.68rem] text-[#454560]">{formatDate(movie.updatedAt)}</span>
              <button onClick={() => setEditing(true)} className="ml-auto flex items-center gap-1 text-[0.7rem] font-semibold text-[#6b6b8a] hover:text-[#a78bfa]">
                <Pencil size={11} /> Edit
              </button>
              <button onClick={() => onDelete(movie.ratingId)} className="flex items-center gap-1 text-[0.7rem] font-semibold text-[#6b6b8a] hover:text-red-400">
                <Trash2 size={11} /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

function ReviewsTab({ movies, loading, error, onRetry, onSave, onDelete, navigate }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 py-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-white/[0.04] animate-pulse" />
        ))}
      </div>
    );
  }
  if (error) return <ErrorBanner message={error} onRetry={onRetry} />;
  if (!movies.length) {
    return (
      <TabEmptyState
        icon={MessageSquare}
        title="No reviews written yet"
        body="Add written feedback when you rate a movie and it'll appear here."
        ctaLabel="Browse Movies"
        ctaTo="/movies"
      />
    );
  }
  return (
    <div className="flex flex-col gap-3 py-2">
      {movies.map((m) => (
        <ReviewRow key={m.ratingId} movie={m} onSave={onSave} onDelete={onDelete} navigate={navigate} />
      ))}
    </div>
  );
}

/* ── Continue Watching tab (history where completed === false) ── */
function ContinueWatchingTab({ movies, loading, error, onRetry, onMarkWatched, onRemove, busyIds, navigate }) {
  if (loading) return <TabLoadingGrid />;
  if (error) return <ErrorBanner message={error} onRetry={onRetry} />;
  if (!movies.length) {
    return (
      <TabEmptyState
        icon={PlayCircle}
        title="Nothing in progress"
        body="Movies you start watching but haven't finished will show up here."
        ctaLabel="Browse Movies"
        ctaTo="/movies"
      />
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 py-2">
      {movies.map((m) => (
        <div key={m.historyId} className="group flex flex-col rounded-xl overflow-hidden border border-white/[0.07] bg-[#13131a] hover:border-white/[0.15] transition-colors">
          <div className="relative">
            <PosterThumb title={m.title} posterUrl={m.posterUrl} />
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
              <div className="h-full w-1/2 bg-[#7c3aed]" />
            </div>
            <div className="absolute inset-0 flex items-end p-2 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => navigate(`/movies/${m.id}`)}
                className="flex-1 flex items-center justify-center gap-1 rounded-md bg-[#8b5cf6]/90 py-1.5 text-[0.7rem] font-bold text-white hover:bg-[#a78bfa]"
              >
                <PlayCircle size={13} /> Resume
              </button>
            </div>
          </div>
          <div className="p-2.5 flex flex-col gap-1.5">
            <h3 className="text-[0.8rem] font-bold text-[#eeeef5] leading-tight line-clamp-2 min-h-[2.1rem]">{m.title}</h3>
            <span className="text-[0.68rem] text-[#454560]">Started {formatDate(m.watchedAt)}</span>
            <div className="flex gap-1.5 mt-1">
              <button
                type="button"
                disabled={busyIds.has(m.id)}
                onClick={() => onMarkWatched(m.id, m.title)}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-[6px] text-[0.68rem] font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors"
              >
                {busyIds.has(m.id) ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                Mark Watched
              </button>
              <button
                type="button"
                disabled={busyIds.has(m.id)}
                onClick={() => onRemove(m.id, m.title)}
                aria-label={`Remove ${m.title}`}
                className="flex items-center justify-center rounded-lg border border-white/[0.09] bg-[#1a1a24] px-2.5 text-[#6b6b8a] hover:border-red-500/30 hover:text-red-400 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Edit Profile modal ── */
function EditProfileModal({ initialName, initialEmail, initialPhone, onClose, onSaved }) {
  const [name, setName] = useState(initialName ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setFormError("Name cannot be empty."); return; }
    if (phone.trim() && !/^[+]?[\d\s()-]{7,15}$/.test(phone.trim())) {
      setFormError("Enter a valid phone number.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await updateProfile({ name: name.trim(), email: email.trim(), phone: phone.trim() });
      toast.success("Profile updated");
      onSaved({ name: name.trim(), email: email.trim(), phone: phone.trim() });
      onClose();
    } catch (err) {
      setFormError(err.response?.data?.message ?? "Couldn't update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} role="presentation" />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm rounded-2xl border border-white/[0.09] bg-[#13131a] p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[1rem] font-bold text-[#eeeef5]">Edit Profile</h2>
          <button type="button" onClick={onClose} className="text-[#6b6b8a] hover:text-[#eeeef5]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {formError && <ErrorBanner message={formError} />}

        <label className="block mb-3">
          <span className="block text-[0.72rem] font-semibold text-[#9292b0] mb-1">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg bg-[#0b0b0f] border border-white/[0.1] px-3 py-2 text-[0.85rem] text-[#eeeef5] focus:outline-none focus:border-[#7c3aed]/50"
          />
        </label>

        <label className="block mb-4">
          <span className="block text-[0.72rem] font-semibold text-[#9292b0] mb-1">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg bg-[#0b0b0f] border border-white/[0.1] px-3 py-2 text-[0.85rem] text-[#eeeef5] focus:outline-none focus:border-[#7c3aed]/50"
          />
        </label>

        <label className="block mb-4">
          <span className="block text-[0.72rem] font-semibold text-[#9292b0] mb-1">Phone</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+977 98XXXXXXXX"
            className="w-full rounded-lg bg-[#0b0b0f] border border-white/[0.1] px-3 py-2 text-[0.85rem] text-[#eeeef5] focus:outline-none focus:border-[#7c3aed]/50"
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#7c3aed] py-2.5 text-[0.84rem] font-bold text-white hover:bg-[#6d28d9] transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Save changes
        </button>
      </form>
    </div>
  );
}

function PasswordField({ label, value, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block mb-3">
      <span className="block text-[0.72rem] font-semibold text-[#9292b0] mb-1">{label}</span>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className="w-full rounded-lg bg-[#0b0b0f] border border-white/[0.1] px-3 py-2 pr-9 text-[0.85rem] text-[#eeeef5] focus:outline-none focus:border-[#7c3aed]/50"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6b6b8a] hover:text-[#eeeef5]"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </label>
  );
}

function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword) { setFormError("Enter your current password."); return; }
    if (newPassword.length < 6) { setFormError("New password must be at least 6 characters."); return; }
    if (newPassword === currentPassword) { setFormError("New password must be different from current password."); return; }
    if (newPassword !== confirmPassword) { setFormError("New passwords don't match."); return; }

    setSaving(true);
    setFormError("");
    try {
      await changePassword({ currentPassword, newPassword });
      toast.success("Password updated");
      onClose();
    } catch (err) {
      setFormError(err.response?.data?.message ?? "Couldn't update password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} role="presentation" />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm rounded-2xl border border-white/[0.09] bg-[#13131a] p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[1rem] font-bold text-[#eeeef5]">Change Password</h2>
          <button type="button" onClick={onClose} className="text-[#6b6b8a] hover:text-[#eeeef5]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {formError && <ErrorBanner message={formError} />}

        <PasswordField
          label="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />
        <PasswordField
          label="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
        <div className="mb-1">
          <PasswordField
            label="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <p className="text-[0.72rem] text-[#6b6b8a] mb-4">
          You'll stay signed in here, but other devices will be signed out.
        </p>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#7c3aed] py-2.5 text-[0.84rem] font-bold text-white hover:bg-[#6d28d9] transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Update password
        </button>
      </form>
    </div>
  );
}

const TABS = [
  { key: "overview",   label: "Overview",         icon: LayoutGrid },
  { key: "watchlist",  label: "Watchlist",        icon: Bookmark },
  { key: "favorites",  label: "Favorites",        icon: Heart },
  { key: "reviews",    label: "Reviews",          icon: MessageSquare },
  { key: "continue",   label: "Continue Watching", icon: PlayCircle },
];

export default function ProfilePage() {
  const { user, isLoading: authLoading, logout, getCurrentUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const [profile, setProfile]           = useState(null);
  const [prefs, setPrefs]               = useState(null);
  const [moods, setMoods]               = useState([]);

  const [ratings, setRatings]           = useState([]);
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);

  const [loading, setLoading] = useState({
    profile: true, prefs: true, moods: true,
    ratings: true, watchlist: true, history: true,
  });
  const [errors, setErrors] = useState({});

  const [removingWatchlistIds, setRemovingWatchlistIds] = useState(new Set());
  const [favoriteBusyIds, setFavoriteBusyIds]           = useState(new Set());
  const [continueBusyIds, setContinueBusyIds]           = useState(new Set());

  const userId = user?._id ?? user?.id;
  const displayName = user?.name ?? user?.username ?? user?.email?.split("@")[0] ?? "You";

  const fetchRatings = useCallback(async () => {
    setLoading((l) => ({ ...l, ratings: true }));
    try {
      const res = await getRatingsByUser(userId);
      const list = Array.isArray(res.data) ? res.data : res.data?.ratings ?? [];
      setRatings(list.map(normalizeRatingMovie).filter(Boolean));
      setErrors((e) => ({ ...e, ratings: undefined }));
    } catch (err) {
      setErrors((e) => ({ ...e, ratings: err.response?.data?.message ?? "Couldn't load ratings." }));
    } finally {
      setLoading((l) => ({ ...l, ratings: false }));
    }
  }, [userId]);

  const fetchWatchlist = useCallback(async () => {
    setLoading((l) => ({ ...l, watchlist: true }));
    try {
      const res = await getWatchlistByUser(userId, { limit: 100 });
      const list = Array.isArray(res.data) ? res.data : res.data?.watchlist ?? res.data?.items ?? [];
      setWatchlistItems(list.map(normalizeWatchlistMovie).filter(Boolean));
      setErrors((e) => ({ ...e, watchlist: undefined }));
    } catch (err) {
      setErrors((e) => ({ ...e, watchlist: err.response?.data?.message ?? "Couldn't load your watchlist." }));
    } finally {
      setLoading((l) => ({ ...l, watchlist: false }));
    }
  }, [userId]);

  const fetchHistory = useCallback(async () => {
    setLoading((l) => ({ ...l, history: true }));
    try {
      const res = await getHistoryByUser(userId, { limit: 100 });
      const list = Array.isArray(res.data) ? res.data : res.data?.history ?? [];
      setHistoryItems(list.map(normalizeHistoryMovie).filter(Boolean));
      setErrors((e) => ({ ...e, history: undefined }));
    } catch (err) {
      setErrors((e) => ({ ...e, history: err.response?.data?.message ?? "Couldn't load your history." }));
    } finally {
      setLoading((l) => ({ ...l, history: false }));
    }
  }, [userId]);

  const handleRemoveFromWatchlist = useCallback(async (id, title) => {
    setRemovingWatchlistIds((prev) => new Set(prev).add(id));
    setWatchlistItems((prev) => prev.filter((m) => m.id !== id));
    try {
      await deleteWatchlist(id);
      toast(`Removed "${title}"`, { icon: "🗑️", theme: "dark" });
    } catch {
      toast.error("Couldn't remove movie — please try again.");
      fetchWatchlist();
    } finally {
      setRemovingWatchlistIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }, [fetchWatchlist]);

  const handleUnfavorite = useCallback(async (movie) => {
    setFavoriteBusyIds((prev) => new Set(prev).add(movie.ratingId));
    try {
      await putRating(movie.ratingId, { liked: false });
      setRatings((prev) => prev.map((r) => r.ratingId === movie.ratingId ? { ...r, liked: false } : r));
      toast(`Removed "${movie.title}" from favorites`, { theme: "dark" });
    } catch {
      toast.error("Couldn't update favorite — please try again.");
    } finally {
      setFavoriteBusyIds((prev) => { const s = new Set(prev); s.delete(movie.ratingId); return s; });
    }
  }, []);

  const handleSaveReview = useCallback(async (ratingId, feedbackText) => {
    try {
      await putRating(ratingId, { feedbackText });
      setRatings((prev) => prev.map((r) => r.ratingId === ratingId ? { ...r, feedbackText, updatedAt: new Date().toISOString() } : r));
      toast.success("Review updated");
    } catch {
      toast.error("Couldn't save review — please try again.");
      throw new Error("save failed");
    }
  }, []);

  const handleDeleteReview = useCallback(async (ratingId) => {
    try {
      await putRating(ratingId, { feedbackText: "" });
      setRatings((prev) => prev.map((r) => r.ratingId === ratingId ? { ...r, feedbackText: "" } : r));
      toast(`Review deleted`, { icon: "🗑️", theme: "dark" });
    } catch {
      toast.error("Couldn't delete review — please try again.");
    }
  }, []);

  const handleMarkWatched = useCallback(async (movieId, title) => {
    setContinueBusyIds((prev) => new Set(prev).add(movieId));
    try {
      await updateHistoryEntry(movieId, { completed: true });
      setHistoryItems((prev) => prev.map((h) => h.id === movieId ? { ...h, completed: true } : h));
      toast.success(`Marked "${title}" as watched`);
    } catch {
      toast.error("Couldn't update — please try again.");
    } finally {
      setContinueBusyIds((prev) => { const s = new Set(prev); s.delete(movieId); return s; });
    }
  }, []);

  const handleRemoveFromHistory = useCallback(async (movieId, title) => {
    setContinueBusyIds((prev) => new Set(prev).add(movieId));
    setHistoryItems((prev) => prev.filter((h) => h.id !== movieId));
    try {
      await removeHistoryItem(movieId);
      toast(`Removed "${title}"`, { icon: "🗑️", theme: "dark" });
    } catch {
      toast.error("Couldn't remove — please try again.");
      fetchHistory();
    } finally {
      setContinueBusyIds((prev) => { const s = new Set(prev); s.delete(movieId); return s; });
    }
  }, [fetchHistory]);

  // fetch profile (me)
  useEffect(() => {
    if (!user && !authLoading) { navigate("/login"); return; }
    if (!user) return;
    api.get("/auth/profile")
      .then((r) => setProfile(r.data))
      .catch(() => setErrors((e) => ({ ...e, profile: "Couldn't load profile." })))
      .finally(() => setLoading((l) => ({ ...l, profile: false })));
  }, [user, authLoading, navigate]);

  // fetch preferences
  useEffect(() => {
    if (!userId) return;
    getPreferences(userId)
      .then((r) => setPrefs(r.data))
      .catch(() => setErrors((e) => ({ ...e, prefs: "Couldn't load preferences." })))
      .finally(() => setLoading((l) => ({ ...l, prefs: false })));
  }, [userId]);

  // fetch moods
  useEffect(() => {
    if (!userId) return;
    getMoods(userId)
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : r.data?.moods ?? [];
        setMoods(list.slice(0, 5));
      })
      .catch(() => setErrors((e) => ({ ...e, moods: "Couldn't load moods." })))
      .finally(() => setLoading((l) => ({ ...l, moods: false })));
  }, [userId]);

  // fetch ratings / watchlist / history (drive both stats + tabs)
  useEffect(() => {
    if (!userId) return;
    fetchRatings();
    fetchWatchlist();
    fetchHistory();
  }, [userId, fetchRatings, fetchWatchlist, fetchHistory]);

  const profileData    = profile ?? user ?? {};
  const likedGenres    = prefs?.favoriteGenres   ?? prefs?.likedGenres   ?? [];
  const dislikedGenres = prefs?.dislikedGenres   ?? prefs?.bannedGenres  ?? [];
  const prefLang       = prefs?.preferredLanguage ?? prefs?.language ?? null;
  const ageGroup        = profileData.ageGroup ?? profileData.age_group ?? null;
  const role            = profileData.role ?? profileData.userRole ?? null;

  const favoriteMovies  = ratings.filter((r) => r.liked);
  const reviewMovies    = ratings.filter((r) => r.feedbackText && r.feedbackText.trim().length > 0);
  const continueMovies  = historyItems.filter((h) => !h.completed);

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
          <Link to="/movies" className="pf-nav-link pf-nav-link--ghost">
            Movies
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
        <BackButton />


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
              <button type="button" onClick={() => setEditOpen(true)} className="pf-action-btn pf-action-btn--primary">
                <Pencil size={14} />
                Edit Profile
              </button>
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
            value={watchlistItems.length}
            accent="rgba(168,139,250,0.25)"
            onClick={() => setActiveTab("watchlist")}
            loading={loading.watchlist}
          />
          <StatTile
            icon={Heart}
            label="Favorites"
            value={favoriteMovies.length}
            accent="rgba(244,63,94,0.22)"
            onClick={() => setActiveTab("favorites")}
            loading={loading.ratings}
          />
          <StatTile
            icon={MessageSquare}
            label="Reviews"
            value={reviewMovies.length}
            accent="rgba(251,191,36,0.2)"
            onClick={() => setActiveTab("reviews")}
            loading={loading.ratings}
          />
          <StatTile
            icon={PlayCircle}
            label="Continue"
            value={continueMovies.length}
            accent="rgba(52,211,153,0.2)"
            onClick={() => setActiveTab("continue")}
            loading={loading.history}
          />
        </div>

        {/* ── tab bar ── */}
        <div className="pf-tabbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`pf-tab ${activeTab === t.key ? "pf-tab--active" : ""}`}
              onClick={() => setActiveTab(t.key)}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── tab content ── */}
        {activeTab === "overview" && (
          <div className="pf-grid">
            {/* ── account info ── */}
            <Card title="Account" icon={User} accent="rgba(168,139,250,0.2)">
              {errors.profile && <ErrorBanner message={errors.profile} />}
              <InfoRow icon={User}     label="Name"      value={profileData.name ?? profileData.username} loading={loading.profile} />
              <InfoRow icon={Mail}     label="Email"     value={profileData.email}    loading={loading.profile} />
              <InfoRow icon={Phone}    label="Phone"     value={profileData.phone || "Not set"} loading={loading.profile} />
              <InfoRow icon={Calendar} label="Age group" value={ageGroup}             loading={loading.profile} />
              <InfoRow icon={Shield}   label="Role"      value={role}                 loading={loading.profile} />
              <button type="button" onClick={() => setEditOpen(true)} className="pf-card-cta" style={{ background: "none", border: "none", cursor: "pointer" }}>
                <Pencil size={12} /> Edit profile <ChevronRight size={12} />
              </button>
              <button type="button" onClick={() => setPasswordOpen(true)} className="pf-card-cta" style={{ background: "none", border: "none", cursor: "pointer", marginLeft: 16 }}>
                <Lock size={12} /> Change password <ChevronRight size={12} />
              </button>
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

              <Link to="/preferences" className="pf-card-cta">
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
              <button type="button" className="pf-lib-row pf-lib-row--btn" onClick={() => setActiveTab("watchlist")}>
                <span className="pf-lib-icon pf-lib-icon--purple"><Bookmark size={16} /></span>
                <div className="pf-lib-text">
                  <span className="pf-lib-name">Watchlist</span>
                  <span className="pf-lib-sub">
                    {loading.watchlist ? "—" : `${watchlistItems.length} titles saved`}
                  </span>
                </div>
                <ChevronRight size={15} className="pf-lib-arrow" />
              </button>

              <button type="button" className="pf-lib-row pf-lib-row--btn" onClick={() => setActiveTab("continue")}>
                <span className="pf-lib-icon pf-lib-icon--blue"><Clock size={16} /></span>
                <div className="pf-lib-text">
                  <span className="pf-lib-name">Continue Watching</span>
                  <span className="pf-lib-sub">
                    {loading.history ? "—" : `${continueMovies.length} in progress`}
                  </span>
                </div>
                <ChevronRight size={15} className="pf-lib-arrow" />
              </button>

              <Link to="/history" className="pf-lib-row">
                <span className="pf-lib-icon pf-lib-icon--gray"><Clock size={16} /></span>
                <div className="pf-lib-text">
                  <span className="pf-lib-name">Full Watch History</span>
                  <span className="pf-lib-sub">
                    {loading.history ? "—" : `${historyItems.length} titles total`}
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
        )}

        {activeTab === "watchlist" && (
          <WatchlistTab
            movies={watchlistItems}
            loading={loading.watchlist}
            error={errors.watchlist}
            onRetry={fetchWatchlist}
            onRemove={handleRemoveFromWatchlist}
            removingIds={removingWatchlistIds}
            navigate={navigate}
          />
        )}

        {activeTab === "favorites" && (
          <FavoritesTab
            movies={favoriteMovies}
            loading={loading.ratings}
            error={errors.ratings}
            onRetry={fetchRatings}
            onUnfavorite={handleUnfavorite}
            busyIds={favoriteBusyIds}
            navigate={navigate}
          />
        )}

        {activeTab === "reviews" && (
          <ReviewsTab
            movies={reviewMovies}
            loading={loading.ratings}
            error={errors.ratings}
            onRetry={fetchRatings}
            onSave={handleSaveReview}
            onDelete={handleDeleteReview}
            navigate={navigate}
          />
        )}

        {activeTab === "continue" && (
          <ContinueWatchingTab
            movies={continueMovies}
            loading={loading.history}
            error={errors.history}
            onRetry={fetchHistory}
            onMarkWatched={handleMarkWatched}
            onRemove={handleRemoveFromHistory}
            busyIds={continueBusyIds}
            navigate={navigate}
          />
        )}
      </main>

      {editOpen && (
        <EditProfileModal
          initialName={profileData.name ?? profileData.username ?? ""}
          initialEmail={profileData.email ?? ""}
          initialPhone={profileData.phone ?? ""}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setProfile((p) => ({ ...(p ?? {}), ...updated }));
            getCurrentUser?.();
          }}
        />
      )}

      {passwordOpen && (
        <ChangePasswordModal onClose={() => setPasswordOpen(false)} />
      )}
    </div>
  );
}
