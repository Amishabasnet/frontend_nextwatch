import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  
  Smile,
  Star,
  History,
  Tag,
  ChevronRight,
  Shield,
  Lock,
  Eye,
  Film,
  Clapperboard,
  Popcorn,
  Zap,
  Users,
  Frown,
  Leaf,
  Brain,
  Flame,
} from "lucide-react";
import { getMovies } from "../../services/api";

const POSTER_GENRES = ["Sci-Fi", "Thriller", "Drama", "Mystery", "Adventure", "Horror"];
const GENRE_FALLBACK_COLOR = {
  "Sci-Fi": "#1a1040",
  "Thriller": "#2d0a0a",
  "Drama": "#0a1a2d",
  "Mystery": "#0d1a0d",
  "Adventure": "#1a1200",
  "Horror": "#0d0d0d",
};

const MOODS = [
  { label: "Feel-Good",    icon: Smile, color: "#fbbf24" },
  { label: "Thrilling",    icon: Zap,   color: "#ef4444" },
  { label: "Emotional",    icon: Frown, color: "#60a5fa" },
  { label: "Mind-Bending", icon: Brain, color: "#a78bfa" },
  { label: "Relaxing",     icon: Leaf,  color: "#34d399" },
  { label: "Action",       icon: Flame, color: "#f97316" },
];

const HOW_IT_WORKS = [
  {
    icon: Smile,
    step: "01",
    title: "Tell us your mood",
    desc: "Pick how you're feeling tonight — excited, melancholic, curious, or just ready to laugh.",
  },
  {
    icon: Tag,
    step: "02",
    title: "Set your preferences",
    desc: "Choose genres, languages, and rating thresholds. We remember what you love and avoid.",
  },
  {
    icon: Zap,
    step: "03",
    title: "Get instant picks",
    desc: "Our engine surfaces films tailored exactly to this moment — not just your all-time history.",
  },
];

const PRIVACY_POINTS = [
  {
    icon: Lock,
    title: "Your data stays yours",
    desc: "We never sell viewing history or mood data to third parties. Full stop.",
  },
  {
    icon: Eye,
    title: "Transparent algorithms",
    desc: "We show you exactly why each film was recommended. No black boxes.",
  },
  {
    icon: Shield,
    title: "Encrypted at rest",
    desc: "All personal data is AES-256 encrypted. You can export or delete it any time.",
  },
];

function PosterCard({ genre, movie, color }) {
  const [imgError, setImgError] = useState(false);
  const hasImage = movie?.posterUrl && !imgError;

  return (
    <div
      className="poster-card"
      style={!hasImage ? { background: `linear-gradient(160deg, ${color} 0%, #0a0a0f 100%)` } : undefined}
    >
      {hasImage && (
        <img
          key={movie.id ?? movie.posterUrl}
          src={movie.posterUrl}
          alt={movie.title}
          className="poster-img poster-img--fade"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      )}
      <div className="poster-genre">{genre}</div>
      <div className="poster-bottom">
        <span className="poster-title">{movie?.title ?? genre}</span>
        <span className="poster-rating">
          <Star size={11} fill="currentColor" /> {movie?.rating ?? "—"}
        </span>
      </div>
    </div>
  );
}

function PosterSkeleton({ genre, index }) {
  return (
    <div
      className="poster-card poster-card--skeleton"
      style={{ animationDelay: `${index * 0.12}s` }}
    >
      <div className="poster-genre">{genre}</div>
    </div>
  );
}

const ROTATE_INTERVAL_MS = 10_000;
const POSTERS_PER_GENRE = 5;

