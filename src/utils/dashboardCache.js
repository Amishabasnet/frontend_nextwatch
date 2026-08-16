export const DASHBOARD_CACHE_KEY = "nextwatch_dashboard_state";

export function clearDashboardCache() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
  } catch {
    /* sessionStorage unavailable — nothing to clear */
  }
}