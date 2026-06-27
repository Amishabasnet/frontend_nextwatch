import axios from "axios";

const api = axios.create({
  // eslint-disable-next-line no-undef
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
  timeout: 10_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nextwatch_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use((response) => {
  if (response.data && typeof response.data === "object" && "data" in response.data) {
    response.data = response.data.data;
  }
  return response;
});

export default api;

export const putConsent = (userId, payload) =>
  api.put(`/consent/${userId}`, payload);

export const getPreferences = () => api.get("/preferences");

export const putPreferences = (_userId, payload) => api.put("/preferences", payload);

export const postMood = (payload) => api.post("/mood", payload);

export const getMoods = () => api.get("/mood");

export const getLatestMood = () => api.get("/mood/latest");

export const getRecommendations = (userId) => api.get(`/recommendations/${userId}`);

export const getHistory       = ()       => api.get("/history");
export const getHistoryByUser = (userId) => api.get(`/history/${userId}`);
export const deleteHistory    = (userId) => api.delete(`/history/${userId}`);

export const getMovies     = ()       => api.get("/movies");
export const getMovieById  = (id)     => api.get(`/movies/${id}`);
export const searchMovies  = (params) => api.get("/movies/search", { params });

export const getWatchlist       = ()         => api.get("/watchlist");
export const getWatchlistByUser = (userId)   => api.get(`/watchlist/${userId}`);
export const postWatchlist      = (payload)  => api.post("/watchlist/add", payload);
export const deleteWatchlist    = (movieId)  => api.delete(`/watchlist/remove/${movieId}`);

export const postHistory = (payload) => api.post("/history", payload);

export const postRating = (payload) => api.post("/ratings", payload);
