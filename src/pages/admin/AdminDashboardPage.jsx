import { useState, useEffect, useCallback } from "react";
import {
  Users, Film, Star, SmilePlus, Clapperboard, AlertCircle,
  RefreshCw, TrendingUp, Activity,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";
import { getAdminDashboard } from "../../services/api";
import "./Admin.css";

const PIE_COLORS = ["#7c3aed", "#a78bfa", "#34d399", "#fbbf24", "#f87171", "#38bdf8", "#f472b6", "#fb923c"];

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="adm-stat-card">
      <span className="adm-stat-icon" style={{ background: accent }}>
        <Icon size={16} />
      </span>
      <span className="adm-stat-value">{value ?? "—"}</span>
      <span className="adm-stat-label">{label}</span>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1a1a24", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 8, padding: "8px 10px", fontSize: "0.76rem", color: "#eeeef5",
    }}>
      <div style={{ color: "#9292b0", marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{payload[0].value}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAdminDashboard();
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message ?? "Couldn't load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totals = data?.totals ?? {};
  const moodBreakdown = (data?.mostSelectedMood?.breakdown ?? []).slice(0, 8);
  const genreBreakdown = (data?.mostWatchedGenre?.breakdown ?? []).slice(0, 8);
  const engagement = data?.userEngagement ?? {};
  const featured = data?.mostRecommendedMovies?.featured ?? [];
  const topRated = data?.mostRecommendedMovies?.topRatedByUsers ?? [];

  return (
    <div>
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Dashboard</h1>
          <p className="adm-page-subtitle">Platform-wide stats and activity</p>
        </div>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && (
        <div className="adm-error">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      <div className="adm-stat-grid">
        <StatCard icon={Users} label="Total Users" value={loading ? "…" : totals.totalUsers} accent="rgba(167,139,250,0.18)" />
        <StatCard icon={Film} label="Total Movies" value={loading ? "…" : totals.totalMovies} accent="rgba(52,211,153,0.18)" />
        <StatCard icon={Star} label="Total Ratings" value={loading ? "…" : totals.totalRatings} accent="rgba(251,191,36,0.18)" />
        <StatCard icon={Activity} label="Active (30d)" value={loading ? "…" : engagement.activeUsersLast30Days} accent="rgba(56,189,248,0.18)" />
        <StatCard
          icon={TrendingUp}
          label="Engagement rate"
          value={loading ? "…" : `${engagement.engagementRatePercent ?? 0}%`}
          accent="rgba(248,113,113,0.18)"
        />
      </div>

      <div className="adm-chart-grid">
        <div className="adm-panel">
          <h2 className="adm-panel-title"><SmilePlus size={15} color="#fbbf24" /> Most Selected Moods</h2>
          {loading ? (
            <div className="adm-skel" style={{ height: 220, width: "100%" }} />
          ) : moodBreakdown.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={moodBreakdown} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="mood" tick={{ fill: "#6b6b8a", fontSize: 11 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickLine={false} />
                <YAxis tick={{ fill: "#6b6b8a", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#a78bfa" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="adm-empty">No mood data logged yet.</p>
          )}
        </div>

        <div className="adm-panel">
          <h2 className="adm-panel-title"><Clapperboard size={15} color="#34d399" /> Most Watched Genres</h2>
          {loading ? (
            <div className="adm-skel" style={{ height: 220, width: "100%" }} />
          ) : genreBreakdown.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={genreBreakdown}
                  dataKey="count"
                  nameKey="genre"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {genreBreakdown.map((entry, i) => (
                    <Cell key={entry.genre} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="adm-empty">No viewing history yet.</p>
          )}
          {genreBreakdown.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 10, justifyContent: "center" }}>
              {genreBreakdown.map((g, i) => (
                <span key={g.genre} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "#9292b0" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {g.genre}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="adm-chart-grid">
        <div className="adm-panel">
          <h2 className="adm-panel-title">Admin Featured</h2>
          {loading ? (
            <p className="adm-empty">Loading…</p>
          ) : featured.length ? (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {featured.map((m) => (
                <li key={m.movieId} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                  <span style={{ color: "#eeeef5", fontWeight: 600 }}>{m.title}</span>
                  <span style={{ color: "#6b6b8a" }}>{m.releaseYear ?? "—"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-empty">No featured movies set.</p>
          )}
        </div>

        <div className="adm-panel">
          <h2 className="adm-panel-title">Top Rated by Users</h2>
          {loading ? (
            <p className="adm-empty">Loading…</p>
          ) : topRated.length ? (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {topRated.map((m) => (
                <li key={m.movieId} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                  <span style={{ color: "#eeeef5", fontWeight: 600 }}>{m.title}</span>
                  <span style={{ color: "#fbbf24", fontWeight: 700 }}>★ {m.averageRating} <span style={{ color: "#6b6b8a", fontWeight: 500 }}>({m.ratingCount})</span></span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-empty">No ratings yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
