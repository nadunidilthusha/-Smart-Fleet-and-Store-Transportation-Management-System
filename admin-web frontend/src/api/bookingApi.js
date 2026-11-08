import apiClient from "./apiClient";
import { getItems } from "./itemApi";
import { formatNumber } from "../utils/formatters";

// While the backend is not ready the bookings screens use sample data.
// Set VITE_USE_MOCK=false in your .env file to use the real API.
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const wait = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const BOOKING_STATUSES = ["Pending", "Approved", "Changes requested", "Rejected"];

// Vehicle sizes used for the "Fits a ..." suggestion
export const VEHICLE_TYPES = [
  { name: "10 ft lorry", capacity: 1200 },
  { name: "14 ft lorry", capacity: 2000 },
];
export const MAX_UNITS = 2000;

export function suggestVehicle(units) {
  if (!(units > 0)) return null;
  const vehicle = VEHICLE_TYPES.find((v) => units <= v.capacity);
  if (vehicle) {
    return {
      fits: true,
      text: `Fits a ${vehicle.name} (${formatNumber(vehicle.capacity)} units). Capacity and slot rules are checked again on the server before allocation.`,
    };
  }
  return {
    fits: false,
    text: `More than ${formatNumber(MAX_UNITS)} units. This needs more than one vehicle, so trip planning may split it. Capacity and slot rules are checked again on the server.`,
  };
}

/*
  GET /bookings  ->  response shape the Bookings page expects:
  {
    bookings: [{ id, pickup, destination, requestedFor, submittedAt, requestedBy,
                 units, priority, status, notes, comment,
                 items: [{ code, item, quantity, unit }] }],
    summary: { pending, approved, changesRequested, rejected, all,
               pendingUnits, oldestPendingHours }
  }

  POST  /bookings              body { pickup, destination, requestedFor, priority, items:[{code, quantity}], notes, requestedBy }
  PATCH /bookings/:id/status   body { status, comment }   (status: Approved | Changes requested | Rejected)
*/
let mockBookings = [
  { id: "BK-1104-0087", pickup: "Main Store – Biyagama", destination: "Store 3 – Kandy", requestedFor: "2026-11-05T09:00:00", submittedAt: "2026-11-04T08:12:00", requestedBy: "N. Perera", units: 920, priority: "Standard", status: "Pending", notes: "", comment: "", items: [{ code: "FG-2210", item: "Packed rice flour 25 kg", quantity: 920, unit: "bag" }] },
  { id: "BK-1104-0086", pickup: "Store 2 – Ja-Ela", destination: "Main Store – Biyagama", requestedFor: "2026-11-04T14:00:00", submittedAt: "2026-11-04T07:40:00", requestedBy: "T. Rajapaksa", units: 40, priority: "Urgent", status: "Pending", notes: "", comment: "", items: [{ code: "RM-0045", item: "Plastic packaging roll", quantity: 40, unit: "roll" }] },
  { id: "BK-1104-0088", pickup: "Main Store – Biyagama", destination: "Store 3 – Kandy", requestedFor: "2026-11-05T11:00:00", submittedAt: "2026-11-04T09:02:00", requestedBy: "N. Perera", units: 400, priority: "Standard", status: "Pending", notes: "", comment: "", items: [{ code: "FG-2305", item: "Coconut oil 1 L", quantity: 400, unit: "bottle" }] },
  { id: "BK-1104-0089", pickup: "Store 3 – Kandy", destination: "Main Store – Biyagama", requestedFor: "2026-11-05T08:00:00", submittedAt: "2026-11-04T09:20:00", requestedBy: "R. Bandara", units: 1500, priority: "Standard", status: "Pending", notes: "", comment: "", items: [{ code: "RM-0112", item: "Cardboard carton 5-ply", quantity: 1500, unit: "box" }] },
  { id: "BK-1104-0090", pickup: "Store 2 – Ja-Ela", destination: "Store 3 – Kandy", requestedFor: "2026-11-05T10:00:00", submittedAt: "2026-11-04T09:41:00", requestedBy: "T. Rajapaksa", units: 2400, priority: "Standard", status: "Pending", notes: "", comment: "", items: [{ code: "FG-2418", item: "Tea leaves 500 g", quantity: 2400, unit: "pack" }] },
  { id: "BK-1104-0085", pickup: "Main Store – Biyagama", destination: "Store 2 – Ja-Ela", requestedFor: "2026-11-05T07:30:00", submittedAt: "2026-11-03T16:10:00", requestedBy: "N. Perera", units: 900, priority: "Standard", status: "Approved", notes: "", comment: "", items: [{ code: "FG-2210", item: "Packed rice flour 25 kg", quantity: 900, unit: "bag" }] },
  { id: "BK-1104-0084", pickup: "Store 3 – Kandy", destination: "Store 2 – Ja-Ela", requestedFor: "2026-11-05T13:00:00", submittedAt: "2026-11-03T15:30:00", requestedBy: "R. Bandara", units: 500, priority: "Standard", status: "Approved", notes: "", comment: "", items: [{ code: "FG-2305", item: "Coconut oil 1 L", quantity: 500, unit: "bottle" }] },
  { id: "BK-1103-0081", pickup: "Store 3 – Kandy", destination: "Main Store – Biyagama", requestedFor: "2026-11-04T16:00:00", submittedAt: "2026-11-03T11:05:00", requestedBy: "R. Bandara", units: 1500, priority: "Standard", status: "Changes requested", notes: "", comment: "Please split this into two loads and confirm the pickup time.", items: [{ code: "RM-0112", item: "Cardboard carton 5-ply", quantity: 1500, unit: "box" }] },
  { id: "BK-1103-0079", pickup: "Store 2 – Ja-Ela", destination: "Store 3 – Kandy", requestedFor: "2026-11-04T10:00:00", submittedAt: "2026-11-03T09:20:00", requestedBy: "T. Rajapaksa", units: 2400, priority: "Standard", status: "Rejected", notes: "", comment: "No loading slot is free at Ja-Ela at this time.", items: [{ code: "FG-2418", item: "Tea leaves 500 g", quantity: 2400, unit: "pack" }] },
];
let mockCounter = 91;

