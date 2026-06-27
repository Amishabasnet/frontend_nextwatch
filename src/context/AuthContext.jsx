import { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./auth-context";

// eslint-disable-next-line no-undef
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
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
    setUser(null);
    setRole(null);
    setIsAuthenticated(false);
  }, [persistToken]);

  const authHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const register = async ({ username, email, password }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message || "Registration failed." };
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
  }, [getCurrentUser]);


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
