import { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./auth-context";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "nextwatch_token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [isLoading, setIsLoading] = useState(
    () => Boolean(localStorage.getItem(TOKEN_KEY))
  );

  const persistToken = useCallback((jwt) => {
    if (jwt) {
      localStorage.setItem(TOKEN_KEY, jwt);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    setToken(jwt);
  }, []);

  const applyUserSession = useCallback(
    (jwt, userData) => {
      persistToken(jwt);
      setUser(userData);
      setRole(userData.role);
      setIsAuthenticated(true);
    },
    [persistToken]
  );

  const clearSession = useCallback(() => {
    persistToken(null);
    localStorage.removeItem("nextwatch_refresh_token");
    setUser(null);
    setRole(null);
    setIsAuthenticated(false);
  }, [persistToken]);

  // Listen for token refresh failures from the axios interceptor
  useEffect(() => {
    const handler = () => {
      clearSession();
    };
    window.addEventListener("nw:session-expired", handler);
    return () => window.removeEventListener("nw:session-expired", handler);
  }, [clearSession]);

  const authHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const register = async ({ username, email, phone, password }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: username, email, phone, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message || "Registration failed." };
      if (data.data.refreshToken) {
        localStorage.setItem("nextwatch_refresh_token", data.data.refreshToken);
      }
      applyUserSession(data.data.token, data.data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const login = async ({ email, password }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message || "Invalid credentials." };
      if (data.data.refreshToken) {
        localStorage.setItem("nextwatch_refresh_token", data.data.refreshToken);
      }
      applyUserSession(data.data.token, data.data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const getCurrentUser = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setIsLoading(false);
      return { success: false, error: "No token found." };
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        clearSession();
        setIsLoading(false);
        return { success: false, error: "Session expired. Please log in again." };
      }
      const data = await res.json();
      applyUserSession(storedToken, data.data);
      setIsLoading(false);
      return { success: true };
    } catch {
      clearSession();
      setIsLoading(false);
      return { success: false, error: "Network error during session restore." };
    }
  }, [applyUserSession, clearSession, authHeaders]);

  useEffect(() => {
    if (localStorage.getItem(TOKEN_KEY)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      getCurrentUser();
    }
  }, []);


  const value = {
    token,
    user,
    role,
    isAuthenticated,
    isLoading,
    register,
    login,
    logout,
    getCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
