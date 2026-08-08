import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  Search, Plus, Pencil, Trash2, Film, AlertCircle,
  Loader2, X, Check, ChevronLeft, ChevronRight,
} from "lucide-react";
import { getMovies, createMovie, updateMovie, deleteMovie } from "../../services/api";
import ConfirmDialog from "./ConfirmDialog";
import "./Admin.css";

const GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime",
  "Documentary", "Drama", "Fantasy", "Horror", "Mystery",
  "Romance", "Sci-Fi", "Thriller", "Western",
];
const CONTENT_TYPES = ["movie", "tvshow", "documentary", "anime"];
const RATINGS = ["G", "PG", "PG-13", "R", "NC-17", "TV-MA", "TV-14", "TV-PG"];
const MOODS = [
  "Happy", "Sad", "Excited", "Relaxed", "Scared",
  "Romantic", "Motivated", "Bored", "Nostalgic",
];

const EMPTY_FORM = {
  title: "", description: "", genres: [], contentType: "movie",
  rating: "", releaseYear: "", language: "en", posterUrl: "",
  trailerUrl: "", imdbId: "", averageScore: "", moods: [],
};

function normalizeMovie(raw) {
  if (!raw) return null;
  return {
    id: raw.id ?? raw._id,
    title: raw.title ?? "Untitled",
    posterUrl: raw.posterUrl ?? null,
    genres: Array.isArray(raw.genres) ? raw.genres : [],
    contentType: raw.contentType ?? "movie",
    rating: raw.rating ?? "",
    releaseYear: raw.releaseYear ?? null,
    language: raw.language ?? "en",
    trailerUrl: raw.trailerUrl ?? "",
    imdbId: raw.imdbId ?? "",
    averageScore: raw.averageScore ?? 0,
    moods: Array.isArray(raw.moods) ? raw.moods : [],
    description: raw.description ?? "",
  };
}

