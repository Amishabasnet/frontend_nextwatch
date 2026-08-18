// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import {
  MemoryRouter,
  Route,
  Routes,
} from "react-router-dom";

import LoginPage from "../pages/login/LoginPage";

vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../hooks/useAuth";

function renderLogin(initialEntry = "/login") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/dashboard"
          element={<div>User Dashboard</div>}
        />

        <Route
          path="/admin/dashboard"
          element={<div>Admin Dashboard</div>}
        />

        <Route
          path="/consent"
          element={<div>Consent Page</div>}
        />

        <Route
          path="/watchlist"
          element={<div>Watchlist Page</div>}
        />
      </Routes>
    </MemoryRouter>
  );
}

const getEmailInput = () =>
  screen.getByLabelText(/^Email$/i);

const getPasswordInput = () =>
  screen.getByLabelText(/^Password$/i);

const getSignInButton = () =>
  screen.getByRole("button", {
    name: /^Sign in$/i,
  });

function fillLoginForm(
  email = "user@example.com",
  password = "Password123!"
) {
  fireEvent.change(getEmailInput(), {
    target: {
      value: email,
    },
  });

  fireEvent.change(getPasswordInput(), {
    target: {
      value: password,
    },
  });
}

describe("NextWatch Login White-Box Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAuth.mockReturnValue({
      login: vi.fn(),
      isAuthenticated: false,
      user: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // LOGIN-01
it("disables sign in button when email is empty", () => {
  renderLogin();

  fireEvent.change(getPasswordInput(), {
    target: {
      value: "Password123!",
    },
  });

  expect(
    getSignInButton().disabled
  ).toBe(true);
});

  // LOGIN-02
  it("shows validation error for invalid email", async () => {
    renderLogin();

    fireEvent.change(getEmailInput(), {
      target: {
        value: "invalid-email",
      },
    });

    fireEvent.blur(getEmailInput());

    await waitFor(() => {
      expect(
        screen.getByText(/valid email/i)
      ).toBeTruthy();
    });
  });

  // LOGIN-03
  it("does not call login when password is empty", async () => {
    const loginMock = vi.fn();

    useAuth.mockReturnValue({
      login: loginMock,
      isAuthenticated: false,
      user: null,
    });

    renderLogin();

    fireEvent.change(getEmailInput(), {
      target: {
        value: "user@example.com",
      },
    });

    fireEvent.click(getSignInButton());

    await waitFor(() => {
      expect(loginMock).not.toHaveBeenCalled();
    });
  });

  // LOGIN-04
  it("calls login with valid email and password", async () => {
    const loginMock = vi.fn().mockResolvedValue({
      success: true,

      user: {
        id: "1",
        email: "user@example.com",
        role: "user",
        consentGiven: true,
      },
    });

    useAuth.mockReturnValue({
      login: loginMock,
      isAuthenticated: false,
      user: null,
    });

    renderLogin();

    fillLoginForm();

    fireEvent.click(getSignInButton());

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "Password123!",
      });
    });
  });

  // LOGIN-05
it("handles failed login response without redirecting", async () => {
  const loginMock = vi.fn().mockResolvedValue({
    success: false,
    message: "Invalid credentials.",
  });

  useAuth.mockReturnValue({
    login: loginMock,
    isAuthenticated: false,
    user: null,
  });

  renderLogin();

  fillLoginForm(
    "wrong@example.com",
    "WrongPassword1!"
  );

  fireEvent.click(getSignInButton());

  await waitFor(() => {
    expect(loginMock).toHaveBeenCalledWith({
      email: "wrong@example.com",
      password: "WrongPassword1!",
    });
  });

  expect(
    screen.getByText("Welcome back")
  ).toBeTruthy();

  expect(
    screen.queryByText("User Dashboard")
  ).toBeNull();
});

  // LOGIN-06
  it("redirects normal user to dashboard after successful login", async () => {
    const loginMock = vi.fn().mockResolvedValue({
      success: true,

      user: {
        id: "1",
        email: "user@example.com",
        role: "user",
        consentGiven: true,
      },
    });

    useAuth.mockReturnValue({
      login: loginMock,
      isAuthenticated: false,
      user: null,
    });

    renderLogin();

    fillLoginForm();

    fireEvent.click(getSignInButton());

    await waitFor(() => {
      expect(
        screen.getByText("User Dashboard")
      ).toBeTruthy();
    });
  });

// LOGIN-07
it("redirects successful login to dashboard", async () => {
  const loginMock = vi.fn().mockResolvedValue({
    success: true,

    user: {
      id: "admin-1",
      email: "admin@example.com",
      role: "admin",
      consentGiven: true,
    },
  });

  useAuth.mockReturnValue({
    login: loginMock,
    isAuthenticated: false,
    user: null,
  });

  renderLogin();

  fillLoginForm(
    "admin@example.com",
    "Admin123!"
  );

  fireEvent.click(getSignInButton());

  await waitFor(() => {
    expect(
      screen.getByText("User Dashboard")
    ).toBeTruthy();
  });
});

  // LOGIN-08
  it("redirects user without consent to consent page", async () => {
    const loginMock = vi.fn().mockResolvedValue({
      success: true,

      user: {
        id: "1",
        email: "user@example.com",
        role: "user",
        consentGiven: false,
      },
    });

    useAuth.mockReturnValue({
      login: loginMock,
      isAuthenticated: false,
      user: null,
    });

    renderLogin();

    fillLoginForm();

    fireEvent.click(getSignInButton());

    await waitFor(() => {
      expect(
        screen.getByText("Consent Page")
      ).toBeTruthy();
    });
  });
});