import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, Film, Star, SmilePlus, Clapperboard, AlertCircle,
  RefreshCw, TrendingUp, Activity, LineChart as LineChartIcon, Layers,
  Flame, Clock, MousePointerClick, ThumbsUp, ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, Legend, ReferenceLine, LabelList,
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

function MultiSeriesTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1a1a24", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 8, padding: "8px 10px", fontSize: "0.76rem", color: "#eeeef5",
      minWidth: 130,
    }}>
      <div style={{ color: "#9292b0", marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#9292b0" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color }} />
            {p.name}
          </span>
          <span style={{ fontWeight: 700 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// One bar per mood: how strongly that mood leans toward its single most-
// watched genre. Simpler to read than a stacked multi-genre bar — the
// tooltip just spells out the one headline fact for that mood.
function TopGenreTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div style={{
      background: "#1a1a24", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 8, padding: "8px 10px", fontSize: "0.76rem", color: "#eeeef5",
      minWidth: 170,
    }}>
      <div style={{ color: "#eeeef5", fontWeight: 700, marginBottom: 4 }}>{label} mood</div>
      <div style={{ color: "#9292b0" }}>
        Mostly watches <span style={{ color: "#f472b6", fontWeight: 700 }}>{row?.topGenre}</span>
      </div>
      <div style={{ marginTop: 2 }}>
        <span style={{ fontWeight: 700 }}>{row?.topPct}%</span>{" "}
        <span style={{ color: "#6b6b8a" }}>
          ({row?.__topCount ?? 0} of {row?.total ?? 0} watches)
        </span>
      </div>
    </div>
  );
}

// "5m ago" / "3h ago" / "2d ago" — falls back to a plain date once it's
// further back than a week, since "12d ago" stops being a useful read.
function formatTimeAgo(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

// Pie tooltip that shows the percentage share alongside the raw count
// behind it, e.g. "Drama — 42.3% (91 watches)".
function GenrePctTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div style={{
      background: "#1a1a24", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 8, padding: "8px 10px", fontSize: "0.76rem", color: "#eeeef5",
    }}>
      <div style={{ color: "#9292b0", marginBottom: 2 }}>{p.name}</div>
      <div style={{ fontWeight: 700 }}>
        {p.value}% <span style={{ color: "#6b6b8a", fontWeight: 500 }}>({p.payload?.count ?? 0} watches)</span>
      </div>
    </div>
  );
}

const ACTIVITY_LABEL = {
  mood: "Mood Selected",
  rating: "Rated Movie",
  watch: "Watched Movie",
  watchlist: "Added to Watchlist",
};

// Ratings are stored on a 1–10 scale, but a 5-star display reads faster
// in a compact table row. Rounded, not truncated, so a 9/10 shows as a
// full 5★ rather than shortchanging it to 4.
function toFiveStars(rating) {
  return Math.min(5, Math.max(0, Math.round(rating / 2)));
}

function activityDetails(event) {
  if (event.type === "mood") return event.mood;
  if (event.type === "rating") return `${event.movieTitle} (${toFiveStars(event.rating)}★)`;
  return event.movieTitle;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAllActivity, setShowAllActivity] = useState(false);

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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const totals = data?.totals ?? {};
  const moodBreakdown = (data?.mostSelectedMood?.breakdown ?? []).slice(0, 8);
  const genreBreakdownRaw = (data?.mostWatchedGenre?.breakdown ?? []).slice(0, 8);
  const engagement = data?.userEngagement ?? {};
  const featured = data?.mostRecommendedMovies?.featured ?? [];
  const topRated = data?.mostRecommendedMovies?.topRatedByUsers ?? [];
  const activityTrend = data?.recommendationActivityTrend?.data ?? [];
  const moodGenre = data?.moodGenreBehaviour ?? { genres: [], data: [] };
  const topRecommended = data?.topRecommendedMovies ?? [];
  const recentActivity = data?.recentUserActivity ?? [];

  // Percentage share of each genre out of ALL watched-genre instances
  // (not just the displayed top 8), so "42%" reflects true share even
  // when there's a long tail of less-common genres folded off the chart.
  const genreBreakdown = useMemo(() => {
    const fullBreakdown = data?.mostWatchedGenre?.breakdown ?? [];
    const total = fullBreakdown.reduce((sum, g) => sum + (g.count ?? 0), 0);
    return genreBreakdownRaw.map((g) => ({
      ...g,
      pct: total ? Math.round((g.count / total) * 1000) / 10 : 0,
    }));
  }, [data, genreBreakdownRaw]);

  // Convert raw counts into percentage-of-that-mood's-total, and keep the
  // raw counts alongside (under __counts) so the tooltip can still show
  // exact numbers. Sorted by total watches so the mood with the most
  // signal (most reliable read) appears first.
  const moodGenrePctData = useMemo(() => {
    return [...moodGenre.data]
      .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
      .map((row) => {
        const pctRow = { mood: row.mood, total: row.total, __counts: {} };
        moodGenre.genres.forEach((genre) => {
          const count = row[genre] ?? 0;
          pctRow.__counts[genre] = count;
          pctRow[genre] = row.total ? Math.round((count / row.total) * 1000) / 10 : 0;
        });
        return pctRow;
      });
  }, [moodGenre]);

  // "When you're Happy, you mostly watch Comedy (58%)" — one line per
  // mood, no chart-reading required to get the headline.
  const moodGenreSummary = useMemo(() => {
    return moodGenrePctData.map((row) => {
      let topGenre = null;
      let topPct = -1;
      moodGenre.genres.forEach((genre) => {
        if ((row[genre] ?? 0) > topPct) {
          topPct = row[genre];
          topGenre = genre;
        }
      });
      return {
        mood: row.mood,
        topGenre,
        topPct,
        total: row.total,
        __topCount: topGenre ? row.__counts?.[topGenre] ?? 0 : 0,
      };
    });
  }, [moodGenrePctData, moodGenre.genres]);

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
                  dataKey="pct"
                  nameKey="genre"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {genreBreakdown.map((entry, i) => (
                    <Cell key={entry.genre} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<GenrePctTooltip />} />
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
                  {g.genre} <span style={{ color: "#6b6b8a" }}>({g.pct}%)</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="adm-chart-grid">
        <div className="adm-panel" style={{ display: "flex", flexDirection: "column" }}>
          <h2 className="adm-panel-title"><LineChartIcon size={15} color="#38bdf8" /> Recommendation Activity</h2>
          {loading ? (
            <div className="adm-skel" style={{ flex: 1, minHeight: 260, width: "100%" }} />
          ) : activityTrend.length ? (
            <div style={{ flex: 1, minHeight: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#6b6b8a", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    tickLine={false}
                    tickFormatter={(d) => d.slice(5)}
                  />
                  <YAxis tick={{ fill: "#6b6b8a", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<MultiSeriesTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "0.72rem", color: "#9292b0" }} />
                  <Line type="monotone" dataKey="clicked" name="Clicked" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="liked" name="Liked" stroke="#34d399" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="disliked" name="Disliked" stroke="#f87171" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="irrelevant" name="Irrelevant" stroke="#fbbf24" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="adm-empty">No recommendation feedback logged yet.</p>
          )}
        </div>

        <div className="adm-panel">
          <h2 className="adm-panel-title"><Layers size={15} color="#f472b6" /> Mood → Genre Behaviour</h2>
          <p style={{ fontSize: "0.72rem", color: "#6b6b8a", margin: "-4px 0 10px" }}>
            For each mood, how often it leads to that mood's single most-watched genre.
            The dashed line marks 80% — bars above it mean that mood almost always leads to the same genre.
          </p>
          {loading ? (
            <div className="adm-skel" style={{ height: 220, width: "100%" }} />
          ) : moodGenreSummary.length ? (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={moodGenreSummary} margin={{ top: 20, right: 8, left: -4, bottom: 4 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="mood"
                    tick={{ fill: "#eeeef5", fontSize: 12, fontWeight: 600 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 20, 40, 60, 80, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: "#6b6b8a", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<TopGenreTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <ReferenceLine
                    y={80}
                    stroke="#fbbf24"
                    strokeDasharray="4 4"
                    label={{ value: "80%", position: "right", fill: "#fbbf24", fontSize: 11, fontWeight: 700 }}
                  />
                  <Bar dataKey="topPct" name="Top genre share" fill="#f472b6" radius={[6, 6, 0, 0]}>
                    <LabelList
                      dataKey="topGenre"
                      position="top"
                      style={{ fill: "#9292b0", fontSize: 10, fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 12 }}>
                {moodGenreSummary.map((s) => (
                  <div key={s.mood} style={{ fontSize: "0.76rem", color: "#9292b0" }}>
                    <span style={{ color: "#eeeef5", fontWeight: 700 }}>{s.mood}</span>
                    {" → mostly "}
                    <span style={{ color: "#f472b6", fontWeight: 700 }}>{s.topGenre}</span>
                    {` (${s.topPct}% of ${s.total} watches)`}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="adm-empty">Not enough mood + viewing history overlap yet.</p>
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

      <div className="adm-chart-grid">
        <div className="adm-panel">
          <h2 className="adm-panel-title"><Flame size={15} color="#fb923c" /> Top Recommended Movies</h2>
          {loading ? (
            <p className="adm-empty">Loading…</p>
          ) : topRecommended.length ? (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {topRecommended.map((m) => (
                <li key={m.movieId} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                    <span style={{ color: "#eeeef5", fontWeight: 600 }}>{m.title}</span>
                    <span style={{ color: "#6b6b8a" }}>{m.releaseYear ?? "—"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 14, fontSize: "0.72rem", color: "#9292b0" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Flame size={12} color="#fb923c" /> {m.recommendedCount} recommended
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <MousePointerClick size={12} color="#38bdf8" /> {m.clickedCount} clicked
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <ThumbsUp size={12} color="#34d399" /> {m.likedCount} liked
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-empty">No recommendation feedback logged yet.</p>
          )}
        </div>

        <div className="adm-panel">
          <h2 className="adm-panel-title"><Clock size={15} color="#38bdf8" /> Recent User Activity</h2>
          {loading ? (
            <p className="adm-empty">Loading…</p>
          ) : recentActivity.length ? (
            <>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <th style={{ textAlign: "left", padding: "0 10px 10px 0", color: "#9292b0", fontWeight: 600 }}>User</th>
                      <th style={{ textAlign: "left", padding: "0 10px 10px", color: "#9292b0", fontWeight: 600 }}>Activity</th>
                      <th style={{ textAlign: "left", padding: "0 10px 10px", color: "#9292b0", fontWeight: 600 }}>Details</th>
                      <th style={{ textAlign: "right", padding: "0 0 10px 10px", color: "#9292b0", fontWeight: 600 }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllActivity ? recentActivity : recentActivity.slice(0, 5)).map((event, i) => (
                      <tr key={`${event.type}-${event.at}-${i}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "10px 10px 10px 0", color: "#eeeef5", fontWeight: 600, whiteSpace: "nowrap" }}>
                          {event.userName ?? "—"}
                        </td>
                        <td style={{ padding: "10px", color: "#9292b0", whiteSpace: "nowrap" }}>
                          {ACTIVITY_LABEL[event.type] ?? event.type}
                        </td>
                        <td style={{ padding: "10px", color: "#eeeef5" }}>{activityDetails(event)}</td>
                        <td style={{ padding: "10px 0 10px 10px", color: "#6b6b8a", textAlign: "right", whiteSpace: "nowrap" }}>
                          {formatTimeAgo(event.at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {recentActivity.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllActivity((v) => !v)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                    width: "100%", marginTop: 14, padding: "8px 0", background: "none", border: "none",
                    color: "#a78bfa", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
                  }}
                >
                  {showAllActivity ? "Show less" : "View all activity"}
                  <ChevronRight size={14} style={{ transform: showAllActivity ? "rotate(90deg)" : "none" }} />
                </button>
              )}
            </>
          ) : (
            <p className="adm-empty">No user activity logged yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}