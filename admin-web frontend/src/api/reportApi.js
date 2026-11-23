import apiClient from "./apiClient";

// While the backend is not ready the reports use sample data.
// Set VITE_USE_MOCK=false in your .env file to use the real API.
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const wait = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

// Small seeded random so the sample data looks the same on every reload
function seeded(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STORES = [
  { id: "S1", name: "Main Store – Biyagama", short: "Biyagama" },
  { id: "S2", name: "Store 2 – Ja-Ela", short: "Ja-Ela" },
  { id: "S3", name: "Store 3 – Kandy", short: "Kandy" },
  { id: "S4", name: "Store 4 – Galle", short: "Galle" },
];

const VEHICLES = [
  { id: "V1", reg: "NB-4521", type: "14 ft lorry", capacity: 2000 },
  { id: "V2", reg: "WP-3308", type: "14 ft lorry", capacity: 2000 },
  { id: "V3", reg: "LB-1190", type: "10 ft lorry", capacity: 1200 },
  { id: "V4", reg: "NB-7702", type: "14 ft lorry", capacity: 2000 },
  { id: "V5", reg: "LB-2204", type: "10 ft lorry", capacity: 1200 },
  { id: "V6", reg: "WP-5120", type: "10 ft lorry", capacity: 1200 },
];

const DRIVERS = ["Kasun Silva", "Roshan Fernando", "M. Jayasuriya", "S. Dias", "N. Herath", "Ruwan Perera"];
const ITEMS = ["Rice 5 kg bag", "Sugar 1 kg pack", "Cooking oil 1 L", "Dhal 1 kg pack", "Tea 400 g box", "Detergent 500 g"];
const REASONS = ["Traffic congestion", "Loading delay", "Vehicle breakdown", "Weather", "Road closure"];
const DAY = 24 * 3600 * 1000;

function buildMock() {
  const rand = seeded(1104);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const now = Date.now();

  // Trips spread over the last 45 days
  const trips = Array.from({ length: 62 }, (_, i) => {
    const vehicle = pick(VEHICLES);
    const first = Math.floor(rand() * STORES.length);
    const stopCount = rand() < 0.32 ? 3 : 2;
    const stops = Array.from({ length: stopCount }, (_, k) => STORES[(first + k) % STORES.length].id);
    const date = new Date(now - rand() * 45 * DAY);
    date.setHours(6 + Math.floor(rand() * 10), rand() < 0.5 ? 0 : 30, 0, 0);

    const r = rand();
    const old = now - date.getTime() > DAY;
    const status = r < 0.1 ? "Cancelled" : old ? (r < 0.3 ? "Delayed" : "Completed") : r < 0.5 ? "In Progress" : "Planned";
    const late = status === "Delayed" || (status === "Completed" && rand() < 0.12);
    const distanceKm = 25 + Math.floor(rand() * 120);

    return {
      id: `TR-${String(400 + i).padStart(4, "0")}`,
      date: date.toISOString(),
      vehicleId: vehicle.id,
      driver: pick(DRIVERS),
      stops,
      status,
      qty: Math.round((vehicle.capacity * (0.25 + rand() * 0.7)) / 10) * 10,
      distanceKm,
      durationMin: Math.round(distanceKm * 1.6 + 20),
      delayMins: late ? 15 + Math.floor(rand() * 75) : Math.floor(rand() * 10),
      delayReason: late ? pick(REASONS) : "",
    };
  });

  // Bookings spread over the same period
  const bookings = Array.from({ length: 103 }, (_, i) => {
    const from = pick(STORES);
    const to = pick(STORES.filter((s) => s.id !== from.id));
    const date = new Date(now - rand() * 45 * DAY);
    date.setHours(7 + Math.floor(rand() * 9), 0, 0, 0);

    const trip = rand() < 0.75 ? pick(trips) : null;
    const status = trip
      ? { Completed: "Completed", Delayed: "Delayed", Cancelled: "Cancelled", "In Progress": "In Transit", Planned: "Scheduled" }[trip.status]
      : rand() < 0.5 ? "Pending" : "Approved";

    return {
      id: `BK-${String(1000 + i).padStart(4, "0")}`,
      date: date.toISOString(),
      from: from.id,
      to: to.id,
      item: pick(ITEMS),
      qty: (1 + Math.floor(rand() * 20)) * 50,
      status,
      vehicleId: trip ? trip.vehicleId : null,
      tripId: trip ? trip.id : null,
    };
  });

  return { stores: STORES, vehicles: VEHICLES, trips, bookings };
}

/*
  GET /reports/data  ->  response shape the Reports page expects:
  {
    stores:   [{ id, name, short }],
    vehicles: [{ id, reg, type, capacity }],
    trips:    [{ id, date, vehicleId, driver, stops: [storeId], status, qty,
                 distanceKm, durationMin, delayMins, delayReason }],
    bookings: [{ id, date, from, to, item, qty, status, vehicleId, tripId }]
  }
*/
export async function getReportData() {
  if (USE_MOCK) {
    await wait();
    return buildMock();
  }
  const { data } = await apiClient.get("/reports/data");
  return data;
}
