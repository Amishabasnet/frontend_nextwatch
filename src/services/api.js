import axios from "axios";

const TOKEN_KEY = "nextwatch_token";
const REFRESH_KEY = "nextwatch_refresh_token";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 10_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let refreshQueue = []; // pending requests while refresh is in flight

function processQueue(error, token = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) { reject(error); } else { resolve(token); }
  });
  refreshQueue = [];
}

api.interceptors.response.use(
  (response) => {
    // Unwrap { success, data } envelope
    if (response.data && typeof response.data === "object" && "data" in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401, and only once per request
    if (
      error.response?.status === 401 &&
      !originalRequest._retried &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/forgot-password") &&
      !originalRequest.url?.includes("/auth/reset-password")
    ) {
      originalRequest._retried = true;

      if (isRefreshing) {
        // Queue this request until the ongoing refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        });
      }

      isRefreshing = true;
      const refreshToken = localStorage.getItem(REFRESH_KEY);

      if (!refreshToken) {
        // No refresh token — log out cleanly
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        processQueue(new Error("No refresh token"), null);
        isRefreshing = false;
        window.dispatchEvent(new CustomEvent("nw:session-expired"));
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || "/api"}/auth/refresh`,
          { refreshToken },
          { headers: { "Content-Type": "application/json" } }
        );

        // Backend may wrap in { data: { token } } or return { token } directly
        const newAccessToken = data?.data?.token ?? data?.token;
        const newRefreshToken = data?.data?.refreshToken ?? data?.refreshToken ?? refreshToken;

        if (!newAccessToken) throw new Error("No token in refresh response");

        localStorage.setItem(TOKEN_KEY, newAccessToken);
        localStorage.setItem(REFRESH_KEY, newRefreshToken);

        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        isRefreshing = false;

        return api(originalRequest); // retry original request
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Refresh failed — clear session and signal app
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        window.dispatchEvent(new CustomEvent("nw:session-expired"));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

export const getConsent = (userId) => api.get(`/consent/${userId}`);
export const putConsent = (userId, payload) => api.put(`/consent/${userId}`, payload);

// NOTE: the backend derives the current user from the JWT (req.user._id) for
// preferences/mood/history/watchlist — it does NOT accept a :userId path param
// for these. The userId args below are kept (and ignored) so existing call
// sites don't need to change.
export const getPreferences = () => api.get("/preferences");
export const putPreferences = (_userId, payload) => api.put("/preferences", payload);

export const postMood      = (payload) => api.post("/mood", payload);
export const getMoods      = (_userId, params) => api.get("/mood", { params });
export const getLatestMood = () => api.get("/mood/latest");

export const getRecommendations = (userId, params) => api.get(`/recommendations/${userId}`, { params });

export const getHistory        = (_userId, params) => api.get("/history", { params });
export const getHistoryByUser  = (_userId, params) => api.get("/history", { params });
export const postHistory       = (payload) => api.post("/history", payload);
export const updateHistoryEntry = (movieId, payload) => api.put(`/history/${movieId}`, payload);
export const removeHistoryItem  = (movieId) => api.delete(`/history/${movieId}`);
export const deleteHistory     = () => api.delete("/history/clear");

export const getMovies    = (params)  => api.get("/movies", { params });
export const getTopRatedMovies = (params) => api.get("/movies/top-rated", { params });
export const getMovieById = (id)      => api.get(`/movies/${id}`);
export const searchMovies = (params, config = {}) => api.get("/movies/search", { params, ...config });
export const createMovie  = (payload) => api.post("/movies", payload);
export const updateMovie  = (id, payload) => api.put(`/movies/${id}`, payload);
export const deleteMovie  = (id)      => api.delete(`/movies/${id}`);

// ── Featured movies (homepage spotlight) ──
export const getAllFeaturesAdmin = () => api.get("/features/admin/all");
export const addFeaturedMovie    = (payload) => api.post("/features", payload);
export const updateFeature       = (id, payload) => api.put(`/features/${id}`, payload);
export const removeFeature       = (id) => api.delete(`/features/${id}`);

export const getWatchlist       = (params)   => api.get("/watchlist", { params });
export const getWatchlistByUser = (_userId, params) => api.get("/watchlist", { params });
export const postWatchlist      = (payload)  => api.post("/watchlist", payload);
export const deleteWatchlist    = (movieId)  => api.delete(`/watchlist/${movieId}`);

export const postRating        = (payload)     => api.post("/ratings", payload);
export const getRatingsByMovie = (movieId)     => api.get(`/ratings/${movieId}`);
export const getRatingsByUser  = (userId)      => api.get(`/ratings/user/${userId}`);
export const putRating         = (id, payload) => api.put(`/ratings/${id}`, payload);
export const deleteRating      = (id)          => api.delete(`/ratings/${id}`);

export const getProfile    = () => api.get("/auth/profile");
export const updateProfile = (payload) => api.put("/auth/profile", payload);
export const changePassword = (payload) => api.put("/auth/password", payload);
export const forgotPassword = (email) => api.post("/auth/forgot-password", { email });
export const resetPassword  = (token, password) => api.post("/auth/reset-password", { token, password });

export const deleteUser = (userId) => api.delete(`/users/${userId}`);

export const getAdminDashboard   = () => api.get("/admin/dashboard");
export const getAdminUsers       = (params) => api.get("/admin/users", { params });
export const getAdminUserById    = (id) => api.get(`/admin/users/${id}`);
export const createAdminUser       = (payload) => api.post("/admin/users", payload);
export const updateAdminUserRole   = (id, role)   => api.patch(`/admin/users/${id}/role`, { role });
export const updateAdminUserStatus = (id, status) => api.patch(`/admin/users/${id}/status`, { status });
export const deleteAdminUser       = (id) => api.delete(`/admin/users/${id}`);

