import apiClient from "./apiClient";

// While the backend is not ready the dashboard shows sample data.
// Set VITE_USE_MOCK=false in your .env file to use the real API.
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";


const mockDashboard = {
  kpis: {
    activeVehicles: 7,
    totalVehicles: 11,
    availableVehicles: 3,
    todayTrips: 14,
    pendingBookings: 5,
    oldestPendingHours: 3,
    delayedTrips: 2,
    completedTrips: 6,
  },
  tripsPerDay: [
    { day: "Mon", onTime: 9, delayed: 1 },
    { day: "Tue", onTime: 11, delayed: 0 },
    { day: "Wed", onTime: 10, delayed: 2 },
    { day: "Thu", onTime: 13, delayed: 1 },
    { day: "Fri", onTime: 12, delayed: 3 },
    { day: "Sat", onTime: 6, delayed: 0 },
    { day: "Sun", onTime: 3, delayed: 0 },
  ],
  fleetStatus: { onTrip: 5, loading: 2, available: 3, maintenance: 1 },
  tripCount: 14,
  trips: [
    { id: "TR-0412", route: "Main Store → Ja-Ela → Kandy", vehicle: "NB-4521", driver: "Kasun Silva", load: 86, nextStop: "10:40", delayMinutes: 0, status: "In transit" },
    { id: "TR-0413", route: "Kandy → Main Store", vehicle: "WP-3308", driver: "Roshan Fernando", load: 64, nextStop: "11:05", delayMinutes: 22, status: "Delayed" },
    { id: "TR-0414", route: "Ja-Ela → Main Store", vehicle: "LB-1190", driver: "M. Jayasuriya", load: 92, nextStop: "Arrived 09:30", delayMinutes: 0, status: "Completed" },
    { id: "TR-0415", route: "Main Store → Kandy", vehicle: "NB-7702", driver: "S. Dias", load: 78, nextStop: "Loading 11:30", delayMinutes: 0, status: "Waiting at store" },
    { id: "TR-0416", route: "Ja-Ela → Kandy", vehicle: "Not assigned", driver: "–", load: 40, nextStop: "–", delayMinutes: 0, status: "Unallocated" },
    { id: "TR-0417", route: "Main Store → Ja-Ela", vehicle: "LB-2204", driver: "N. Herath", load: 55, nextStop: "13:15", delayMinutes: 0, status: "Scheduled" },
  ],
  loadingSlots: [
    { store: "Main Store – Biyagama", booked: 7, total: 12 },
    { store: "Store 2 – Ja-Ela", booked: 5, total: 12 },
    { store: "Store 3 – Kandy", booked: 8, total: 9 },
  ],
  pendingBookings: [
    { id: "BK-1104-0087", route: "Main Store → Kandy", units: 920, requestedFor: "2026-11-05T09:00:00", submittedAt: "2026-11-04T08:12:00", urgent: false },
    { id: "BK-1104-0086", route: "Ja-Ela → Main Store", units: 40, requestedFor: "2026-11-04T14:00:00", submittedAt: "2026-11-04T07:40:00", urgent: true },
    { id: "BK-1104-0088", route: "Main Store → Kandy", units: 400, requestedFor: "2026-11-05T11:00:00", submittedAt: "2026-11-04T09:02:00", urgent: false },
    { id: "BK-1104-0089", route: "Kandy → Main Store", units: 1500, requestedFor: "2026-11-05T08:00:00", submittedAt: "2026-11-04T09:20:00", urgent: false },
    { id: "BK-1104-0090", route: "Ja-Ela → Kandy", units: 2400, requestedFor: "2026-11-05T10:00:00", submittedAt: "2026-11-04T09:41:00", urgent: false },
  ],
};

export async function getDashboard() {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockDashboard;
  }
  const { data } = await apiClient.get("/dashboard");
  return data;
}