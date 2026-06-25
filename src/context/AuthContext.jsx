import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const TOKEN_KEY = "nextwatch_token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const persistToken = (jwt) => {
    if (jwt) {
      localStorage.setItem(TOKEN_KEY, jwt);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    setToken(jwt);
  };

  const applyUserSession = (jwt, userData) => {
    persistToken(jwt);
    setUser(userData);
    setRole(userData.role);
    setIsAuthenticated(true);
  };

  const clearSession = () => {
    persistToken(null);
    setUser(null);
    setRole(null);
    setIsAuthenticated(false);
  };

  const authHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  // ─── Auth Functions ────────────────────────────────────────────────────────

  /**
   * Register a new user account.
   * @param {{ username: string, email: string, password: string }} credentials
   * @returns {{ success: boolean, error?: string }}
   */
  const register = async ({ username, email, password }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.message || "Registration failed." };
      }

      applyUserSession(data.token, data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  /**
   * Log in with email + password.
   * @param {{ email: string, password: string }} credentials
   * @returns {{ success: boolean, error?: string }}
   */
  const login = async ({ email, password }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.message || "Invalid credentials." };
      }

      applyUserSession(data.token, data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  /**
   * Log out the current user and clear the session.
   */
  const logout = useCallback(async () => {
    try {
      // Notify the server so it can invalidate the token server-side (optional)
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: authHeaders(),
      });
    } catch {
      // Swallow — we clear the local session regardless
    } finally {
      clearSession();
    }
  }, [authHeaders]);

  /**
   * Fetch the currently authenticated user from the server.
   * Uses the token stored in localStorage to rehydrate the session.
   * @returns {{ success: boolean, error?: string }}
   */
  const getCurrentUser = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setIsLoading(false);
      return { success: false, error: "No token found." };
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (!res.ok) {
        clearSession();
        setIsLoading(false);
        return { success: false, error: "Session expired. Please log in again." };
      }

      const data = await res.json();
      applyUserSession(storedToken, data.user);
      setIsLoading(false);
      return { success: true };
    } catch {
      clearSession();
      setIsLoading(false);
      return { success: false, error: "Network error during session restore." };
    }
  }, []);

  // ─── Session Hydration on Mount ────────────────────────────────────────────

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getCurrentUser();
  }, [getCurrentUser]);

  // ─── Context Value ─────────────────────────────────────────────────────────

  const value = {
    // State
    token,
    user,
    role,
    isAuthenticated,
    isLoading,

    // Functions
    register,
    login,
    logout,
    getCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to consume the AuthContext.
 * Must be used within an <AuthProvider>.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>.");
  }
  return ctx;
}
