import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowRight, Heart, X, Shield, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { getPreferences, putPreferences } from "../../services/api";
import GenreBadge from "../../components/GenreBadge";
import "./PreferencesPage.css";

const AVAILABLE_GENRES = [
  "Action",
  "Comedy",
  "Drama",
  "Horror",
  "Romance",
  "Thriller",
  "Sci-Fi",
  "Documentary",
  "Fantasy",
  "Animation",
  "Adventure",
  "Mystery",
];

const normalizeGenreKey = (genre) => genre.toLowerCase().trim();

export default function PreferencesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [dislikedGenres, setDislikedGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    let canceled = false;
    const loadPreferences = async () => {
      setLoading(true);
      try {
        const res = await getPreferences(user.id);
        if (canceled) return;
        setFavoriteGenres(res.data.favoriteGenres ?? []);
        // Backend's field is "excludedGenres" — UI calls them "disliked".
        setDislikedGenres(res.data.excludedGenres ?? []);
      } catch (err) {
        if (canceled) return;
        // 404 just means this user hasn't saved preferences yet — that's
        // expected right after onboarding, not an error.
        if (err.response?.status !== 404) {
          toast.error("Unable to load preferences. Try again later.");
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    };

    loadPreferences();
    return () => {
      canceled = true;
    };
  }, [user?.id]);

  const genreState = useMemo(() => {
    const map = {};
    favoriteGenres.forEach((g) => {
      map[normalizeGenreKey(g)] = "favorite";
    });
    dislikedGenres.forEach((g) => {
      map[normalizeGenreKey(g)] = "disliked";
    });
    return map;
  }, [favoriteGenres, dislikedGenres]);

  const handleToggleGenre = (genre) => {
    const key = normalizeGenreKey(genre);
    const current = genreState[key];

    if (current === "favorite") {
      setFavoriteGenres((prev) => prev.filter((g) => normalizeGenreKey(g) !== key));
      setDislikedGenres((prev) => [...prev, genre]);
      return;
    }

    if (current === "disliked") {
      setDislikedGenres((prev) => prev.filter((g) => normalizeGenreKey(g) !== key));
      return;
    }

    setFavoriteGenres((prev) => [...prev, genre]);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await putPreferences(user.id, {
        favoriteGenres,
        excludedGenres: dislikedGenres,
      });
      toast.success("Preferences saved successfully.");
    } catch {
      toast.error("Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const showGenres = AVAILABLE_GENRES.map((genre) => {
    const key = normalizeGenreKey(genre);
    const state = genreState[key] || "none";
    return { genre, state };
  });

  return (
    <div className="preferences-root">
      <div className="preferences-top">
        <div className="preferences-heading">
          <p className="preferences-eyebrow">Your Preferences</p>
          <h1 className="preferences-title">Tell us what you love and what to avoid.</h1>
          <p className="preferences-copy">
            Pick your favorite genres and the ones you want to skip. This helps NextWatch tailor recommendations to your taste.
          </p>
        </div>

        <div className="preferences-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
            <ArrowRight size={16} />
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving...
              </>
            ) : (
              "Save preferences"
            )}
          </button>
        </div>
      </div>

      <div className="preferences-panel">
        <div className="preferences-card">
          <div className="preferences-section">
            <div>
              <h2 className="preferences-section-title">Current selections</h2>
              <p className="preferences-section-desc">
                Your existing favorite and disliked genres are shown here. Tap a genre to change its state.
              </p>
            </div>

            <div className="preference-summary">
              <div>
                <strong>Favorites</strong>
                <div className="preference-group">
                  {favoriteGenres.length === 0 ? (
                    <span className="genre-state">None</span>
                  ) : (
                    favoriteGenres.map((genre) => (
                      <GenreBadge key={genre} genre={genre} />
                    ))
                  )}
                </div>
              </div>

              <div>
                <strong>Disliked</strong>
                <div className="preference-group">
                  {dislikedGenres.length === 0 ? (
                    <span className="genre-state">None</span>
                  ) : (
                    dislikedGenres.map((genre) => (
                      <GenreBadge key={genre} genre={genre} />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="preferences-card">
          <div className="preferences-section">
            <div>
              <h2 className="preferences-section-title">Choose your genre preferences</h2>
              <p className="preferences-section-desc">
                Tap a genre to mark it as favorite. Tap again to mark it as disliked. Tap a disliked genre once more to reset it.
              </p>
            </div>

            {loading ? (
              <div className="preferences-loading">
                <Loader2 size={28} className="animate-spin" />
                <p>Loading your saved preferences…</p>
              </div>
            ) : (
              <div className="genre-grid">
                {showGenres.map(({ genre, state }) => (
                  <button
                    key={genre}
                    type="button"
                    className={[
                      "genre-option",
                      state === "favorite" ? "favorite" : "",
                      state === "disliked" ? "disliked" : "",
                    ].join(" ")}
                    onClick={() => handleToggleGenre(genre)}
                  >
                    <span className="genre-label">
                      <Heart size={16} />
                      {genre}
                    </span>
                    <span className="genre-state">
                      {state === "favorite" ? <CheckCircle2 size={14} /> : state === "disliked" ? <X size={14} /> : "–"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="preferences-card">
          <div className="preferences-section">
            <h2 className="preferences-section-title">Why this helps</h2>
            <p className="preferences-section-desc">
              Favorite genres get higher recommendation priority, while disliked genres are excluded from most suggestions. You can update this anytime.
            </p>
            <div className="preferences-notice">
              <Shield size={16} style={{ marginRight: 8, color: "#8b5cf6" }} /> Your choices are only used to improve your recommendations.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