function MovieFormModal({ initial, onClose, onSaved }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState(() =>
    initial
      ? {
          title: initial.title ?? "",
          description: initial.description ?? "",
          genres: initial.genres ?? [],
          contentType: initial.contentType ?? "movie",
          rating: initial.rating ?? "",
          releaseYear: initial.releaseYear ?? "",
          language: initial.language ?? "en",
          posterUrl: initial.posterUrl ?? "",
          trailerUrl: initial.trailerUrl ?? "",
          imdbId: initial.imdbId ?? "",
          averageScore: initial.averageScore ?? "",
          moods: initial.moods ?? [],
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleFrom = (key, value) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setFormError("Title is required."); return; }

    setSaving(true);
    setFormError("");
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        genres: form.genres,
        contentType: form.contentType,
        rating: form.rating || undefined,
        releaseYear: form.releaseYear ? Number(form.releaseYear) : undefined,
        language: form.language.trim() || "en",
        posterUrl: form.posterUrl.trim(),
        trailerUrl: form.trailerUrl.trim(),
        imdbId: form.imdbId.trim() || undefined,
        averageScore: form.averageScore !== "" ? Number(form.averageScore) : undefined,
        moods: form.moods,
      };

      if (isEdit) {
        await updateMovie(initial.id, payload);
        toast.success("Movie updated");
      } else {
        await createMovie(payload);
        toast.success("Movie created");
      }
      onSaved();
      onClose();
    } catch (err) {
      setFormError(err.response?.data?.message ?? "Couldn't save movie.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose} role="presentation">
      <form className="adm-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="adm-modal-header">
          <h2 className="adm-modal-title">{isEdit ? "Edit Movie" : "Add Movie"}</h2>
          <button type="button" className="adm-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {formError && (
          <div className="adm-error"><AlertCircle size={14} /><span>{formError}</span></div>
        )}

        <label className="adm-field">
          <span className="adm-field-label">Title *</span>
          <input className="adm-input" value={form.title} onChange={set("title")} />
        </label>

        <label className="adm-field">
          <span className="adm-field-label">Description</span>
          <textarea className="adm-textarea" value={form.description} onChange={set("description")} />
        </label>

        <div className="adm-field">
          <span className="adm-field-label">Genres</span>
          <div className="adm-chip-row">
            {GENRES.map((g) => (
              <button
                type="button"
                key={g}
                className={`adm-chip${form.genres.includes(g) ? " selected" : ""}`}
                onClick={() => toggleFrom("genres", g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="adm-field-row">
          <label className="adm-field">
            <span className="adm-field-label">Content type</span>
            <select className="adm-input" value={form.contentType} onChange={set("contentType")}>
              {CONTENT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="adm-field">
            <span className="adm-field-label">Rating</span>
            <select className="adm-input" value={form.rating} onChange={set("rating")}>
              <option value="">—</option>
              {RATINGS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        </div>

        <div className="adm-field-row">
          <label className="adm-field">
            <span className="adm-field-label">Release year</span>
            <input className="adm-input" type="number" value={form.releaseYear} onChange={set("releaseYear")} />
          </label>
          <label className="adm-field">
            <span className="adm-field-label">Language</span>
            <input className="adm-input" value={form.language} onChange={set("language")} />
          </label>
        </div>

        <label className="adm-field">
          <span className="adm-field-label">Poster URL</span>
          <input className="adm-input" value={form.posterUrl} onChange={set("posterUrl")} />
        </label>

        <div className="adm-field-row">
          <label className="adm-field">
            <span className="adm-field-label">Trailer URL</span>
            <input className="adm-input" value={form.trailerUrl} onChange={set("trailerUrl")} />
          </label>
          <label className="adm-field">
            <span className="adm-field-label">IMDb ID</span>
            <input className="adm-input" value={form.imdbId} onChange={set("imdbId")} />
          </label>
        </div>

        <label className="adm-field">
          <span className="adm-field-label">Average score (0–10)</span>
          <input className="adm-input" type="number" min="0" max="10" step="0.1" value={form.averageScore} onChange={set("averageScore")} />
        </label>

        <div className="adm-field">
          <span className="adm-field-label">Moods</span>
          <div className="adm-chip-row">
            {MOODS.map((m) => (
              <button
                type="button"
                key={m}
                className={`adm-chip${form.moods.includes(m) ? " selected" : ""}`}
                onClick={() => toggleFrom("moods", m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="adm-modal-footer">
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {isEdit ? "Save changes" : "Create movie"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminMoviesPage() {
  const [movies, setMovies] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: 12, sort: "rating" };
      if (genreFilter) params.genre = genreFilter;
      const res = await getMovies(params);
      const list = (res.data?.movies ?? []).map(normalizeMovie).filter(Boolean);
      setMovies(list);
      setMeta(res.data?.meta ?? { page: 1, totalPages: 1, total: list.length });
    } catch (err) {
      setError(err.response?.data?.message ?? "Couldn't load movies.");
    } finally {
      setLoading(false);
    }
  }, [page, genreFilter]);

  useEffect(() => { load(); }, [load]);

  const visibleMovies = search.trim()
    ? movies.filter((m) => m.title.toLowerCase().includes(search.trim().toLowerCase()))
    : movies;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMovie(deleteTarget.id);
      toast.success("Movie deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message ?? "Couldn't delete movie.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Manage Movies</h1>
          <p className="adm-page-subtitle">{meta.total ?? movies.length} titles in the catalogue</p>
        </div>
        <button
          type="button"
          className="adm-btn adm-btn--primary"
          onClick={() => { setEditingMovie(null); setFormOpen(true); }}
        >
          <Plus size={14} /> Add Movie
        </button>
      </div>

      <div className="adm-panel">
        <div className="adm-toolbar">
          <div className="adm-search">
            <Search size={15} />
            <input
              placeholder="Filter by title on this page…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="adm-select"
            value={genreFilter}
            onChange={(e) => { setGenreFilter(e.target.value); setPage(1); }}
          >
            <option value="">All genres</option>
            {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {error && <div className="adm-error"><AlertCircle size={14} /><span>{error}</span></div>}

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Genres</th>
                <th>Type</th>
                <th>Year</th>
                <th>Score</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="adm-skel-row">
                    <td><div className="adm-skel" style={{ width: 160, height: 14 }} /></td>
                    <td><div className="adm-skel" style={{ width: 100, height: 14 }} /></td>
                    <td><div className="adm-skel" style={{ width: 60, height: 14 }} /></td>
                    <td><div className="adm-skel" style={{ width: 40, height: 14 }} /></td>
                    <td><div className="adm-skel" style={{ width: 40, height: 14 }} /></td>
                    <td></td>
                  </tr>
                ))
              ) : visibleMovies.length === 0 ? (
                <tr><td colSpan={6}><div className="adm-empty"><Film size={20} style={{ marginBottom: 6 }} /><div>No movies found.</div></div></td></tr>
              ) : (
                visibleMovies.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="adm-row-title">
                        {m.posterUrl ? (
                          <img src={m.posterUrl} alt="" className="adm-poster-thumb" />
                        ) : (
                          <div className="adm-poster-thumb" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Film size={13} color="#6b6b8a" />
                          </div>
                        )}
                        <span className="adm-cell-title">{m.title}</span>
                      </div>
                    </td>
                    <td className="adm-cell-sub">{m.genres.slice(0, 2).join(", ") || "—"}</td>
                    <td className="adm-cell-sub">{m.contentType}</td>
                    <td className="adm-cell-sub">{m.releaseYear ?? "—"}</td>
                    <td className="adm-cell-sub">{m.averageScore ? m.averageScore.toFixed?.(1) ?? m.averageScore : "—"}</td>
                    <td>
                      <div className="adm-table-actions">
                        <button
                          type="button"
                          className="adm-btn adm-btn--ghost adm-btn--sm"
                          onClick={() => { setEditingMovie(m); setFormOpen(true); }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          className="adm-btn adm-btn--danger adm-btn--sm"
                          onClick={() => setDeleteTarget(m)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && meta.totalPages > 1 && (
          <div className="adm-pagination">
            <span>Page {meta.page} of {meta.totalPages}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className="adm-btn adm-btn--ghost adm-btn--sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={13} />
              </button>
              <button
                type="button"
                className="adm-btn adm-btn--ghost adm-btn--sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {formOpen && (
        <MovieFormModal
          initial={editingMovie}
          onClose={() => setFormOpen(false)}
          onSaved={load}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete movie?"
          message={`This will permanently remove "${deleteTarget.title}" from the catalogue.`}
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
