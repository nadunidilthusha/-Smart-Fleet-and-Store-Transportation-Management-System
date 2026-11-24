import Booking from "../bookings/bookings.model.js";
import Trip from "../trips/trips.model.js";
import Vehicle from "../vehicles/vehicles.model.js";
import LoadingSlot from "../schedule/schedule.model.js";


const TRIP_DATE_FIELD = "createdAt";

const TRIP_LIST_LIMIT = 20; // rows in the Today's trips table
const PENDING_LIST_LIMIT = 10; // rows in the Bookings awaiting approval table
const DELAYED_AFTER_MINUTES = 15; // "Over 15 min late"
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (n) => String(n).padStart(2, "0");
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; // 2026-11-05
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// "Main Store – Biyagama" -> "Main Store", "Store 3 – Kandy" -> "Kandy"
function shortStore(name = "") {
  const [first, second] = name.split(" – ");
  return first === "Main Store" ? first : second ?? first;
}

const isDelayed = (trip) => trip.status === "Delayed" || (trip.delayMinutes ?? 0) > DELAYED_AFTER_MINUTES;

// GET /api/dashboard -> everything the admin Dashboard page shows
export async function getDashboard() {
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const weekStart = addDays(today, -6);

  const [
    totalVehicles,
    availableVehicles,
    inUseVehicles,
    maintenanceVehicles,
    onTripVehicleIds,
    weekTrips,
    todayTripDocs,
    pendingCount,
    pendingDocs,
    slots,
  ] = await Promise.all([
    Vehicle.countDocuments({ status: { $ne: "Inactive" } }),
    Vehicle.countDocuments({ status: "Available" }),
    Vehicle.countDocuments({ status: "In Use" }),
    Vehicle.countDocuments({ status: "Maintenance" }),
    // vehicles that are driving right now
    Trip.distinct("vehicle", { status: { $in: ["In transit", "Delayed"] }, vehicle: { $ne: null } }),
    // last 7 days, only the fields needed for the chart and the KPI numbers
    Trip.find({ [TRIP_DATE_FIELD]: { $gte: weekStart, $lt: tomorrow } })
      .select(`status delayMinutes ${TRIP_DATE_FIELD}`)
      .lean(),
    // today's trips with vehicle and driver names for the table
    Trip.find({ [TRIP_DATE_FIELD]: { $gte: today, $lt: tomorrow } })
      .sort({ code: 1 })
      .limit(TRIP_LIST_LIMIT)
      .populate("vehicle", "plate")
      .populate("driver", "name")
      .lean(),
    Booking.countDocuments({ status: "Pending" }),
    Booking.find({ status: "Pending" })
      .sort({ submittedAt: 1 })
      .limit(PENDING_LIST_LIMIT)
      .populate("pickup", "name")
      .populate("destination", "name")
      .lean(),
    LoadingSlot.find({ date: dateKey(now) }).populate("store", "name").lean(),
  ]);

  /* ---- Fleet status ---- */
  const onTrip = onTripVehicleIds.length;
  const loading = Math.max(inUseVehicles - onTrip, 0); // in use, but still at a store
  const fleetStatus = {
    onTrip,
    loading,
    available: availableVehicles,
    maintenance: maintenanceVehicles,
  };

  /* ---- Trips ---- */
  const todayTrips = weekTrips.filter((t) => t[TRIP_DATE_FIELD] >= today);

  const tripsPerDay = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    const next = addDays(day, 1);
    const trips = weekTrips.filter((t) => t[TRIP_DATE_FIELD] >= day && t[TRIP_DATE_FIELD] < next);
    const delayed = trips.filter(isDelayed).length;
    return { day: WEEKDAYS[day.getDay()], onTime: trips.length - delayed, delayed };
  });

  const trips = todayTripDocs.map((t) => ({
    id: t.code,
    route: t.route ?? "",
    vehicle: t.vehicle?.plate ?? "Not assigned",
    driver: t.driver?.name ?? "–",
    load: t.load ?? 0,
    nextStop: t.nextStop || "–",
    delayMinutes: t.delayMinutes ?? 0,
    status: t.status,
  }));

  /* ---- Loading slots (booked / total today, per store) ---- */
  const byStore = new Map();
  for (const slot of slots) {
    if (!slot.store) continue;
    const key = String(slot.store._id);
    const row = byStore.get(key) ?? { store: slot.store.name, booked: 0, total: 0 };
    row.total += 1;
    if (slot.status !== "Available") row.booked += 1;
    byStore.set(key, row);
  }
  const loadingSlots = [...byStore.values()].sort((a, b) => a.store.localeCompare(b.store));

  /* ---- Bookings awaiting approval ---- */
  const oldestPending = pendingDocs[0]?.submittedAt;
  const pendingBookings = pendingDocs.map((b) => ({
    id: b.code,
    route: `${shortStore(b.pickup?.name)} → ${shortStore(b.destination?.name)}`,
    units: (b.items ?? []).reduce((sum, line) => sum + line.quantity, 0),
    requestedFor: b.requestedFor,
    submittedAt: b.submittedAt,
    urgent: b.priority === "Urgent",
  }));

  return {
    kpis: {
      activeVehicles: onTrip + loading,
      totalVehicles,
      availableVehicles,
      todayTrips: todayTrips.length,
      pendingBookings: pendingCount,
      oldestPendingHours: oldestPending ? Math.max(0, Math.round((now - new Date(oldestPending)) / 36e5)) : 0,
      delayedTrips: todayTrips.filter(isDelayed).length,
      completedTrips: todayTrips.filter((t) => t.status === "Completed").length,
    },
    tripsPerDay,
    fleetStatus,
    tripCount: todayTrips.length,
    trips,
    loadingSlots,
    pendingBookings,
  };
}