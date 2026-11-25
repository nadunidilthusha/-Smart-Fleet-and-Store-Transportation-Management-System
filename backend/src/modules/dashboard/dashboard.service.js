import Booking from "../bookings/bookings.model.js";
import Trip from "../trips/trips.model.js";
import Vehicle from "../vehicles/vehicles.model.js";
import LoadingSlot from "../schedule/schedule.model.js";
import Store from "../stores/stores.model.js";
import GoodsConfirmation from "../confirmation/confirmation.model.js";
import ApiError from "../../utils/ApiError.js";

const TRIP_DATE_FIELD = "createdAt";

const TRIP_LIST_LIMIT = 20; // rows in the Today's trips table
const PENDING_LIST_LIMIT = 10; // rows in the Bookings awaiting approval table
const RECENT_LIMIT = 8; // recent bookings / goods activity lists on the store dashboard
const DELAYED_AFTER_MINUTES = 15; // "Over 15 min late"
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ACTIVE_TRIP = ["Scheduled", "In transit", "Delayed"]; // trips still running for this store

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

/* =====================================================================
   Store portal dashboard (limited to req.user.storeId — never from the client body)
   ===================================================================== */

function requireStoreId(user) {
  if (!user?.storeId) throw ApiError.forbidden("Your account is not assigned to a store.");
  return String(user.storeId);
}

// Sum of discrepancy units across every item line of a confirmation
const discrepancyUnits = (conf) =>
  (conf.lines ?? []).reduce((sum, line) => sum + (line.missing ?? 0) + (line.excess ?? 0) + (line.damaged ?? 0) + (line.incorrect ?? 0), 0);

