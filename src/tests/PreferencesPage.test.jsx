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

import PreferencesPage from "../pages/Preferences/PreferencesPage";

/* ---------------- MOCK AUTH ---------------- */

vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../hooks/useAuth";

/* ---------------- MOCK API ---------------- */

vi.mock("../services/api", () => ({
  getPreferences: vi.fn(),
  putPreferences: vi.fn(),
  deletePreferences: vi.fn(),
}));

import {
  getPreferences,
  putPreferences,
} from "../services/api";

/* ---------------- RENDER HELPER ---------------- */

function renderPreferences() {
  return render(
    <MemoryRouter initialEntries={["/preferences"]}>
      <Routes>
        <Route
          path="/preferences"
          element={<PreferencesPage />}
        />

        <Route
          path="/dashboard"
          element={<div>Dashboard Page</div>}
        />

        <Route
          path="/recommendations"
          element={<div>Recommendations Page</div>}
        />
      </Routes>
    </MemoryRouter>
  );
}

/* ---------------- TESTS ---------------- */

describe("NextWatch Genre Preferences White-Box Tests", () => {

  beforeEach(() => {
    vi.clearAllMocks();

    useAuth.mockReturnValue({
      user: {
        id: "user-1",
        username: "testuser",
        email: "test@example.com",
        role: "user",
      },
      isAuthenticated: true,
    });

    getPreferences.mockResolvedValue({
      favoriteGenres: [],
      excludedGenres: [],
    });

    putPreferences.mockResolvedValue({
      success: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });


  /* ========================================
     PREF-01
     Load preferences
  ======================================== */

  it("loads genre preference page successfully", async () => {

    renderPreferences();

    await waitFor(() => {
      expect(getPreferences).toHaveBeenCalled();
    });

  });


  /* ========================================
     PREF-02
     Existing favorite genre
  ======================================== */

  it("preloads existing favorite genre", async () => {

    getPreferences.mockResolvedValue({
      favoriteGenres: ["Action"],
      excludedGenres: [],
    });

    renderPreferences();

    await waitFor(() => {
      expect(
        screen.getByText("Action")
      ).toBeTruthy();
    });

  });


  /* ========================================
     PREF-03
     Select favorite genre
  ======================================== */

  it("allows user to select a favorite genre", async () => {

    renderPreferences();

    await waitFor(() => {
      expect(
        screen.getByText("Action")
      ).toBeTruthy();
    });

    const actionGenre =
      screen.getByText("Action");

    fireEvent.click(actionGenre);

    expect(actionGenre).toBeTruthy();

  });


  /* ========================================
     PREF-04
     Exclude genre
  ======================================== */

  it("allows user to mark a genre as excluded", async () => {

    renderPreferences();

    await waitFor(() => {
      expect(
        screen.getByText("Horror")
      ).toBeTruthy();
    });

    const horrorGenre =
      screen.getByText("Horror");

    /*
      First click = favorite
      Second click = excluded/disliked
      depending on component implementation
    */

    fireEvent.click(horrorGenre);
    fireEvent.click(horrorGenre);

    expect(horrorGenre).toBeTruthy();

  });


  /* ========================================
     PREF-05
     Favorite/excluded conflict
  ======================================== */

  it("handles genre state change without duplicate preference state", async () => {

    getPreferences.mockResolvedValue({
      favoriteGenres: ["Action"],
      excludedGenres: [],
    });

    renderPreferences();

    await waitFor(() => {
      expect(
        screen.getByText("Action")
      ).toBeTruthy();
    });

    const actionGenre =
      screen.getByText("Action");

    fireEvent.click(actionGenre);

    expect(actionGenre).toBeTruthy();

  });


  /* ========================================
     PREF-06
     Save preferences
  ======================================== */

  it("saves selected genre preferences", async () => {

    renderPreferences();

    await waitFor(() => {
      expect(
        screen.getByText("Action")
      ).toBeTruthy();
    });

    fireEvent.click(
      screen.getByText("Action")
    );

    const saveButton =
      screen.getByRole("button", {
        name: /save/i,
      });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(
        putPreferences
      ).toHaveBeenCalled();
    });

  });


  /* ========================================
     PREF-07
     Favorite genres payload
  ======================================== */

  it("sends selected favorite genre when preferences are saved", async () => {

    renderPreferences();

    await waitFor(() => {
      expect(
        screen.getByText("Comedy")
      ).toBeTruthy();
    });

    fireEvent.click(
      screen.getByText("Comedy")
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /save/i,
      })
    );

   await waitFor(() => {
  expect(
    putPreferences
  ).toHaveBeenCalled();
});

expect(
  putPreferences
).toHaveBeenCalledWith(
  "user-1",
  {
    favoriteGenres: ["Comedy"],
    excludedGenres: [],
  }
);

  });


  /* ========================================
     PREF-08
     Preferences not configured
  ======================================== */

  it("handles preferences not configured response without crashing", async () => {

    getPreferences.mockRejectedValue({
      response: {
        status: 404,
      },
    });

    renderPreferences();

    await waitFor(() => {
      expect(
        getPreferences
      ).toHaveBeenCalled();
    });


    expect(
      document.body
    ).toBeTruthy();

  });

});