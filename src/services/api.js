import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("nextwatch_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle expired or invalid tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const token = localStorage.getItem("nextwatch_token");

    if (error.response?.status === 401 && token) {
      localStorage.removeItem("nextwatch_token");

      // Notify AuthProvider that the session is invalid
      window.dispatchEvent(new Event("auth:unauthorized"));
    }

    return Promise.reject(error);
  }
);

export default api;