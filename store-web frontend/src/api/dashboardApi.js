import apiClient from "./apiClient";

/*
  Store portal dashboard (scoped to the signed-in employee's store on the server).

  GET /store/dashboard  ->  {
    store, kpis, goodsStatus, tripsPerDay, tripCount, trips,
    loadingSlots, pendingBookings, recentBookings, recentGoods
  }
*/

// Turn an Axios error into a message for the dashboard banner
export function parseDashboardError(err, fallback = "We could not load the dashboard. Check your connection and try again.") {
  const data = err?.response?.data;
  if (data?.message) return data.message;
  if (err?.request && !err?.response) return "Cannot reach the server.";
  return fallback;
}

// Summary for the signed-in store only (store id comes from the JWT, not the request)
export async function getDashboard() {
  try {
    const { data } = await apiClient.get("/store/dashboard");
    return data;
  } catch (err) {
    throw Object.assign(new Error(parseDashboardError(err)), { cause: err });
  }
}
