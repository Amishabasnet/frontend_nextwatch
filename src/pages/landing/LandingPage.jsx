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
} from "lucide-react";

// ── Fake movie poster data (TMDB-style placeholder colours) ──────────────────
const POSTERS = [
  { title: "Neon Abyss", genre: "Sci-Fi", rating: 8.4, color: "#1a1040" },
  { title: "Crimson Tide", genre: "Thriller", rating: 7.9, color: "#2d0a0a" },
  { title: "Frost Point", genre: "Drama", rating: 8.1, color: "#0a1a2d" },
  { title: "Echo Valley", genre: "Mystery", rating: 7.6, color: "#0d1a0d" },
  { title: "Solar Drift", genre: "Adventure", rating: 8.7, color: "#1a1200" },
  { title: "Hollow Moon", genre: "Horror", rating: 7.2, color: "#0d0d0d" },
];

const MOODS = [
  { emoji: "😂", label: "Feel-Good", color: "#fbbf24" },
  { emoji: "😱", label: "Thrilling", color: "#ef4444" },
  { emoji: "😢", label: "Emotional", color: "#60a5fa" },
  { emoji: "🤔", label: "Mind-Bending", color: "#a78bfa" },
  { emoji: "😴", label: "Relaxing", color: "#34d399" },
  { emoji: "🔥", label: "Action", color: "#f97316" },
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

// ── Sub-components ────────────────────────────────────────────────────────────

function PosterCard({ poster, index }) {
  return (
    <div
      className="poster-card"
      style={{
        background: `linear-gradient(160deg, ${poster.color} 0%, #0a0a0f 100%)`,
        animationDelay: `${index * 0.12}s`,
      }}
    >
      <div className="poster-genre">{poster.genre}</div>
      <div className="poster-bottom">
        <span className="poster-title">{poster.title}</span>
        <span className="poster-rating">
          <Star size={11} fill="currentColor" /> {poster.rating}
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="landing-root">
      {/* ── NAV ──────────────────────────────────────────────────────────────── */}
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

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
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

        {/* Poster grid */}
        <div className="poster-grid">
          {POSTERS.map((p, i) => (
            <PosterCard key={p.title} poster={p} index={i} />
          ))}
          <div className="poster-overlay-bottom" />
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
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

      {/* ── MOOD-BASED ───────────────────────────────────────────────────────── */}
      <section className="section section-dark" id="mood">
        <div className="section-inner">
          <p className="section-eyebrow">Emotion-first discovery</p>
          <h2 className="section-heading">Mood-Based Recommendations</h2>
          <p className="section-sub">
            No genre scrolling. Just tap how you feel and we do the rest.
          </p>

          <div className="mood-grid">
            {MOODS.map(({ emoji, label, color }) => (
              <div
                key={label}
                className="mood-card"
                style={{ "--mood-color": color }}
              >
                <span className="mood-emoji">{emoji}</span>
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

      {/* ── PERSONALIZED ─────────────────────────────────────────────────────── */}
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

      {/* ── PRIVACY ──────────────────────────────────────────────────────────── */}
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

      {/* ── CTA BANNER ───────────────────────────────────────────────────────── */}
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

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
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