// Sample data is dated 4 Nov, so "oldest waiting" is counted from that morning
const MOCK_NOW = new Date("2026-11-04T10:40:00").getTime();

function buildSummary(list, nowMs) {
  const pending = list.filter((b) => b.status === "Pending");
  const oldest = Math.min(...pending.map((b) => new Date(b.submittedAt).getTime()));
  return {
    pending: pending.length,
    approved: list.filter((b) => b.status === "Approved").length,
    changesRequested: list.filter((b) => b.status === "Changes requested").length,
    rejected: list.filter((b) => b.status === "Rejected").length,
    all: list.length,
    pendingUnits: pending.reduce((sum, b) => sum + b.units, 0),
    oldestPendingHours: pending.length ? Math.max(0, Math.round((nowMs - oldest) / 36e5)) : 0,
  };
}

export async function getBookings() {
  if (USE_MOCK) {
    await wait();
    const bookings = JSON.parse(JSON.stringify(mockBookings));
    return { bookings, summary: buildSummary(bookings, MOCK_NOW) };
  }
  const { data } = await apiClient.get("/bookings");
  return data;
}

export async function updateBookingStatus(id, status, comment = "") {
  if (USE_MOCK) {
    await wait(400);
    mockBookings = mockBookings.map((b) => (b.id === id ? { ...b, status, comment } : b));
    return { id, status };
  }
  const { data } = await apiClient.patch(`/bookings/${id}/status`, { status, comment });
  return data;
}

export async function createBooking(payload) {
  if (USE_MOCK) {
    await wait(500);
    const catalog = await getItems();
    const items = payload.items.map((row) => {
      const found = catalog.find((c) => c.code === row.code);
      return { code: row.code, item: found?.name ?? row.code, quantity: Number(row.quantity), unit: found?.unit ?? "unit" };
    });
    const booking = {
      id: `BK-1104-${String(mockCounter++).padStart(4, "0")}`,
      pickup: payload.pickup,
      destination: payload.destination,
      requestedFor: payload.requestedFor,
      submittedAt: new Date().toISOString(),
      requestedBy: payload.requestedBy ?? "",
      units: items.reduce((sum, i) => sum + i.quantity, 0),
      priority: payload.priority,
      status: "Pending",
      notes: payload.notes ?? "",
      comment: "",
      items,
    };
    mockBookings = [booking, ...mockBookings];
    return booking;
  }
  const { data } = await apiClient.post("/bookings", payload);
  return data;
}