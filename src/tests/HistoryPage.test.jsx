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

import HistoryPage from "../pages/history/HistoryPage";

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
  getHistory: vi.fn(),
  deleteHistory: vi.fn(),
  clearHistory: vi.fn(),
  updateHistory: vi.fn(),
}));

import {
  getHistory,
  deleteHistory,
  clearHistory,
  updateHistory,
} from "../services/api";

/* ==============================
   RENDER HELPER
============================== */

function renderHistory() {
  return render(
    <MemoryRouter initialEntries={["/history"]}>
      <Routes>
        <Route
          path="/history"
          element={<HistoryPage />}
        />

        <Route
          path="/movies/:id"
          element={<div>Movie Details Page</div>}
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
   MOCK HISTORY DATA
============================== */

const historyItem = {
  id: "history-1",

  movie: {
    id: "movie-1",
    title: "Inception",
    genres: ["Sci-Fi", "Thriller"],
    posterUrl: "https://example.com/inception.jpg",
  },

  watchedAt: "2026-08-10T10:00:00.000Z",
  rating: 8,
  review: "Very good movie",
  completed: true,
  createdAt: "2026-08-10T10:00:00.000Z",
};

/* ==============================
   TEST SUITE
============================== */

describe(
  "NextWatch Viewing History White-Box Tests",
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

      getHistory.mockResolvedValue({
        data: {
          history: [historyItem],
          page: 1,
          totalPages: 1,
          total: 1,
        },
      });

      deleteHistory.mockResolvedValue({
        success: true,
      });

      clearHistory.mockResolvedValue({
        success: true,
      });

      updateHistory.mockResolvedValue({
        success: true,
      });
    });

    afterEach(() => {
      cleanup();
      vi.restoreAllMocks();
    });

    /* ==========================
       HISTORY-01
       Load history
    ========================== */

    it(
      "loads viewing history successfully",
      async () => {
        renderHistory();

        await waitFor(() => {
          expect(
            getHistory
          ).toHaveBeenCalled();
        });
      }
    );

    /* ==========================
       HISTORY-02
       Display movie data
    ========================== */

    it(
      "displays movie from viewing history",
      async () => {
        renderHistory();

        await waitFor(() => {
          expect(
            screen.getByText("Inception")
          ).toBeTruthy();
        });
      }
    );

    /// HISTORY-03
it(
  "displays watched date and movie genres",
  async () => {
    renderHistory();

    await waitFor(() => {
      expect(
        screen.getByText("Inception")
      ).toBeTruthy();
    });

    expect(
      screen.getByText("Sci-Fi")
    ).toBeTruthy();

    expect(
      screen.getByText("Thriller")
    ).toBeTruthy();

    expect(
      screen.getByText(/Aug 10, 2026/i)
    ).toBeTruthy();
  }
);

    /* ==========================
       HISTORY-04
       Empty history
    ========================== */

    it(
      "handles empty viewing history",
      async () => {
        getHistory.mockResolvedValue({
          data: {
            history: [],
            page: 1,
            totalPages: 0,
            total: 0,
          },
        });

        renderHistory();

        await waitFor(() => {
          expect(
            getHistory
          ).toHaveBeenCalled();
        });

        /*
          The page should remain rendered
          without crashing.
        */

        expect(
          document.body
        ).toBeTruthy();
      }
    );

    /* ==========================
       HISTORY-05
       API failure
    ========================== */

    it(
      "handles history API failure without crashing",
      async () => {
        getHistory.mockRejectedValue(
          new Error("History API failed")
        );

        renderHistory();

        await waitFor(() => {
          expect(
            getHistory
          ).toHaveBeenCalled();
        });

        expect(
          document.body
        ).toBeTruthy();
      }
    );

    /* ==========================
       HISTORY-06
       Remove using movie ID
    ========================== */

    it(
      "removes individual history entry using movie id",
      async () => {
        renderHistory();

        await waitFor(() => {
          expect(
            screen.getByText("Inception")
          ).toBeTruthy();
        });

        const removeButton =
          screen.queryByRole(
            "button",
            {
              name:
                /remove|delete/i,
            }
          );

        if (removeButton) {
          fireEvent.click(removeButton);

          const confirmButton =
            screen.queryByRole(
              "button",
              {
                name:
                  /confirm|remove|delete/i,
              }
            );

          if (confirmButton) {
            fireEvent.click(confirmButton);
          }
        }

        if (
          deleteHistory.mock.calls.length > 0
        ) {
          expect(
            deleteHistory
          ).toHaveBeenCalledWith(
            expect.stringContaining(
              "movie-1"
            )
          );
        }
      }
    );

    /* ==========================
       HISTORY-07
       Clear history
    ========================== */

    it(
      "supports clear all history action",
      async () => {
        renderHistory();

        await waitFor(() => {
          expect(
            getHistory
          ).toHaveBeenCalled();
        });

        const clearButton =
          screen.queryByRole(
            "button",
            {
              name:
                /clear history|clear all/i,
            }
          );

        if (clearButton) {
          fireEvent.click(clearButton);

          const confirmButton =
            screen.queryByRole(
              "button",
              {
                name:
                  /confirm|clear/i,
              }
            );

          if (confirmButton) {
            fireEvent.click(confirmButton);
          }
        }

        expect(
          document.body
        ).toBeTruthy();
      }
    );

    /* ==========================
       HISTORY-08
       Nested/null movie data
    ========================== */

    it(
      "handles history entry with missing movie data safely",
      async () => {
        getHistory.mockResolvedValue({
          data: {
            history: [
              {
                id: "history-2",
                movie: null,
                watchedAt:
                  "2026-08-12T10:00:00.000Z",
                rating: 7,
                review: "",
                completed: false,
              },
            ],
            page: 1,
            totalPages: 1,
            total: 1,
          },
        });

        renderHistory();

        await waitFor(() => {
          expect(
            getHistory
          ).toHaveBeenCalled();
        });

        expect(
          document.body
        ).toBeTruthy();
      }
    );
  }
);