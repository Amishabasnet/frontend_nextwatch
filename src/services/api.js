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
      !originalRequest.url?.includes("/auth/login")
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

export const getPreferences = (userId) =>
  userId ? api.get(`/preferences/${userId}`) : api.get("/preferences");
export const putPreferences = (_userId, payload) => api.put("/preferences", payload);

export const postMood      = (payload) => api.post("/mood", payload);
export const getMoods      = (userId)  => userId ? api.get(`/mood/${userId}`) : api.get("/mood");
export const getLatestMood = (userId)  => userId ? api.get(`/mood/${userId}/latest`) : api.get("/mood/latest");

export const getRecommendations = (userId) => api.get(`/recommendations/${userId}`);

export const getHistory       = (userId)  => userId ? api.get(`/history/${userId}`) : api.get("/history");
export const getHistoryByUser = (userId)  => api.get(`/history/${userId}`);
export const postHistory      = (payload) => api.post("/history", payload);
export const deleteHistory    = (userId)  => api.delete(`/history/${userId}`);

export const getMovies    = (params)  => api.get("/movies", { params });
export const getMovieById = (id)      => api.get(`/movies/${id}`);
export const searchMovies = (params)  => api.get("/movies/search", { params });

export const getWatchlist       = ()         => api.get("/watchlist");
export const getWatchlistByUser = (userId)   => api.get(`/watchlist/${userId}`);
export const postWatchlist      = (payload)  => api.post("/watchlist/add", payload);
export const deleteWatchlist    = (movieId)  => api.delete(`/watchlist/remove/${movieId}`);

export const postRating        = (payload)     => api.post("/ratings", payload);
export const getRatingsByMovie = (movieId)     => api.get(`/ratings/${movieId}`);
export const getRatingsByUser  = (userId)      => api.get(`/ratings/user/${userId}`);
export const putRating         = (id, payload) => api.put(`/ratings/${id}`, payload);
export const deleteRating      = (id)          => api.delete(`/ratings/${id}`);

export const deleteUser = (userId) => api.delete(`/users/${userId}`);
