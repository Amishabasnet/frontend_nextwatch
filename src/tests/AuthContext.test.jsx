// @vitest-environment jsdom

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  cleanup
} from "@testing-library/react";
import { AuthProvider } from "../context/AuthContext";
import { useAuth } from "../hooks/useAuth";

function TestComponent() {
  const {
    token,
    user,
    role,
    isAuthenticated,
    isLoading,
    login,
    logout,
    getCurrentUser,
  } = useAuth();

  const handleLogin = async () => {
    const result = await login({
      email: "test@example.com",
      password: "Password123!",
    });

    document.body.dataset.loginResult = JSON.stringify(result);
  };

  const handleRestore = async () => {
    const result = await getCurrentUser();
    document.body.dataset.restoreResult = JSON.stringify(result);
  };

  return (
    <div>
      <p data-testid="token">{token || "no-token"}</p>

      <p data-testid="user">
        {user ? user.email : "no-user"}
      </p>

      <p data-testid="role">
        {role || "no-role"}
      </p>

      <p data-testid="authenticated">
        {String(isAuthenticated)}
      </p>

      <p data-testid="loading">
        {String(isLoading)}
      </p>

      <button onClick={handleLogin}>
        Login
      </button>

      <button onClick={logout}>
        Logout
      </button>

      <button onClick={handleRestore}>
        Restore Session
      </button>
    </div>
  );
}

function renderAuth() {
  return render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );
}

