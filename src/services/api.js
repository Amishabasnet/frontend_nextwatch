import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
  headers: { "Content-Type": "application/json" },
  timeout: 10_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nextwatch_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

export const postConsent = (payload) => api.post("/consent", payload);

export const getConsent = (userId) => api.get(`/consent/${userId}`);

export const putConsent = (userId, payload) =>
  api.put(`/consent/${userId}`, payload);

export const postPreferences = (payload) => api.post("/preferences", payload);

export const getPreferences = (userId) => api.get(`/preferences/${userId}`);

export const putPreferences = (userId, payload) =>
  api.put(`/preferences/${userId}`, payload);

export const postMood = (payload) => api.post("/moods", payload);

export const getMoods = (userId) => api.get(`/moods/${userId}`);

export const getLatestMood = (userId) => api.get(`/moods/${userId}/latest`);

export const getRecommendations = (userId) => api.get(`/recommendations/${userId}`);

export const getHistory = (userId) => api.get(`/history/${userId}`);
// eslint-disable-next-line no-undef
getMovies = () => api.get("/movies");
