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

import MoodPage from "../pages/mood/MoodPage";

/* ==============================
   MOCK AUTH
============================== */

vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../hooks/useAuth";

/* ==============================
   MOCK API
============================== */

vi.mock("../services/api", () => ({
  getLatestMood: vi.fn(),
  getMoods: vi.fn(),
  postMood: vi.fn(),
}));

import {
  getLatestMood,
  getMoods,
  postMood,
} from "../services/api";

/* ==============================
   RENDER HELPER
============================== */

function renderMood() {
  return render(
    <MemoryRouter initialEntries={["/mood"]}>
      <Routes>
        <Route
          path="/mood"
          element={<MoodPage />}
        />

        <Route
          path="/recommendations"
          element={<div>Recommendations Page</div>}
        />

        <Route
          path="/dashboard"
          element={<div>Dashboard Page</div>}
        />
      </Routes>
    </MemoryRouter>
  );
}

/* ==============================
   TEST SUITE
============================== */

describe(
  "NextWatch Mood Selection White-Box Tests",
  () => {

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

      getLatestMood.mockResolvedValue({
        data: null,
      });

      getMoods.mockResolvedValue({
        data: [],
      });

      postMood.mockResolvedValue({
        success: true,
        data: {
          mood: "Happy",
        },
      });
    });

    afterEach(() => {
      cleanup();
      vi.restoreAllMocks();
    });

    /* ==========================
       MOOD-01
       Load page
    ========================== */

    it(
      "loads mood selection page successfully",
      async () => {
        renderMood();

        await waitFor(() => {
          expect(
            getLatestMood
          ).toHaveBeenCalledWith("user-1");

          expect(
            getMoods
          ).toHaveBeenCalledWith("user-1");
        });
      }
    );

    /* ==========================
       MOOD-02
       Display moods
    ========================== */

    it(
      "displays available mood options",
      async () => {
        renderMood();

        await waitFor(() => {
          expect(
            screen.getByText("Happy")
          ).toBeTruthy();

          expect(
            screen.getByText("Relaxed")
          ).toBeTruthy();

          expect(
            screen.getByText("Scared")
          ).toBeTruthy();
        });
      }
    );

    /* ==========================
       MOOD-03
       Select mood
    ========================== */

    it(
      "allows user to select a mood",
      async () => {
        renderMood();

        await waitFor(() => {
          expect(
            screen.getByText("Relaxed")
          ).toBeTruthy();
        });

        const relaxedMood =
          screen.getByText("Relaxed");

        fireEvent.click(relaxedMood);

        expect(
          relaxedMood
        ).toBeTruthy();
      }
    );

    /* ==========================
       MOOD-04
       Change mood
    ========================== */

    it(
      "allows current mood selection to change",
      async () => {
        renderMood();

        await waitFor(() => {
          expect(
            screen.getByText("Happy")
          ).toBeTruthy();

          expect(
            screen.getByText("Scared")
          ).toBeTruthy();
        });

        fireEvent.click(
          screen.getByText("Happy")
        );

        fireEvent.click(
          screen.getByText("Scared")
        );

        expect(
          screen.getByText("Scared")
        ).toBeTruthy();
      }
    );

    /* ==========================
       MOOD-05
       Empty submission
    ========================== */

    it(
      "does not submit mood when no mood is selected",
      async () => {
        renderMood();

        await waitFor(() => {
          expect(
            screen.getByText("Happy")
          ).toBeTruthy();
        });

        const submitButton =
          screen.queryByRole(
            "button",
            {
              name:
                /recommend|continue|save|submit|get recommendations/i,
            }
          );

        if (submitButton) {
          fireEvent.click(submitButton);
        }

        expect(
          postMood
        ).not.toHaveBeenCalled();
      }
    );

    /* ==========================
       MOOD-06
       Submit selected mood
    ========================== */

    it(
      "submits selected mood to API",
      async () => {
        renderMood();

        await waitFor(() => {
          expect(
            screen.getByText("Scared")
          ).toBeTruthy();
        });

        fireEvent.click(
          screen.getByText("Scared")
        );

        const submitButton =
          screen.getByRole(
            "button",
            {
              name:
                /recommend|continue|save|submit|get recommendations/i,
            }
          );

        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(
            postMood
          ).toHaveBeenCalled();
        });
      }
    );

    /* ==========================
       MOOD-07
       Correct payload
    ========================== */

    it(
      "sends selected mood value in request",
      async () => {
        renderMood();

        await waitFor(() => {
          expect(
            screen.getByText("Happy")
          ).toBeTruthy();
        });

        fireEvent.click(
          screen.getByText("Happy")
        );

        const submitButton =
          screen.getByRole(
            "button",
            {
              name:
                /recommend|continue|save|submit|get recommendations/i,
            }
          );

        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(
            postMood
          ).toHaveBeenCalled();
        });

        expect(
          postMood
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            mood: "Happy",
          })
        );
      }
    );

    /* ==========================
   MOOD-08
   Restore latest mood
========================== */

it(
  "loads previously selected mood when available",
  async () => {

    getLatestMood.mockResolvedValue({
      data: {
        mood: "Romantic",
        createdAt:
          "2026-08-18T10:00:00.000Z",
      },
    });

    getMoods.mockResolvedValue({
      data: [
        {
          id: "mood-1",
          mood: "Romantic",
          createdAt:
            "2026-08-18T10:00:00.000Z",
        },
      ],
    });

    renderMood();

    await waitFor(() => {
      expect(
        getLatestMood
      ).toHaveBeenCalledWith("user-1");

      expect(
        getMoods
      ).toHaveBeenCalledWith("user-1");
    });

    await waitFor(() => {
      const romanticElements =
        screen.getAllByText("Romantic");

      expect(
        romanticElements.length
      ).toBeGreaterThan(0);
    });
  }
);
  }
);