describe("NextWatch Authentication & Session White-Box Tests", () => {

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    delete document.body.dataset.loginResult;
    delete document.body.dataset.restoreResult;
  });

  afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  delete document.body.dataset.loginResult;
  delete document.body.dataset.restoreResult;
});


  // AUTH-01
  it("starts unauthenticated when no token exists", () => {
    renderAuth();

    expect(
      screen.getByTestId("token").textContent
    ).toBe("no-token");

    expect(
      screen.getByTestId("user").textContent
    ).toBe("no-user");

    expect(
      screen.getByTestId("role").textContent
    ).toBe("no-role");

    expect(
      screen.getByTestId("authenticated").textContent
    ).toBe("false");

    expect(
      screen.getByTestId("loading").textContent
    ).toBe("false");
  });


  // AUTH-02
  it("logs in successfully and stores access and refresh tokens", async () => {
    const mockUser = {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      role: "user",
      consentGiven: true,
    };

    // eslint-disable-next-line no-undef
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,

      json: async () => ({
        success: true,

        data: {
          token: "access-token-123",
          refreshToken: "refresh-token-123",
          user: mockUser,
        },
      }),
    });

    renderAuth();

    fireEvent.click(
      screen.getByRole("button", { name: "Login" })
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("authenticated").textContent
      ).toBe("true");
    });

    expect(
      localStorage.getItem("nextwatch_token")
    ).toBe("access-token-123");

    expect(
      localStorage.getItem("nextwatch_refresh_token")
    ).toBe("refresh-token-123");

    expect(
      screen.getByTestId("user").textContent
    ).toBe("test@example.com");

    expect(
      screen.getByTestId("role").textContent
    ).toBe("user");

    // eslint-disable-next-line no-undef
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.objectContaining({
        method: "POST",
      })
    );
  });


  // AUTH-03
  it("does not authenticate user when login fails", async () => {
    // eslint-disable-next-line no-undef
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,

      json: async () => ({
        success: false,
        message: "Invalid credentials.",
      }),
    });

    renderAuth();

    fireEvent.click(
      screen.getByRole("button", { name: "Login" })
    );

    await waitFor(() => {
      expect(document.body.dataset.loginResult)
        .toContain("Invalid credentials.");
    });

    expect(
      screen.getByTestId("authenticated").textContent
    ).toBe("false");

    expect(
      localStorage.getItem("nextwatch_token")
    ).toBeNull();

    expect(
      screen.getByTestId("user").textContent
    ).toBe("no-user");
  });


  // AUTH-04
  it("handles login network failure without creating a session", async () => {
    // eslint-disable-next-line no-undef
    global.fetch = vi.fn().mockRejectedValue(
      new Error("Network unavailable")
    );

    renderAuth();

    fireEvent.click(
      screen.getByRole("button", { name: "Login" })
    );

    await waitFor(() => {
      expect(document.body.dataset.loginResult)
        .toContain("Network error");
    });

    expect(
      screen.getByTestId("authenticated").textContent
    ).toBe("false");

    expect(
      localStorage.getItem("nextwatch_token")
    ).toBeNull();
  });


  // AUTH-05
  it("restores a valid stored user session", async () => {
    localStorage.setItem(
      "nextwatch_token",
      "stored-access-token"
    );

    const mockUser = {
      id: "user-1",
      name: "Restored User",
      email: "restored@example.com",
      role: "user",
      consentGiven: true,
    };

    // eslint-disable-next-line no-undef
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,

      json: async () => ({
        success: true,
        data: mockUser,
      }),
    });

    renderAuth();

    await waitFor(() => {
      expect(
        screen.getByTestId("authenticated").textContent
      ).toBe("true");
    });

    expect(
      screen.getByTestId("user").textContent
    ).toBe("restored@example.com");

    expect(
      screen.getByTestId("role").textContent
    ).toBe("user");

    expect(
      screen.getByTestId("token").textContent
    ).toBe("stored-access-token");

    expect(
      screen.getByTestId("loading").textContent
    ).toBe("false");

    // eslint-disable-next-line no-undef
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/profile"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer stored-access-token",
        }),
      })
    );
  });


  // AUTH-06
  it("clears session when stored token is expired or invalid", async () => {
    localStorage.setItem(
      "nextwatch_token",
      "expired-token"
    );

    localStorage.setItem(
      "nextwatch_refresh_token",
      "old-refresh-token"
    );

    // eslint-disable-next-line no-undef
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,

      json: async () => ({
        message: "Unauthorized",
      }),
    });

    renderAuth();

    await waitFor(() => {
      expect(
        screen.getByTestId("loading").textContent
      ).toBe("false");
    });

    expect(
      screen.getByTestId("authenticated").textContent
    ).toBe("false");

    expect(
      screen.getByTestId("user").textContent
    ).toBe("no-user");

    expect(
      screen.getByTestId("role").textContent
    ).toBe("no-role");

    expect(
      localStorage.getItem("nextwatch_token")
    ).toBeNull();

    expect(
      localStorage.getItem("nextwatch_refresh_token")
    ).toBeNull();
  });


  // AUTH-07
  it("logout clears user, role, access token and refresh token", async () => {
    const mockUser = {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      role: "user",
    };

    // eslint-disable-next-line no-undef
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,

      json: async () => ({
        success: true,

        data: {
          token: "access-token",
          refreshToken: "refresh-token",
          user: mockUser,
        },
      }),
    });

    renderAuth();

    fireEvent.click(
      screen.getByRole("button", { name: "Login" })
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("authenticated").textContent
      ).toBe("true");
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Logout" })
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("authenticated").textContent
      ).toBe("false");
    });

    expect(
      localStorage.getItem("nextwatch_token")
    ).toBeNull();

    expect(
      localStorage.getItem("nextwatch_refresh_token")
    ).toBeNull();

    expect(
      screen.getByTestId("user").textContent
    ).toBe("no-user");

    expect(
      screen.getByTestId("role").textContent
    ).toBe("no-role");
  });


  // AUTH-08
  it("clears active session when nw:session-expired event is fired", async () => {
    const mockUser = {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      role: "user",
    };

    // eslint-disable-next-line no-undef
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,

      json: async () => ({
        success: true,

        data: {
          token: "access-token",
          refreshToken: "refresh-token",
          user: mockUser,
        },
      }),
    });

    renderAuth();

    fireEvent.click(
      screen.getByRole("button", { name: "Login" })
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("authenticated").textContent
      ).toBe("true");
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("nw:session-expired")
      );
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("authenticated").textContent
      ).toBe("false");
    });

    expect(
      localStorage.getItem("nextwatch_token")
    ).toBeNull();

    expect(
      localStorage.getItem("nextwatch_refresh_token")
    ).toBeNull();

    expect(
      screen.getByTestId("user").textContent
    ).toBe("no-user");

    expect(
      screen.getByTestId("role").textContent
    ).toBe("no-role");
  });

});