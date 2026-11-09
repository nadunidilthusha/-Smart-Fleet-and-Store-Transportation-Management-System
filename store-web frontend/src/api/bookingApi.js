import apiClient from "./apiClient";
import { formatNumber } from "../utils/formatters";


const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const wait = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const BOOKING_STATUSES = [
  "Draft",
  "Pending approval",
  "Approved",
  "Changes requested",
  "Scheduled",
  "In transit",
  "Completed",
  "Cancelled",
  "Rejected",
];
export const EDITABLE_STATUSES = ["Draft", "Pending approval", "Changes requested"];
export const CANCELLABLE_STATUSES = ["Draft", "Pending approval", "Changes requested", "Approved", "Scheduled"];

export const LORRY_CAPACITY = 1200; // units on one lorry
export const NOTES_LIMIT = 250;
export const STORE_HOURS = { open: "06:00", close: "20:00" };

// Small estimate shown while the store fills in the form
export function estimateVehicle(units) {
  if (!(units > 0)) return null;
  if (units <= LORRY_CAPACITY) {
    return { ok: true, text: `Fits one lorry (${formatNumber(LORRY_CAPACITY)} units).` };
  }
  return {
    ok: false,
    text: `Above one lorry (${formatNumber(LORRY_CAPACITY)} units). Reduce it or split into two bookings.`,
  };
}

const mockStores = [
  { id: "main", name: "Main Store – Biyagama" },
  { id: "store-2", name: "Store 2 – Ja-Ela" },
  { id: "store-3", name: "Store 3 – Kandy" },
];

const mockItems = [
  { code: "FG-2210", name: "Packed rice flour 25 kg", unit: "bag" },
  { code: "FG-2205", name: "Packed rice flour 5 kg", unit: "bag" },
  { code: "FG-2305", name: "Coconut oil 1 L", unit: "bottle" },
  { code: "RM-0045", name: "Plastic packaging roll", unit: "roll" },
  { code: "RM-0203", name: "Glass jar 500 ml", unit: "jar" },
];

const line = (code, quantity) => {
  const found = mockItems.find((i) => i.code === code);
  return { code, item: found.name, quantity, unit: found.unit };
};
const total = (items) => items.reduce((sum, i) => sum + i.quantity, 0);

const MAIN = "Main Store – Biyagama";
const JAELA = "Store 2 – Ja-Ela";
const KANDY = "Store 3 – Kandy";

let mockBookings = [
  { id: "BK-1104-0091", pickup: MAIN, destination: KANDY, requestedFor: "2026-11-05T09:00:00", submittedAt: "2026-11-04T08:30:00", priority: "Standard", status: "Pending approval", notes: "", adminNote: "", vehicle: "", driver: "",
    items: [line("FG-2210", 600), line("FG-2305", 320)],
    history: [{ label: "Submitted", at: "2026-11-04T08:30:00" }] },
  { id: "BK-1104-0090", pickup: MAIN, destination: JAELA, requestedFor: "2026-11-05T07:30:00", submittedAt: "2026-11-03T14:10:00", priority: "Standard", status: "Approved", notes: "", adminNote: "", vehicle: "", driver: "",
    items: [line("FG-2305", 900)],
    history: [{ label: "Submitted", at: "2026-11-03T14:10:00" }, { label: "Approved", at: "2026-11-03T16:00:00" }] },
  { id: "BK-1103-0089", pickup: KANDY, destination: MAIN, requestedFor: "2026-11-05T08:00:00", submittedAt: "2026-11-03T15:22:00", priority: "Standard", status: "Changes requested", notes: "", adminNote: "Quantity is above one lorry (1,200 units). Reduce it or split into two bookings.", vehicle: "", driver: "",
    items: [line("FG-2210", 1500)],
    history: [{ label: "Submitted", at: "2026-11-03T15:22:00" }, { label: "Changes requested", at: "2026-11-04T09:10:00" }] },
  { id: "BK-1103-0088", pickup: JAELA, destination: MAIN, requestedFor: "2026-11-04T14:00:00", submittedAt: "2026-11-03T11:40:00", priority: "Urgent", status: "Scheduled", notes: "Call the gate before arrival.", adminNote: "", vehicle: "LB-2204 · 10 ft lorry", driver: "N. Herath",
    items: [line("RM-0045", 40)],
    history: [{ label: "Submitted", at: "2026-11-03T11:40:00" }, { label: "Approved", at: "2026-11-03T12:30:00" }, { label: "Vehicle assigned", at: "2026-11-03T13:05:00" }] },
  { id: "BK-1103-0087", pickup: MAIN, destination: KANDY, requestedFor: "2026-11-04T09:00:00", submittedAt: "2026-11-03T09:15:00", priority: "Standard", status: "In transit", notes: "", adminNote: "", vehicle: "NB-4521 · 14 ft lorry", driver: "Kasun Silva",
    items: [line("FG-2305", 400)],
    history: [{ label: "Submitted", at: "2026-11-03T09:15:00" }, { label: "Approved", at: "2026-11-03T10:00:00" }, { label: "Vehicle assigned", at: "2026-11-03T10:40:00" }, { label: "Loaded and departed", at: "2026-11-04T09:20:00" }] },
  { id: "BK-1102-0086", pickup: MAIN, destination: JAELA, requestedFor: "2026-11-03T08:00:00", submittedAt: "2026-11-02T15:00:00", priority: "Standard", status: "Completed", notes: "", adminNote: "", vehicle: "WP-3308 · 10 ft lorry", driver: "Roshan Fernando",
    items: [line("FG-2210", 250)],
    history: [{ label: "Submitted", at: "2026-11-02T15:00:00" }, { label: "Approved", at: "2026-11-02T16:10:00" }, { label: "Vehicle assigned", at: "2026-11-02T16:30:00" }, { label: "Loaded and departed", at: "2026-11-03T08:15:00" }, { label: "Delivered", at: "2026-11-03T09:40:00" }, { label: "Receipt confirmed", at: "2026-11-03T10:05:00" }] },
  { id: "BK-1102-0085", pickup: KANDY, destination: MAIN, requestedFor: "2026-11-04T11:00:00", submittedAt: "2026-11-02T13:20:00", priority: "Standard", status: "Cancelled", notes: "", adminNote: "", vehicle: "", driver: "",
    items: [line("RM-0203", 1200)],
    history: [{ label: "Submitted", at: "2026-11-02T13:20:00" }, { label: "Cancelled", at: "2026-11-03T08:00:00" }] },
  { id: "BK-1102-0084", pickup: MAIN, destination: JAELA, requestedFor: "2026-11-03T10:00:00", submittedAt: "2026-11-02T10:05:00", priority: "Standard", status: "Rejected", notes: "", adminNote: "No loading slot is free at Ja-Ela at this time.", vehicle: "", driver: "",
    items: [line("FG-2205", 500)],
    history: [{ label: "Submitted", at: "2026-11-02T10:05:00" }, { label: "Rejected", at: "2026-11-02T14:30:00" }] },
].map((b) => ({ ...b, units: total(b.items) }));