export default function LandingPage() {
  const [posterSets, setPosterSets] = useState([]); // [{ genre, color, movies: [...] }]
  const [postersLoading, setPostersLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadGenrePosters() {
      const results = await Promise.all(
        POSTER_GENRES.map(async (genre) => {
          try {
            const res = await getMovies({ genre, limit: POSTERS_PER_GENRE, sort: "rating" });
            const list = Array.isArray(res.data) ? res.data : (res.data?.movies ?? []);
            const movies = list.map((raw) => {
              const rating = Number(raw.rating ?? raw.averageScore ?? raw.voteAverage ?? 0) || 0;
              return {
                id: raw._id ?? raw.id,
                title: raw.title ?? genre,
                posterUrl: raw.posterUrl ?? raw.poster_url ?? null,
                rating: rating > 0 ? rating.toFixed(1) : "—",
              };
            });
            if (!movies.length) return null;
            return { genre, color: GENRE_FALLBACK_COLOR[genre] ?? "#12121a", movies };
          } catch {
            return null;
          }
        })
      );
      if (!cancelled) {
        setPosterSets(results.filter(Boolean));
        setPostersLoading(false);
      }
    }

    loadGenrePosters();
    return () => { cancelled = true; };
  }, []);

  // Rotate every genre tile to its next movie on a shared 10s beat.
  useEffect(() => {
    if (postersLoading || posterSets.length === 0) return;
    const id = setInterval(() => setTick((t) => t + 1), ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [postersLoading, posterSets.length]);

  return (
    <div className="landing-root">
      <nav className="landing-nav">
        <div className="nav-logo">
          <Clapperboard size={22} strokeWidth={1.8} className="logo-icon" />
          <span className="logo-text">Next<span className="logo-accent">Watch</span></span>
        </div>
        <div className="nav-actions">
          <Link to="/login" className="btn-ghost">Log in</Link>
          <Link to="/register" className="btn-primary">Get Started</Link>
        </div>
      </nav>

      <section className="hero-section">
        {/* Ambient glow */}
        <div className="hero-glow hero-glow-left" />
        <div className="hero-glow hero-glow-right" />

        <div className="hero-content">
          <div className="hero-badge">
            <Film size={13} /> Powered by mood-aware AI
          </div>

          <h1 className="hero-heading">
            Your next favorite film is<br />
            <span className="hero-gradient-text">one click away.</span>
          </h1>

          <p className="hero-description">
            NextWatch reads your mood, learns your genre preferences, weighs
            critical ratings, and builds on your viewing history to surface
            films that feel handpicked — because they are.
          </p>

          <div className="hero-cta-row">
            <Link to="/register" className="btn-primary btn-large">
              Get Started <ChevronRight size={18} />
            </Link>
            <Link to="/login" className="btn-outline btn-large">
              Log in
            </Link>
          </div>

          <div className="hero-stats">
            {[["40k+", "Films catalogued"], ["98%", "Accuracy score"], ["2M+", "Happy watchers"]].map(
              ([num, label]) => (
                <div key={label} className="hero-stat">
                  <span className="stat-num">{num}</span>
                  <span className="stat-label">{label}</span>
                </div>
              )
            )}
          </div>
        </div>

        <div className="poster-grid">
          {postersLoading
            ? POSTER_GENRES.map((genre, i) => (
                <PosterSkeleton key={genre} genre={genre} index={i} />
              ))
            : posterSets.map((set) => (
                <PosterCard
                  key={set.genre}
                  genre={set.genre}
                  color={set.color}
                  movie={set.movies[tick % set.movies.length]}
                />
              ))}
          <div className="poster-overlay-bottom" />
        </div>
      </section>

      <section className="section" id="how-it-works">
        <div className="section-inner">
          <p className="section-eyebrow">Simple by design</p>
          <h2 className="section-heading">How It Works</h2>
          <p className="section-sub">
            Three steps from "I don't know what to watch" to pressing play.
          </p>

          <div className="hiw-grid">
            {HOW_IT_WORKS.map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="hiw-card">
                <div className="hiw-step-badge">{step}</div>
                <div className="hiw-icon-wrap">
                  <Icon size={26} strokeWidth={1.5} />
                </div>
                <h3 className="hiw-title">{title}</h3>
                <p className="hiw-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark" id="mood">
        <div className="section-inner">
          <p className="section-eyebrow">Emotion-first discovery</p>
          <h2 className="section-heading">Mood-Based Recommendations</h2>
          <p className="section-sub">
            No genre scrolling. Just tap how you feel and we do the rest.
          </p>

          <div className="mood-grid">
            {MOODS.map(({ icon: Icon, label, color }) => (
              <div
                key={label}
                className="mood-card"
                style={{ "--mood-color": color }}
              >
                <Icon size={22} strokeWidth={2} className="mood-icon" style={{ color }} />
                <span className="mood-label">{label}</span>
              </div>
            ))}
          </div>

          <p className="mood-note">
            <Smile size={14} /> Moods update your queue in real time — change
            your mind, change your picks instantly.
          </p>
        </div>
      </section>

      <section className="section" id="personalized">
        <div className="section-inner personalized-inner">
          <div className="personalized-text">
            <p className="section-eyebrow">Built around you</p>
            <h2 className="section-heading">Personalized Recommendations</h2>
            <p className="personalized-desc">
              NextWatch tracks four signals at once — genre taste, star ratings,
              viewing history, and tonight's mood — and blends them into a queue
              that feels uncannily on point.
            </p>

            <ul className="feature-list">
              {[
                [Star, "Rates every genre you watch"],
                [History, "Remembers what you've already seen"],
                [Tag, "Learns your hidden-gem tolerance"],
                [Users, "Optionally syncs with friends"],
              ].map(([Icon, text]) => (
                <li key={text} className="feature-item">
                  <Icon size={16} strokeWidth={1.8} className="feature-icon" />
                  {text}
                </li>
              ))}
            </ul>

            <Link to="/register" className="btn-primary btn-medium">
              Build my profile <ChevronRight size={16} />
            </Link>
          </div>

          <div className="personalized-visual">
            <div className="queue-card">
              <div className="queue-header">
                <Popcorn size={16} strokeWidth={1.5} />
                <span>Tonight's Queue</span>
                <span className="queue-badge">LIVE</span>
              </div>
              {[
                { title: "The Quiet Storm", match: 97, genre: "Drama" },
                { title: "Last Frequency", match: 94, genre: "Thriller" },
                { title: "Glass Meridian", match: 91, genre: "Sci-Fi" },
                { title: "Paper Wings", match: 88, genre: "Romance" },
              ].map(({ title, match, genre }) => (
                <div key={title} className="queue-item">
                  <div className="queue-thumb" />
                  <div className="queue-info">
                    <span className="queue-title">{title}</span>
                    <span className="queue-genre">{genre}</span>
                  </div>
                  <div className="queue-match">
                    <span className="match-pct">{match}%</span>
                    <span className="match-label">match</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section section-dark" id="privacy">
        <div className="section-inner">
          <p className="section-eyebrow">No surprises</p>
          <h2 className="section-heading">Privacy & Security</h2>
          <p className="section-sub">
            We believe great recommendations don't require exploiting your data.
          </p>

          <div className="privacy-grid">
            {PRIVACY_POINTS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="privacy-card">
                <div className="privacy-icon-wrap">
                  <Icon size={22} strokeWidth={1.5} />
                </div>
                <h3 className="privacy-title">{title}</h3>
                <p className="privacy-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-banner">
        <div className="cta-glow" />
        <h2 className="cta-heading">Ready to find tonight's film?</h2>
        <p className="cta-sub">Join over 2 million people who stopped scrolling and started watching.</p>
        <div className="cta-row">
          <Link to="/register" className="btn-primary btn-large">
            Get Started — it's free
          </Link>
          <Link to="/login" className="btn-ghost">
            Already have an account
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-logo">
          <Clapperboard size={17} strokeWidth={1.8} className="logo-icon" />
          <span className="logo-text logo-text-sm">
            Next<span className="logo-accent">Watch</span>
          </span>
        </div>
        <div className="footer-links">
          {["About", "Privacy", "Terms", "Contact"].map((l) => (
            <Link key={l} to="#" className="footer-link">{l}</Link>
          ))}
        </div>
        <p className="footer-copy">© 2025 NextWatch. All rights reserved.</p>
      </footer>
    </div>
  );
}
