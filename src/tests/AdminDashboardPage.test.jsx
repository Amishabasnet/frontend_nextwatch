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
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import {
  MemoryRouter,
  Route,
  Routes,
} from "react-router-dom";

import AdminDashboardPage from "../pages/admin/AdminDashboardPage";


// MOCK AUTH
vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../hooks/useAuth";

// MOCK API
vi.mock("../services/api", () => ({
  getAdminDashboard: vi.fn(),
}));

import {
  getAdminDashboard,
} from "../services/api";

// DASHBOARD MOCK DATA
const dashboardData = {
  totals: {
    totalUsers: 7,
    totalMovies: 50,
    totalRatings: 16,
  },

  mostSelectedMood: {
    mood: "Happy",
    count: 10,
    breakdown: [
      {
        mood: "Happy",
        count: 10,
      },
      {
        mood: "Relaxed",
        count: 6,
      },
    ],
  },

  mostWatchedGenre: {
    genre: "Action",
    count: 15,
    breakdown: [
      {
        genre: "Action",
        count: 15,
      },
      {
        genre: "Comedy",
        count: 8,
      },
    ],
  },

  mostRecommendedMovies: {
    featured: [],
    topRatedByUsers: [],
  },

  userEngagement: {
    activeUsersLast30Days: 5,
    engagementRatePercent: 71.4,
    avgRatingsPerUser: 2.3,
    avgHistoryEntriesPerUser: 4.5,

    recentActivityLast30Days: {
      moodLogs: 12,
      ratings: 16,
      historyEntries: 20,
    },
  },

  generatedAt:
    "2026-08-18T10:00:00.000Z",
};

// RENDER HELPER
function renderAdminDashboard() {
  return render(
    <MemoryRouter
      initialEntries={["/admin/dashboard"]}
    >
      <Routes>
        <Route
          path="/admin/dashboard"
          element={<AdminDashboardPage />}
        />

        <Route
          path="/admin/movies"
          element={<div>Manage Movies Page</div>}
        />

        <Route
          path="/admin/users"
          element={<div>Manage Users Page</div>}
        />

        <Route
          path="/dashboard"
          element={<div>User Dashboard</div>}
        />
      </Routes>
    </MemoryRouter>
  );
}

//  TEST SUITE

describe(
  "NextWatch Admin Dashboard White-Box Tests",
  () => {

    beforeEach(() => {
      vi.clearAllMocks();

      useAuth.mockReturnValue({
        user: {
          id: "admin-1",
          username: "admin",
          email: "admin@nextwatch.com",
          role: "admin",
        },

        role: "admin",
        isAuthenticated: true,
      });

      getAdminDashboard.mockResolvedValue({
        data: dashboardData,
      });
    });

    afterEach(() => {
      cleanup();
      vi.restoreAllMocks();
    });

    
    //    ADMIN-01
    //    API call

    it(
      "loads admin dashboard data from API",
      async () => {

        renderAdminDashboard();

        await waitFor(() => {
          expect(
            getAdminDashboard
          ).toHaveBeenCalled();
        });
      }
    );

    //    ADMIN-02
    //    User total
    it(
      "displays total number of users",
      async () => {

        renderAdminDashboard();

        await waitFor(() => {
          expect(
            screen.getByText("7")
          ).toBeTruthy();
        });
      }
    );

    //    ADMIN-03
    //    Movie and rating totals

    it(
      "displays movie and rating statistics",
      async () => {

        renderAdminDashboard();

        await waitFor(() => {
          expect(
            screen.getByText("50")
          ).toBeTruthy();

          expect(
            screen.getByText("16")
          ).toBeTruthy();
        });
      }
    );

//    ADMIN-04
//    Mood analytics section

it(
  "displays the most selected moods analytics section",
  async () => {

    renderAdminDashboard();

    await waitFor(() => {
      expect(
        screen.getByText(/Most Selected Moods/i)
      ).toBeTruthy();
    });

    expect(
      getAdminDashboard
    ).toHaveBeenCalled();
  }
);

    //    ADMIN-05
    //    Most watched genre

    it(
      "displays most watched genre",
      async () => {

        renderAdminDashboard();

        await waitFor(() => {
          expect(
            screen.getByText("Action")
          ).toBeTruthy();
        });
      }
    );

    //    ADMIN-06
    //    Active users

    it(
      "displays active users and engagement data",
      async () => {

        renderAdminDashboard();

        await waitFor(() => {
          expect(
            screen.getByText("5")
          ).toBeTruthy();
        });

        expect(
          screen.getByText(/71.4/)
        ).toBeTruthy();
      }
    );

    //    ADMIN-07
    //    Zero-value branch

    it(
      "handles zero-value dashboard statistics",
      async () => {

        getAdminDashboard.mockResolvedValue({
          data: {
            totals: {
              totalUsers: 0,
              totalMovies: 0,
              totalRatings: 0,
            },

            mostSelectedMood: {
              mood: null,
              count: 0,
              breakdown: [],
            },

            mostWatchedGenre: {
              genre: null,
              count: 0,
              breakdown: [],
            },

            mostRecommendedMovies: {
              featured: [],
              topRatedByUsers: [],
            },

            userEngagement: {
              activeUsersLast30Days: 0,
              engagementRatePercent: 0,
              avgRatingsPerUser: 0,
              avgHistoryEntriesPerUser: 0,

              recentActivityLast30Days: {
                moodLogs: 0,
                ratings: 0,
                historyEntries: 0,
              },
            },

            generatedAt:
              "2026-08-18T10:00:00.000Z",
          },
        });

        renderAdminDashboard();

        await waitFor(() => {
          expect(
            getAdminDashboard
          ).toHaveBeenCalled();
        });

        expect(
          document.body
        ).toBeTruthy();
      }
    );

    //    ADMIN-08
    //    API error branch

    it(
      "handles admin dashboard API failure without crashing",
      async () => {

        getAdminDashboard.mockRejectedValue(
          new Error(
            "Unable to load admin dashboard"
          )
        );

        renderAdminDashboard();

        await waitFor(() => {
          expect(
            getAdminDashboard
          ).toHaveBeenCalled();
        });

        expect(
          document.body
        ).toBeTruthy();
      }
    );
  }
);