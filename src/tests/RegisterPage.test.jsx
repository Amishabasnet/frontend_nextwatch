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

import RegisterPage from "../pages/register/RegisterPage";

vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../hooks/useAuth";

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/preferences"
          element={<div>Preferences Page</div>}
        />

        <Route
          path="/login"
          element={<div>Login Page</div>}
        />
      </Routes>
    </MemoryRouter>
  );
}

const getUsernameInput = () =>
  screen.getByLabelText(/^Username$/i);

const getEmailInput = () =>
  screen.getByLabelText(/^Email$/i);

const getPhoneInput = () =>
  screen.getByLabelText(/Phone number/i);

const getPasswordInput = () =>
  screen.getByLabelText(/^Password$/i);

const getConfirmPasswordInput = () =>
  screen.getByLabelText(/^Confirm password$/i);

const getCreateAccountButton = () =>
  screen.getByRole("button", {
    name: /^Create account$/i,
  });

function fillValidForm() {
  fireEvent.change(getUsernameInput(), {
    target: {
      value: "johndoe",
    },
  });

  fireEvent.change(getEmailInput(), {
    target: {
      value: "john@example.com",
    },
  });

  fireEvent.change(getPasswordInput(), {
    target: {
      value: "Password123!",
    },
  });

  fireEvent.change(getConfirmPasswordInput(), {
    target: {
      value: "Password123!",
    },
  });
}

describe("NextWatch Registration White-Box Tests", () => {

  beforeEach(() => {
    vi.clearAllMocks();

    useAuth.mockReturnValue({
      register: vi.fn(),
      isAuthenticated: false,
      user: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

// REGISTER-01
it("disables create account button when username is empty", () => {
  const registerMock = vi.fn();

  useAuth.mockReturnValue({
    register: registerMock,
    isAuthenticated: false,
    user: null,
  });

  renderRegister();

  fireEvent.change(getEmailInput(), {
    target: {
      value: "john@example.com",
    },
  });

  fireEvent.change(getPasswordInput(), {
    target: {
      value: "Password123!",
    },
  });

  fireEvent.change(getConfirmPasswordInput(), {
    target: {
      value: "Password123!",
    },
  });

  expect(
    getCreateAccountButton().disabled
  ).toBe(true);

  expect(
    registerMock
  ).not.toHaveBeenCalled();
});


  // REGISTER-02
  it("shows validation error for invalid email", async () => {
    renderRegister();

    fireEvent.change(getUsernameInput(), {
      target: {
        value: "johndoe",
      },
    });

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


  // REGISTER-03
  it("rejects weak password", async () => {
    renderRegister();

    fireEvent.change(getPasswordInput(), {
      target: {
        value: "abc",
      },
    });

    fireEvent.blur(getPasswordInput());

    await waitFor(() => {
      expect(
        getCreateAccountButton().disabled
      ).toBe(true);
    });
  });


  // REGISTER-04
  it("detects mismatching confirmation password", async () => {
    renderRegister();

    fireEvent.change(getPasswordInput(), {
      target: {
        value: "Password123!",
      },
    });

    fireEvent.change(getConfirmPasswordInput(), {
      target: {
        value: "Different123!",
      },
    });

    await waitFor(() => {
      expect(
        screen.queryByText(/Passwords match/i)
      ).toBeNull();
    });
  });


  // REGISTER-05
  it("does not call register when form is invalid", async () => {
    const registerMock = vi.fn();

    useAuth.mockReturnValue({
      register: registerMock,
      isAuthenticated: false,
      user: null,
    });

    renderRegister();

    fireEvent.click(getCreateAccountButton());

    await waitFor(() => {
      expect(registerMock).not.toHaveBeenCalled();
    });
  });


  // REGISTER-06
  it("calls register with valid registration data", async () => {
    const registerMock = vi.fn().mockResolvedValue({
      success: true,

      user: {
        id: "user-1",
        username: "johndoe",
        email: "john@example.com",
        role: "user",
      },
    });

    useAuth.mockReturnValue({
      register: registerMock,
      isAuthenticated: false,
      user: null,
    });

    renderRegister();

    fillValidForm();

    fireEvent.click(getCreateAccountButton());

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalled();
    });

    expect(registerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "johndoe",
        email: "john@example.com",
        password: "Password123!",
      })
    );
  });


  // REGISTER-07
  it("handles duplicate email registration failure", async () => {
    const registerMock = vi.fn().mockResolvedValue({
      success: false,
      message: "Email already exists.",
    });

    useAuth.mockReturnValue({
      register: registerMock,
      isAuthenticated: false,
      user: null,
    });

    renderRegister();

    fillValidForm();

    fireEvent.click(getCreateAccountButton());

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalled();
    });

    expect(
      screen.getByText("Create your account")
    ).toBeTruthy();
  });


  // REGISTER-08
  it("accepts valid optional phone number", async () => {
    const registerMock = vi.fn().mockResolvedValue({
      success: true,
    });

    useAuth.mockReturnValue({
      register: registerMock,
      isAuthenticated: false,
      user: null,
    });

    renderRegister();

    fillValidForm();

    fireEvent.change(getPhoneInput(), {
      target: {
        value: "9812345678",
      },
    });

    fireEvent.click(getCreateAccountButton());

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalled();
    });

    expect(registerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: "9812345678",
      })
    );
  });

});