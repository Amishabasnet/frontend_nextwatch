import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import AuthContext from "./AuthContext";
import authService from "../services/authService";

const TOKEN_KEY = "nextwatch_token";

const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(
    () => localStorage.getItem(TOKEN_KEY) || null
  );

  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearAuthentication = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);

    setToken(null);
    setUser(null);
    setRole(null);
    setLoading(false);
  }, []);

  const saveAuthentication = useCallback((jwtToken, userData) => {
    if (!jwtToken || !userData) {
      throw new Error("Invalid authentication response.");
    }

    localStorage.setItem(TOKEN_KEY, jwtToken);

    setToken(jwtToken);
    setUser(userData);
    setRole(userData.role || "user");
  }, []);

  const register = async (formData) => {
    setLoading(true);

    try {
      const response = await authService.register(formData);

      const jwtToken =
        response.token ||
        response.accessToken ||
        response.data?.token ||
        response.data?.accessToken;

      const userData = response.user || response.data?.user;

      saveAuthentication(jwtToken, userData);

      toast.success("Registration successful.");

      return {
        success: true,
        user: userData,
      };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Registration failed.";

      toast.error(message);

      return {
        success: false,
        message,
      };
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    setLoading(true);

    try {
      const response = await authService.login(credentials);

      const jwtToken =
        response.token ||
        response.accessToken ||
        response.data?.token ||
        response.data?.accessToken;

      const userData = response.user || response.data?.user;

      saveAuthentication(jwtToken, userData);

      toast.success("Login successful.");

      return {
        success: true,
        user: userData,
      };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Invalid email or password.";

      toast.error(message);

      return {
        success: false,
        message,
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(() => {
    clearAuthentication();
    toast.success("You have been logged out.");
  }, [clearAuthentication]);

  const getCurrentUser = useCallback(async () => {
    const savedToken = localStorage.getItem(TOKEN_KEY);

    if (!savedToken) {
      clearAuthentication();
      return null;
    }

    setLoading(true);

    try {
      const response = await authService.getCurrentUser();

      const userData =
        response.user ||
        response.data?.user ||
        response.data ||
        response;

      setToken(savedToken);
      setUser(userData);
      setRole(userData.role || "user");

      return userData;
    } catch {
      clearAuthentication();
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearAuthentication]);

  // Restore authentication after page refresh
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getCurrentUser();
  }, [getCurrentUser]);

  // Logout when Axios receives 401 response
  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuthentication();
      toast.error("Your session has expired. Please log in again.");
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener(
        "auth:unauthorized",
        handleUnauthorized
      );
    };
  }, [clearAuthentication]);

  const isAuthenticated = Boolean(token && user);

  const authStatus = loading
    ? "loading"
    : isAuthenticated
      ? "authenticated"
      : "unauthenticated";

  const contextValue = useMemo(
    () => ({
      token,
      user,
      role,
      loading,
      authStatus,
      isAuthenticated,
      register,
      login,
      logout,
      getCurrentUser,
    }),
    [
      token,
      user,
      role,
      loading,
      authStatus,
      isAuthenticated,
      logout,
      getCurrentUser,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;