import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import {
  Star, Plus, X, Check, Loader2, AlertCircle, Trash2, Film,
  ToggleLeft, ToggleRight,
} from "lucide-react";
import {
  getAllFeaturesAdmin, addFeaturedMovie, updateFeature, removeFeature, searchMovies,
} from "../../services/api";
import ConfirmDialog from "./ConfirmDialog";
import "./Admin.css";

function formatDate(raw) {
  if (!raw) return "—";
  return new Date(raw).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function MoviePicker({ value, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
    }
  }, [query]);

  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchMovies({ title: query });
        if (!cancelled) setResults((res.data ?? []).slice(0, 8));
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      {value ? (
        <div className="adm-row-title" style={{ justifyContent: "space-between", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 10px" }}>
          <div className="adm-row-title">
            {value.posterUrl ? (
              <img src={value.posterUrl} alt="" className="adm-poster-thumb" />
            ) : (
              <div className="adm-poster-thumb" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Film size={13} color="#6b6b8a" />
              </div>
            )}
            <span className="adm-cell-title">{value.title}</span>
          </div>
          <button type="button" className="adm-modal-close" onMouseDown={(e) => { e.preventDefault(); onSelect(null); }} aria-label="Clear selection">
            <X size={14} />
          </button>
        </div>
      ) : (
        <input
          className="adm-input"
          placeholder="Search movies by title…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              // Prevent the surrounding <form> from submitting on Enter.
              e.preventDefault();
              e.stopPropagation();
              if (results.length > 0) {
                onSelect(results[0]);
                setOpen(false);
                setQuery("");
              }
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      )}

      {open && !value && query.trim() && (
        <div
          className="adm-panel"
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
            maxHeight: 240, overflowY: "auto", padding: 6,
          }}
        >
          {loading ? (
            <div style={{ padding: 10, fontSize: 13, color: "#6b6b8a" }}>Searching…</div>
          ) : results.length === 0 ? (
            <div style={{ padding: 10, fontSize: 13, color: "#6b6b8a" }}>No movies found.</div>
          ) : (
            results.map((m) => (
              <div
                key={m.id ?? m._id}
                className="adm-row-title"
                style={{ padding: "6px 8px", borderRadius: 6, cursor: "pointer" }}
                onMouseDown={(e) => {
                  // Use mousedown (fires before the outside-click / blur
                  // handlers run) instead of click, so selecting a result
                  // can't be lost to a re-render race that unmounts the
                  // list before the click event fires.
                  e.preventDefault();
                  onSelect(m);
                  setOpen(false);
                  setQuery("");
                }}
              >
                {m.posterUrl ? (
                  <img src={m.posterUrl} alt="" className="adm-poster-thumb" />
                ) : (
                  <div className="adm-poster-thumb" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Film size={13} color="#6b6b8a" />
                  </div>
                )}
                <span className="adm-cell-title">{m.title}</span>
                <span className="adm-cell-sub">{m.releaseYear ?? ""}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function FeatureFormModal({ onClose, onSaved }) {
  const [movie, setMovie] = useState(null);
  const [label, setLabel] = useState("Featured");
  const [priority, setPriority] = useState(0);
  const [activeTo, setActiveTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!movie) { setFormError("Pick a movie to feature."); return; }

    setSaving(true);
    setFormError("");
    try {
      await addFeaturedMovie({
        movieId: movie.id ?? movie._id,
        label: label.trim() || "Featured",
        priority: Number(priority) || 0,
        activeTo: activeTo ? new Date(activeTo).toISOString() : undefined,
      });
      toast.success(`${movie.title} added to the homepage spotlight.`);
      onSaved();
      onClose();
    } catch (err) {
      setFormError(err.response?.data?.message ?? "Couldn't feature this movie.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose} role="presentation">
      <form className="adm-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="adm-modal-header">
          <h2 className="adm-modal-title">Feature a Movie</h2>
          <button type="button" className="adm-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {formError && (
          <div className="adm-error"><AlertCircle size={14} /><span>{formError}</span></div>
        )}

        <label className="adm-field">
          <span className="adm-field-label">Movie *</span>
          <MoviePicker value={movie} onSelect={setMovie} />
        </label>

        <div className="adm-field-row">
          <label className="adm-field">
            <span className="adm-field-label">Label</span>
            <input className="adm-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Featured" />
          </label>
          <label className="adm-field">
            <span className="adm-field-label">Priority</span>
            <input className="adm-input" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} placeholder="0" />
          </label>
        </div>

        <label className="adm-field">
          <span className="adm-field-label">Active until (optional)</span>
          <input className="adm-input" type="date" value={activeTo} onChange={(e) => setActiveTo(e.target.value)} />
        </label>

        <div className="adm-modal-footer">
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Add to spotlight
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminFeaturedPage() {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [busyIds, setBusyIds] = useState(new Set());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAllFeaturesAdmin();
      setFeatures(res.data ?? []);
    } catch {
      setError("Couldn't load featured movies.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const toggleActive = async (feature) => {
    setBusyIds((s) => new Set(s).add(feature.featureId));
    try {
      await updateFeature(feature.featureId, { isActive: !feature.isActive });
      setFeatures((prev) =>
        prev.map((f) => (f.featureId === feature.featureId ? { ...f, isActive: !f.isActive } : f))
      );
    } catch {
      toast.error("Couldn't update this entry.");
    } finally {
      setBusyIds((s) => { const next = new Set(s); next.delete(feature.featureId); return next; });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeFeature(deleteTarget.featureId);
      toast.success(`Removed "${deleteTarget.movie?.title}" from the spotlight.`);
      setFeatures((prev) => prev.filter((f) => f.featureId !== deleteTarget.featureId));
      setDeleteTarget(null);
    } catch {
      toast.error("Couldn't remove this entry.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Featured Movies</h1>
          <p className="adm-page-subtitle">{features.length} entries · controls the homepage spotlight</p>
        </div>
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => setFormOpen(true)}>
          <Plus size={14} /> Feature a movie
        </button>
      </div>

      <div className="adm-panel">
        {error && <div className="adm-error"><AlertCircle size={14} /><span>{error}</span></div>}

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Movie</th>
                <th>Label</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Active until</th>
                <th>Featured by</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="adm-skel-row">
                    <td><div className="adm-skel" style={{ width: 180, height: 14 }} /></td>
                    <td><div className="adm-skel" style={{ width: 60, height: 14 }} /></td>
                    <td><div className="adm-skel" style={{ width: 30, height: 14 }} /></td>
                    <td><div className="adm-skel" style={{ width: 60, height: 14 }} /></td>
                    <td><div className="adm-skel" style={{ width: 80, height: 14 }} /></td>
                    <td><div className="adm-skel" style={{ width: 80, height: 14 }} /></td>
                    <td></td>
                  </tr>
                ))
              ) : features.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="adm-empty">
                      <Star size={20} style={{ marginBottom: 6 }} />
                      <div>No movies featured yet.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                features.map((f) => (
                  <tr key={f.featureId}>
                    <td>
                      <div className="adm-row-title">
                        {f.movie?.posterUrl ? (
                          <img src={f.movie.posterUrl} alt="" className="adm-poster-thumb" />
                        ) : (
                          <div className="adm-poster-thumb" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Film size={13} color="#6b6b8a" />
                          </div>
                        )}
                        <span className="adm-cell-title">{f.movie?.title ?? "Movie removed"}</span>
                      </div>
                    </td>
                    <td className="adm-cell-sub">{f.label}</td>
                    <td className="adm-cell-sub">{f.priority}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => toggleActive(f)}
                        disabled={busyIds.has(f.featureId)}
                        className={`adm-badge adm-badge--${f.isActive ? "active" : "suspended"}`}
                        style={{ border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        {f.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {f.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="adm-cell-sub">{f.activeTo ? formatDate(f.activeTo) : "No end date"}</td>
                    <td className="adm-cell-sub">{f.featuredBy?.name ?? "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="adm-btn adm-btn--danger adm-btn--sm"
                        onClick={() => setDeleteTarget(f)}
                        aria-label="Remove"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen && (
        <FeatureFormModal onClose={() => setFormOpen(false)} onSaved={load} />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Remove featured movie?"
          message={`"${deleteTarget.movie?.title}" will be removed from the homepage spotlight.`}
          confirmLabel="Remove"
          busy={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