// GET /api/store/dashboard -> KPIs, trips, slots, bookings and goods activity for the signed-in store only
export async function getStoreDashboard(user) {
  const storeId = requireStoreId(user);
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const weekStart = addDays(today, -6);

  // Bookings and confirmations that belong to this store (pickup or destination / sending or receiving)
  const bookingForStore = { $or: [{ pickup: storeId }, { destination: storeId }] };
  const confForStore = { $or: [{ store: storeId }, { pickupStore: storeId }], status: { $ne: "cancelled" } };
  const tripForStore = { "stops.store": storeId };

  const [
    store,
    totalBookings,
    pendingCount,
    pendingDocs,
    approvedCount,
    completedBookingCount,
    hubVehicles,
    availableVehicles,
    weekTrips,
    todayTripDocs,
    activeTripCount,
    slots,
    recentBookingDocs,
    confDocs,
    recentConfDocs,
  ] = await Promise.all([
    Store.findById(storeId).select("name shortName code").lean(),
    Booking.countDocuments({ ...bookingForStore, status: { $nin: ["Draft", "Cancelled"] } }),
    Booking.countDocuments({ pickup: storeId, status: "Pending" }), // this store submitted; waiting for admin
    Booking.find({ pickup: storeId, status: "Pending" })
      .sort({ submittedAt: 1 })
      .limit(PENDING_LIST_LIMIT)
      .populate("pickup", "name")
      .populate("destination", "name")
      .lean(),
    Booking.countDocuments({ ...bookingForStore, status: "Approved" }),
    Booking.countDocuments({ ...bookingForStore, status: "Completed" }),
    Vehicle.countDocuments({ hub: storeId, isDraft: { $ne: true }, status: { $ne: "Inactive" } }),
    Vehicle.countDocuments({ hub: storeId, isDraft: { $ne: true }, status: "Available" }),
    Trip.find({ ...tripForStore, [TRIP_DATE_FIELD]: { $gte: weekStart, $lt: tomorrow } })
      .select(`status delayMinutes ${TRIP_DATE_FIELD}`)
      .lean(),
    Trip.find({ ...tripForStore, [TRIP_DATE_FIELD]: { $gte: today, $lt: tomorrow } })
      .sort({ code: 1 })
      .limit(TRIP_LIST_LIMIT)
      .populate("vehicle", "plate")
      .populate("driver", "name")
      .lean(),
    Trip.countDocuments({ ...tripForStore, status: { $in: ACTIVE_TRIP } }),
    LoadingSlot.find({ store: storeId, date: dateKey(now) }).populate("store", "name").lean(),
    Booking.find({ ...bookingForStore, status: { $ne: "Draft" } })
      .sort({ updatedAt: -1 })
      .limit(RECENT_LIMIT)
      .populate("pickup", "name")
      .populate("destination", "name")
      .lean(),
    // Live goods confirmations for queue-style KPI counts
    GoodsConfirmation.find(confForStore).select("status pickupStore store lines stages history updatedAt").lean(),
    GoodsConfirmation.find(confForStore)
      .sort({ updatedAt: -1 })
      .limit(RECENT_LIMIT)
      .populate("booking", "code")
      .populate("trip", "code")
      .lean(),
  ]);

  if (!store) throw ApiError.forbidden("Your account is not assigned to a store.");

  // Approved outbound bookings that still need preparation (no live confirmation past draft, or none at all)
  const outboundApproved = await Booking.find({ pickup: storeId, status: "Approved" }).select("_id").lean();
  const outboundIds = outboundApproved.map((b) => String(b._id));
  const confByBooking = new Map(confDocs.map((c) => [String(c.booking), c]));

  let goodsToPrepare = 0;
  let goodsAwaitingHandover = 0;
  let goodsHandedOver = 0; // outbound handed over (this store as sender)
  let goodsReceiving = 0; // inbound waiting for receipt (this store as receiver)
  let goodsReceived = 0;
  let discrepancies = 0;

  for (const id of outboundIds) {
    const conf = confByBooking.get(id);
    if (!conf || conf.status === "draft" || !conf.stages?.prepared?.confirmed) goodsToPrepare += 1;
    else if (conf.status === "prepared") goodsAwaitingHandover += 1;
    else if (conf.status === "handed_over") goodsHandedOver += 1;
  }

  for (const conf of confDocs) {
    discrepancies += discrepancyUnits(conf);
    if (String(conf.store) === storeId) {
      if (conf.status === "handed_over") goodsReceiving += 1;
      if (conf.status === "confirmed") goodsReceived += 1;
    }
    // Sender-side prepared/handed_over already counted from outboundApproved; still count prepared status from docs if booking filter missed
    if (String(conf.pickupStore) === storeId && conf.status === "prepared" && !outboundIds.includes(String(conf.booking))) {
      goodsAwaitingHandover += 1;
    }
  }

  const outstandingConfirmations = goodsToPrepare + goodsAwaitingHandover + goodsReceiving;

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

  // Loading slots for this store only (one row for the day)
  const storeName = store.name;
  const loadingSlots = slots.length
    ? [
        {
          store: storeName,
          booked: slots.filter((s) => s.status !== "Available").length,
          total: slots.length,
        },
      ]
    : [{ store: storeName, booked: 0, total: 0 }];

  const oldestPending = pendingDocs[0]?.submittedAt;
  const pendingBookings = pendingDocs.map((b) => ({
    id: b.code,
    route: `${shortStore(b.pickup?.name)} → ${shortStore(b.destination?.name)}`,
    units: (b.items ?? []).reduce((sum, line) => sum + line.quantity, 0),
    requestedFor: b.requestedFor,
    submittedAt: b.submittedAt,
    urgent: b.priority === "Urgent",
  }));

  const recentBookings = recentBookingDocs.map((b) => ({
    id: b.code,
    route: `${shortStore(b.pickup?.name)} → ${shortStore(b.destination?.name)}`,
    status: b.status,
    units: (b.items ?? []).reduce((sum, line) => sum + line.quantity, 0),
    requestedFor: b.requestedFor,
    updatedAt: b.updatedAt,
    urgent: b.priority === "Urgent",
  }));

  // Latest confirmation step (from history) for the recent activity list
  const recentGoods = recentConfDocs.map((c) => {
    const last = [...(c.history ?? [])].reverse().find((h) => h.action === "confirmed" || h.action === "cancelled") ?? c.history?.[c.history.length - 1];
    return {
      id: c.booking?.code ?? String(c._id),
      trip: c.trip?.code ?? "",
      status: c.status,
      action: last?.action ?? "updated",
      stage: last?.stage ?? "",
      by: last?.byName ?? "",
      at: last?.at ?? c.updatedAt,
      discrepancies: discrepancyUnits(c),
      role: String(c.pickupStore) === storeId ? "sender" : "receiver",
    };
  });

  return {
    store: { id: String(store._id), code: store.code, name: store.name, shortName: store.shortName || store.name },
    kpis: {
      totalBookings,
      pendingBookings: pendingCount,
      approvedBookings: approvedCount,
      completedBookings: completedBookingCount,
      oldestPendingHours: oldestPending ? Math.max(0, Math.round((now - new Date(oldestPending)) / 36e5)) : 0,
      todayTrips: todayTrips.length,
      activeTrips: activeTripCount,
      delayedTrips: todayTrips.filter(isDelayed).length,
      completedTrips: todayTrips.filter((t) => t.status === "Completed").length,
      hubVehicles,
      availableVehicles,
      goodsToPrepare,
      goodsAwaitingHandover,
      goodsHandedOver,
      goodsReceiving,
      goodsReceived,
      outstandingConfirmations,
      discrepancies,
    },
    // Goods queue breakdown for the status card (replaces fleet status on the store dashboard)
    goodsStatus: {
      toPrepare: goodsToPrepare,
      handover: goodsAwaitingHandover,
      receiving: goodsReceiving,
      handedOver: goodsHandedOver,
      received: goodsReceived,
    },
    tripsPerDay,
    tripCount: todayTrips.length,
    trips,
    loadingSlots,
    pendingBookings,
    recentBookings,
    recentGoods,
  };
}