let mockCounter = 92;
const copy = (value) => JSON.parse(JSON.stringify(value));

export async function getBookingOptions() {
  if (USE_MOCK) {
    await wait(150);
    return { stores: mockStores, items: mockItems };
  }
  const { data } = await apiClient.get("/store/booking-options");
  return data;
}

export async function getBookings() {
  if (USE_MOCK) {
    await wait();
    return copy(mockBookings);
  }
  const { data } = await apiClient.get("/store/bookings");
  return data;
}

export async function getBooking(id) {
  if (USE_MOCK) {
    await wait(150);
    const found = mockBookings.find((b) => b.id === id);
    if (!found) throw new Error("Booking not found");
    return copy(found);
  }
  const { data } = await apiClient.get(`/store/bookings/${id}`);
  return data;
}

// Create a booking, or edit one when an id is given. draft: true keeps it as a draft.
export async function saveBooking(payload, id) {
  if (USE_MOCK) {
    await wait(500);
    const now = new Date().toISOString();
    const items = payload.items.map((row) => line(row.code, Number(row.quantity)));
    const status = payload.draft ? "Draft" : "Pending approval";

    if (id) {
      let saved = null;
      mockBookings = mockBookings.map((b) => {
        if (b.id !== id) return b;
        const history = payload.draft
          ? b.history
          : [...b.history, { label: b.history.some((h) => h.label === "Submitted") ? "Resubmitted" : "Submitted", at: now }];
        saved = { ...b, ...payload, items, units: total(items), status, history, adminNote: payload.draft ? b.adminNote : "" };
        delete saved.draft;
        return saved;
      });
      return copy(saved);
    }

    const booking = {
      id: `BK-1104-${String(mockCounter++).padStart(4, "0")}`,
      pickup: payload.pickup,
      destination: payload.destination,
      requestedFor: payload.requestedFor,
      submittedAt: now,
      priority: payload.priority,
      status,
      notes: payload.notes ?? "",
      adminNote: "",
      vehicle: "",
      driver: "",
      items,
      units: total(items),
      history: [{ label: payload.draft ? "Draft saved" : "Submitted", at: now }],
    };
    mockBookings = [booking, ...mockBookings];
    return copy(booking);
  }
  const { data } = id
    ? await apiClient.put(`/store/bookings/${id}`, payload)
    : await apiClient.post("/store/bookings", payload);
  return data;
}

export async function cancelBooking(id) {
  if (USE_MOCK) {
    await wait(400);
    mockBookings = mockBookings.map((b) =>
      b.id === id
        ? { ...b, status: "Cancelled", history: [...b.history, { label: "Cancelled", at: new Date().toISOString() }] }
        : b
    );
    return { id, status: "Cancelled" };
  }
  const { data } = await apiClient.patch(`/store/bookings/${id}/cancel`);
  return data;
}