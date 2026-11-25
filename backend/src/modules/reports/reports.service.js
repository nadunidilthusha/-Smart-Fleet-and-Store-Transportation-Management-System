import Booking from "../bookings/bookings.model.js";
import Trip from "../trips/trips.model.js";
import Vehicle from "../vehicles/vehicles.model.js";
import Store from "../stores/stores.model.js";
import Item from "../items/items.model.js";
import User from "../users/users.model.js";
import GoodsConfirmation from "../confirmation/confirmation.model.js";
import AuditLog from "../audit/audit.model.js";
import { ACCESS_ACTIONS, DATA_ACTIONS, buildAuditFilter, listAuditFilters, listAuditLogs, record } from "../audit/audit.service.js";
import { ACTIVE_TRIP_STATUSES } from "../trips/trips.service.js";
import { VEHICLE_STATUSES } from "../../config/constants.js";
import {
  DELAYED_AFTER_MINUTES,
  buildTrend,
  dateFilter,
  firstOr0,
  pageStages,
  reportResult,
  textMatch,
  timezoneName,
  trendGroup,
} from "./reports.helpers.js";

// Business logic and database access for reports lives here.
// Controllers call these functions. Keep req and res out of this file.
// Every report reads the existing collections with MongoDB aggregations and returns the same shape:
//   { type, rows, total, page, limit, kpis: [{ label, value, foot }], breakdown, trend }

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const kpi = (label, value, foot = "") => ({ label, value, foot });
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// $lookup by _id, and "first value of a looked-up list or empty text"
const join = (Model, localField, as) => ({ $lookup: { from: Model.collection.name, localField, foreignField: "_id", as } });
const first = (path) => ({ $ifNull: [{ $arrayElemAt: [path, 0] }, ""] });

// Search box: the text must appear in one of these (already computed) fields
const searchStage = (q, fields) => (q ? [{ $match: { $or: fields.map((field) => ({ [field]: textMatch(q) })) } }] : []);

// Result of the $facet stage: total rows and "count per group" lists
const totalOf = (out) => out.total[0]?.n ?? 0;
const countMap = (groups) => Object.fromEntries(groups.map(({ _id, n }) => [_id, n]));
const pairs = (groups, label = "_id") => groups.map((g) => [g[label] || "–", g.n]);

// A trip is late when it is flagged Delayed or is more than 15 minutes behind (same rule as the Dashboard)
const LATE = { $or: [{ $eq: ["$status", "Delayed"] }, { $gt: ["$delayMinutes", DELAYED_AFTER_MINUTES] }] };

// The store and vehicle filters arrive as codes; a code that does not exist matches nothing
const NONE = { $in: [] };
async function resolveFilters({ store, vehicle }) {
  const [storeDoc, vehicleDoc] = await Promise.all([
    store ? Store.findOne({ code: store }).select("_id").lean() : null,
    vehicle ? Vehicle.findOne({ code: vehicle }).select("_id").lean() : null,
  ]);
  return {
    storeId: store ? (storeDoc?._id ?? NONE) : undefined,
    vehicleId: vehicle ? (vehicleDoc?._id ?? NONE) : undefined,
  };
}

/* ---------------------------------------------------------------------
   Chart series (the "per day" chart above every report)
   --------------------------------------------------------------------- */
const TRIP_SERIES = [
  { key: "completed", label: "Completed", color: "#16a34a", values: ["Completed"] },
  { key: "active", label: "Scheduled / in transit", color: "#a855f7", values: ["Scheduled", "In transit"] },
  { key: "delayed", label: "Delayed", color: "#d97706", values: ["Delayed"] },
  { key: "unallocated", label: "Unallocated", color: "#94a3b8", values: ["Unallocated"] },
];
const BOOKING_SERIES = [
  { key: "pending", label: "Pending", color: "#94a3b8", values: ["Pending", "Changes requested"] },
  { key: "approved", label: "Approved", color: "#3b82f6", values: ["Approved"] },
  { key: "completed", label: "Completed", color: "#16a34a", values: ["Completed"] },
  { key: "declined", label: "Rejected / cancelled", color: "#ef4444", values: ["Rejected", "Cancelled"] },
];
const GOODS_SERIES = [
  { key: "received", label: "Received", color: "#16a34a", values: ["confirmed"] },
  { key: "handedOver", label: "Handed over", color: "#3b82f6", values: ["handed_over"] },
  { key: "prepared", label: "Prepared", color: "#a855f7", values: ["prepared"] },
  { key: "draft", label: "In progress", color: "#d97706", values: ["draft"] },
  { key: "cancelled", label: "Cancelled", color: "#94a3b8", values: ["cancelled"] },
];
const AUDIT_SERIES = [
  { key: "data", label: "Data changes", color: "#3b82f6", values: DATA_ACTIONS },
  { key: "signin", label: "Sign-ins", color: "#16a34a", values: ["LOGIN", "LOGOUT"] },
  { key: "failed", label: "Failed sign-ins", color: "#ef4444", values: ["LOGIN_FAILED"] },
  { key: "access", label: "Access changes", color: "#a855f7", values: ACCESS_ACTIONS },
];
const ITEM_SERIES = [
  { key: "completed", label: "Completed", color: "#16a34a", values: ["Completed"] },
  { key: "active", label: "Pending / approved", color: "#3b82f6", values: ["Pending", "Approved", "Changes requested"] },
  { key: "declined", label: "Rejected / cancelled", color: "#ef4444", values: ["Rejected", "Cancelled"] },
];

// Trips per day, used by the vehicle and store reports
async function tripTrend(query, extraMatch, title) {
  const rows = await Trip.aggregate([
    { $match: { ...dateFilter("createdAt", query), ...extraMatch } },
    trendGroup({ dateField: "createdAt", groupField: "status", series: TRIP_SERIES, timezone: timezoneName(query.tz) }),
  ]);
  return buildTrend({ rows, series: TRIP_SERIES, from: query.from, to: query.to, tzOffset: query.tz, title, sub: "Trips by status" });
}

/* =====================================================================
   1. BOOKINGS   details, status and history
   ===================================================================== */
const BOOKING_SORT = { date: "requestedFor", id: "code", pickup: "pickupName", destination: "destinationName", units: "units", status: "status", priority: "priority", trip: "tripCode" };

async function bookingsReport(query) {
  const { storeId, vehicleId } = await resolveFilters(query);
  const match = { status: { $ne: "Draft" }, ...dateFilter("requestedFor", query) };
  if (query.status) match.status = query.status === "Draft" ? NONE : query.status;
  if (storeId) match.$or = [{ pickup: storeId }, { destination: storeId }];

  const [out] = await Booking.aggregate([
    { $match: match },
    join(Store, "pickup", "pk"),
    join(Store, "destination", "dst"),
    join(User, "requestedBy", "usr"),
    { $lookup: { from: Trip.collection.name, localField: "_id", foreignField: "bookings", as: "tr" } },
    { $addFields: { vehicleRef: { $ifNull: ["$vehicle", { $arrayElemAt: ["$tr.vehicle", 0] }] } } },
    join(Vehicle, "vehicleRef", "veh"),
    {
      $addFields: {
        pickupName: first("$pk.name"),
        destinationName: first("$dst.name"),
        requestedByName: first("$usr.name"),
        vehiclePlate: first("$veh.plate"),
        tripCode: first("$tr.code"),
        units: { $sum: "$items.quantity" },
      },
    },
    ...(vehicleId ? [{ $match: { vehicleRef: vehicleId } }] : []),
    ...searchStage(query.q, ["code", "pickupName", "destinationName", "vehiclePlate", "tripCode", "requestedByName"]),
    {
      $facet: {
        rows: [
          ...pageStages({ sortField: BOOKING_SORT[query.sort] ?? "requestedFor", dir: query.dir, page: query.page, limit: query.limit }),
          join(Item, "items.item", "itemDocs"),
          { $project: { pk: 0, dst: 0, usr: 0, veh: 0, tr: 0 } },
        ],
        total: [{ $count: "n" }],
        byStatus: [{ $group: { _id: "$status", n: { $sum: 1 } } }],
        units: [{ $group: { _id: null, n: { $sum: "$units" } } }],
        trend: [trendGroup({ dateField: "requestedFor", groupField: "status", series: BOOKING_SERIES, timezone: timezoneName(query.tz) })],
      },
    },
  ]);

  const total = totalOf(out);
  const by = countMap(out.byStatus);
  const rows = out.rows.map((b) => ({
    id: b.code,
    date: b.requestedFor,
    submittedAt: b.submittedAt,
    pickup: b.pickupName,
    destination: b.destinationName,
    items: (b.items ?? []).map((line) => {
      const doc = b.itemDocs.find((i) => String(i._id) === String(line.item));
      return { code: doc?.code ?? "", name: doc?.name ?? "Unknown item", quantity: line.quantity, unit: doc?.unit ?? "" };
    }),
    units: b.units,
    priority: b.priority,
    status: b.status,
    vehicle: b.vehiclePlate,
    trip: b.tripCode,
    requestedBy: b.requestedByName,
    notes: b.notes ?? "",
    comment: b.adminNote ?? "",
    history: (b.history ?? []).map((h) => ({ label: h.label, at: h.at })),
  }));

  return reportResult({
    type: "bookings",
    query,
    rows,
    total,
    kpis: [
      kpi("Bookings", total, `${by.Pending ?? 0} pending approval`),
      kpi("Approved", by.Approved ?? 0, `${pct(by.Approved ?? 0, total)}% of bookings`),
      kpi("Completed", by.Completed ?? 0, `${pct(by.Completed ?? 0, total)}% of bookings`),
      kpi("Rejected / cancelled", (by.Rejected ?? 0) + (by.Cancelled ?? 0), `${by["Changes requested"] ?? 0} need changes`),
      kpi("Units requested", out.units[0]?.n ?? 0, "across all items"),
    ],
    breakdown: { title: "Bookings by status", sub: plural(total, "booking") + " in range", items: pairs(out.byStatus).sort((a, b) => b[1] - a[1]) },
    trend: buildTrend({ rows: out.trend, series: BOOKING_SERIES, from: query.from, to: query.to, tzOffset: query.tz, title: "Bookings per day", sub: "By requested date and status" }),
  });
}

/* =====================================================================
   2. TRIPS   details, completed, ongoing and history
   ===================================================================== */
const TRIP_SORT = { date: "createdAt", id: "code", vehicle: "vehiclePlate", driver: "driverName", status: "status", load: "load", delay: "delayMinutes", stops: "stopCount" };

async function tripsReport(query) {
  const { storeId, vehicleId } = await resolveFilters(query);
  const match = { ...dateFilter("createdAt", query) };
  if (query.status) match.status = query.status;
  if (storeId) match["stops.store"] = storeId;
  if (vehicleId) match.vehicle = vehicleId;

  const [out] = await Trip.aggregate([
    { $match: match },
    join(Vehicle, "vehicle", "veh"),
    join(User, "driver", "drv"),
    {
      $addFields: {
        vehiclePlate: first("$veh.plate"),
        driverName: first("$drv.name"),
        stopCount: { $size: { $ifNull: ["$stops", []] } },
        bookingCount: { $size: { $ifNull: ["$bookings", []] } },
        late: LATE,
      },
    },
    ...searchStage(query.q, ["code", "route", "vehiclePlate", "driverName", "waybill", "nextStop"]),
    {
      $facet: {
        rows: [
          ...pageStages({ sortField: TRIP_SORT[query.sort] ?? "createdAt", dir: query.dir, page: query.page, limit: query.limit }),
          { $project: { veh: 0, drv: 0 } },
        ],
        total: [{ $count: "n" }],
        byStatus: [{ $group: { _id: "$status", n: { $sum: 1 } } }],
        stats: [
          {
            $group: {
              _id: null,
              avgLoad: { $avg: "$load" },
              late: { $sum: { $cond: ["$late", 1, 0] } },
              avgLate: { $avg: { $cond: ["$late", "$delayMinutes", null] } },
              multi: { $sum: { $cond: [{ $gt: ["$stopCount", 2] }, 1, 0] } },
            },
          },
        ],
        trend: [trendGroup({ dateField: "createdAt", groupField: "status", series: TRIP_SERIES, timezone: timezoneName(query.tz) })],
      },
    },
  ]);

  const total = totalOf(out);
  const by = countMap(out.byStatus);
  const stats = out.stats[0] ?? {};
  const ongoing = ACTIVE_TRIP_STATUSES.reduce((sum, s) => sum + (by[s] ?? 0), 0);
  const rows = out.rows.map((t) => ({
    id: t.code,
    date: t.createdAt,
    route: t.route ?? "",
    vehicle: t.vehiclePlate,
    driver: t.driverName,
    stops: t.stopCount,
    bookings: t.bookingCount,
    status: t.status,
    load: t.load ?? 0,
    delayMinutes: t.delayMinutes ?? 0,
    late: Boolean(t.late),
    nextStop: t.nextStop ?? "",
    waybill: t.waybill ?? "",
  }));

  return reportResult({
    type: "trips",
    query,
    rows,
    total,
    kpis: [
      kpi("Trips", total, `${stats.multi ?? 0} multi-stop`),
      kpi("Completed", by.Completed ?? 0, `${pct(by.Completed ?? 0, total)}% of trips`),
      kpi("Ongoing", ongoing, "scheduled or on the road"),
      kpi("Delayed", stats.late ?? 0, stats.late ? `avg ${Math.round(stats.avgLate ?? 0)} min late` : "No delays"),
      kpi("Avg vehicle load", `${Math.round(stats.avgLoad ?? 0)}%`, "of vehicle capacity"),
    ],
    breakdown: { title: "Trips by status", sub: plural(total, "trip") + " in range", items: pairs(out.byStatus).sort((a, b) => b[1] - a[1]) },
    trend: buildTrend({ rows: out.trend, series: TRIP_SERIES, from: query.from, to: query.to, tzOffset: query.tz, title: "Trips per day", sub: "By status" }),
  });
}

/* =====================================================================
   3. VEHICLES   details, availability, status and utilisation
   ===================================================================== */
const VEHICLE_SORT = { code: "code", plate: "plate", type: "type", driver: "driverName", hub: "hubName", status: "status", fuel: "fuel", trips: "tripCount", completed: "completedCount", util: "avgLoad" };

async function vehiclesReport(query) {
  const { storeId, vehicleId } = await resolveFilters(query);
  const match = { isDraft: { $ne: true } };
  if (query.status) match.status = query.status;
  if (storeId) match.hub = storeId;
  if (vehicleId) match._id = vehicleId;

  const [[out], trend] = await Promise.all([
    Vehicle.aggregate([
      { $match: match },
      // Trips of this vehicle inside the date range
      {
        $lookup: {
          from: Trip.collection.name,
          let: { id: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$vehicle", "$$id"] }, ...dateFilter("createdAt", query) } },
            { $project: { status: 1, load: 1, delayMinutes: 1, createdAt: 1 } },
          ],
          as: "tripDocs",
        },
      },
      join(Store, "hub", "hubDoc"),
      {
        $addFields: {
          driverName: { $ifNull: ["$driverDetails.name", ""] },
          hubName: { $ifNull: [{ $arrayElemAt: ["$hubDoc.name", 0] }, { $ifNull: ["$hubDetails.name", ""] }] },
          tripCount: { $size: "$tripDocs" },
          completedCount: { $size: { $filter: { input: "$tripDocs", cond: { $eq: ["$$this.status", "Completed"] } } } },
          activeCount: { $size: { $filter: { input: "$tripDocs", cond: { $in: ["$$this.status", ACTIVE_TRIP_STATUSES] } } } },
          lateCount: {
            $size: {
              $filter: {
                input: "$tripDocs",
                cond: { $or: [{ $eq: ["$$this.status", "Delayed"] }, { $gt: ["$$this.delayMinutes", DELAYED_AFTER_MINUTES] }] },
              },
            },
          },
          avgLoad: { $round: [{ $ifNull: [{ $avg: "$tripDocs.load" }, 0] }, 0] },
          lastTrip: { $max: "$tripDocs.createdAt" },
        },
      },
      ...searchStage(query.q, ["code", "plate", "type", "model", "driverName", "hubName"]),
      {
        $facet: {
          rows: [
            ...pageStages({ sortField: VEHICLE_SORT[query.sort] ?? "code", dir: query.sort ? query.dir : "asc", page: query.page, limit: query.limit }),
            { $project: { tripDocs: 0, hubDoc: 0, documents: 0 } },
          ],
          total: [{ $count: "n" }],
          byStatus: [{ $group: { _id: "$status", n: { $sum: 1 } } }],
          stats: [
            {
              $group: {
                _id: null,
                trips: { $sum: "$tripCount" },
                avgUtil: { $avg: { $cond: [{ $gt: ["$tripCount", 0] }, "$avgLoad", null] } },
                withTrips: { $sum: { $cond: [{ $gt: ["$tripCount", 0] }, 1, 0] } },
              },
            },
          ],
          top: [{ $match: { tripCount: { $gt: 0 } } }, { $sort: { avgLoad: -1, _id: 1 } }, { $limit: 10 }, { $project: { plate: 1, avgLoad: 1 } }],
        },
      },
    ]),
    tripTrend(query, vehicleId ? { vehicle: vehicleId } : {}, "Trips per day"),
  ]);

  const total = totalOf(out);
  const by = countMap(out.byStatus);
  const stats = out.stats[0] ?? {};
  const rows = out.rows.map((v) => ({
    id: v.code,
    plate: v.plate,
    type: v.type,
    model: v.model ?? "",
    driver: v.driverName,
    hub: v.hubName,
    status: v.status,
    fuel: v.fuel ?? 0,
    mileage: v.mileage ?? "",
    capacity: v.capacity ?? "",
    trips: v.tripCount,
    completed: v.completedCount,
    active: v.activeCount,
    delayed: v.lateCount,
    util: v.avgLoad,
    lastTrip: v.lastTrip ?? null,
  }));

  return reportResult({
    type: "vehicles",
    query,
    rows,
    total,
    kpis: [
      kpi("Vehicles", total, `${stats.trips ?? 0} trips in range`),
      kpi("Available", by.Available ?? 0, `${pct(by.Available ?? 0, total)}% of fleet`),
      kpi("In use", by["In Use"] ?? 0, `${stats.withTrips ?? 0} with trips in range`),
      kpi("Maintenance", by.Maintenance ?? 0, `${by.Inactive ?? 0} inactive`),
      kpi("Avg vehicle load", `${Math.round(stats.avgUtil ?? 0)}%`, "of capacity, per trip"),
    ],
    breakdown: { title: "Average load by vehicle", sub: "Trip load, busiest vehicles first", items: out.top.map((v) => [v.plate, v.avgLoad]), max: 100, suffix: "%" },
    trend,
  });
}

/* =====================================================================
   4. STORES   details and performance
   ===================================================================== */
const STORE_SORT = { code: "code", name: "name", type: "type", district: "district", status: "status", capacity: "capacityM3", util: "utilisation", outB: "outB", inB: "inB", visits: "visits", delayed: "lateVisits", vehicles: "vehicleCount", items: "itemCount" };

// Count and total units of the bookings leaving or arriving at the store
const bookingTotals = (field, query) => ({
  $lookup: {
    from: Booking.collection.name,
    let: { id: "$_id" },
    pipeline: [
      { $match: { $expr: { $eq: [`$${field}`, "$$id"] }, status: { $ne: "Draft" }, ...dateFilter("requestedFor", query) } },
      { $group: { _id: null, count: { $sum: 1 }, units: { $sum: { $sum: "$items.quantity" } } } },
    ],
    as: field === "pickup" ? "outDocs" : "inDocs",
  },
});

async function storesReport(query) {
  const { storeId } = await resolveFilters({ store: query.store });
  const match = { isDraft: { $ne: true } };
  if (query.status) match.status = query.status;
  if (storeId) match._id = storeId;

  const [[out], trend] = await Promise.all([
    Store.aggregate([
      { $match: match },
      bookingTotals("pickup", query),
      bookingTotals("destination", query),
      // Vehicle visits (stops) in the date range
      {
        $lookup: {
          from: Trip.collection.name,
          let: { id: "$_id" },
          pipeline: [
            { $match: { $expr: { $in: ["$$id", { $ifNull: ["$stops.store", []] }] }, ...dateFilter("createdAt", query) } },
            { $group: { _id: null, count: { $sum: 1 }, late: { $sum: { $cond: [LATE, 1, 0] } } } },
          ],
          as: "visitDocs",
        },
      },
      // Items stored here, and how many need restocking
      {
        $lookup: {
          from: Item.collection.name,
          let: { id: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$store", "$$id"] }, isDraft: { $ne: true } } },
            { $group: { _id: null, count: { $sum: 1 }, low: { $sum: { $cond: [{ $in: ["$status", ["Low Stock", "Critical Low", "Reorder Soon"]] }, 1, 0] } } } },
          ],
          as: "itemDocs",
        },
      },
      {
        $lookup: {
          from: Vehicle.collection.name,
          let: { id: "$_id" },
          pipeline: [{ $match: { $expr: { $eq: ["$hub", "$$id"] }, isDraft: { $ne: true } } }, { $count: "n" }],
          as: "vehicleDocs",
        },
      },
      {
        $addFields: {
          outB: firstOr0("$outDocs.count"),
          outUnits: firstOr0("$outDocs.units"),
          inB: firstOr0("$inDocs.count"),
          inUnits: firstOr0("$inDocs.units"),
          visits: firstOr0("$visitDocs.count"),
          lateVisits: firstOr0("$visitDocs.late"),
          itemCount: firstOr0("$itemDocs.count"),
          lowItems: firstOr0("$itemDocs.low"),
          vehicleCount: firstOr0("$vehicleDocs.n"),
          utilisation: {
            $cond: [{ $gt: ["$capacityM3", 0] }, { $round: [{ $multiply: [{ $divide: ["$usedM3", "$capacityM3"] }, 100] }, 0] }, 0],
          },
        },
      },
      ...searchStage(query.q, ["code", "name", "district", "manager", "type"]),
      {
        $facet: {
          rows: [
            ...pageStages({ sortField: STORE_SORT[query.sort] ?? "code", dir: query.sort ? query.dir : "asc", page: query.page, limit: query.limit }),
            { $project: { outDocs: 0, inDocs: 0, visitDocs: 0, itemDocs: 0, vehicleDocs: 0, assignedVehicles: 0 } },
          ],
          total: [{ $count: "n" }],
          byStatus: [{ $group: { _id: "$status", n: { $sum: 1 } } }],
          stats: [
            {
              $group: {
                _id: null,
                avgUtil: { $avg: { $cond: [{ $gt: ["$capacityM3", 0] }, "$utilisation", null] } },
                outUnits: { $sum: "$outUnits" },
                inUnits: { $sum: "$inUnits" },
                visits: { $sum: "$visits" },
              },
            },
          ],
          top: [{ $match: { visits: { $gt: 0 } } }, { $sort: { visits: -1, _id: 1 } }, { $limit: 10 }, { $project: { name: 1, visits: 1 } }],
        },
      },
    ]),
    tripTrend(query, storeId ? { "stops.store": storeId } : {}, "Vehicle visits per day"),
  ]);

  const total = totalOf(out);
  const by = countMap(out.byStatus);
  const stats = out.stats[0] ?? {};
  const rows = out.rows.map((s) => ({
    id: s.code,
    name: s.name,
    type: s.type ?? "",
    district: s.district ?? "",
    manager: s.manager ?? "",
    phone: s.phone ?? "",
    status: s.status,
    capacity: s.capacityM3 ?? 0,
    used: s.usedM3 ?? 0,
    util: s.utilisation,
    vehicles: s.vehicleCount,
    items: s.itemCount,
    lowItems: s.lowItems,
    outB: s.outB,
    outUnits: s.outUnits,
    inB: s.inB,
    inUnits: s.inUnits,
    visits: s.visits,
    delayed: s.lateVisits,
  }));

  return reportResult({
    type: "stores",
    query,
    rows,
    total,
    kpis: [
      kpi("Stores", total, `${by.Active ?? 0} active`),
      kpi("High capacity", by["High Capacity"] ?? 0, `${by.Inactive ?? 0} inactive`),
      kpi("Avg utilisation", `${Math.round(stats.avgUtil ?? 0)}%`, "of storage capacity"),
      kpi("Units dispatched", stats.outUnits ?? 0, `${stats.inUnits ?? 0} received`),
      kpi("Vehicle visits", stats.visits ?? 0, "loading and unloading stops"),
    ],
    breakdown: { title: "Vehicle visits by store", sub: "Loading + unloading stops in range", items: out.top.map((s) => [s.name, s.visits]) },
    trend,
  });
}

/* =====================================================================
   5. ITEMS   inventory, stock levels and movements
   ===================================================================== */
const ITEM_SORT = { code: "code", name: "name", category: "category", store: "storeName", stock: "stockOnHand", reorder: "reorderLevel", status: "status", moved: "moved" };

// Bookings that move an item (not drafts, rejected or cancelled) inside the date range
const MOVING = { status: { $nin: ["Draft", "Rejected", "Cancelled"] } };

async function itemsReport(query) {
  const { storeId } = await resolveFilters({ store: query.store });
  const match = { isDraft: { $ne: true } };
  if (query.status) match.status = query.status;
  if (query.category) match.category = query.category;
  if (storeId) match.store = storeId;

  const bookingScope = { status: { $ne: "Draft" }, ...dateFilter("requestedFor", query), ...(storeId ? { $or: [{ pickup: storeId }, { destination: storeId }] } : {}) };

  const [[out], trendRows] = await Promise.all([
    Item.aggregate([
      { $match: match },
      join(Store, "store", "storeDoc"),
      {
        $lookup: {
          from: Booking.collection.name,
          let: { id: "$_id" },
          pipeline: [
            { $match: { ...MOVING, ...dateFilter("requestedFor", query), $expr: { $in: ["$$id", { $ifNull: ["$items.item", []] }] } } },
            { $unwind: "$items" },
            { $match: { $expr: { $eq: ["$items.item", "$$id"] } } },
            {
              $group: {
                _id: null,
                units: { $sum: "$items.quantity" },
                bookings: { $sum: 1 },
                completed: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, "$items.quantity", 0] } },
              },
            },
          ],
          as: "moveDocs",
        },
      },
      {
        $addFields: {
          storeName: first("$storeDoc.name"),
          moved: firstOr0("$moveDocs.units"),
          movedBookings: firstOr0("$moveDocs.bookings"),
          movedCompleted: firstOr0("$moveDocs.completed"),
          belowReorder: { $and: [{ $gt: ["$reorderLevel", 0] }, { $lte: ["$stockOnHand", "$reorderLevel"] }] },
        },
      },
      ...searchStage(query.q, ["code", "name", "category", "storeName"]),
      {
        $facet: {
          rows: [
            ...pageStages({ sortField: ITEM_SORT[query.sort] ?? "code", dir: query.sort ? query.dir : "asc", page: query.page, limit: query.limit }),
            { $project: { storeDoc: 0, moveDocs: 0 } },
          ],
          total: [{ $count: "n" }],
          stats: [
            {
              $group: {
                _id: null,
                stock: { $sum: "$stockOnHand" },
                low: { $sum: { $cond: [{ $in: ["$status", ["Low Stock", "Critical Low"]] }, 1, 0] } },
                critical: { $sum: { $cond: [{ $eq: ["$status", "Critical Low"] }, 1, 0] } },
                below: { $sum: { $cond: ["$belowReorder", 1, 0] } },
                moved: { $sum: "$moved" },
              },
            },
          ],
          top: [{ $match: { moved: { $gt: 0 } } }, { $sort: { moved: -1, _id: 1 } }, { $limit: 10 }, { $project: { name: 1, moved: 1 } }],
        },
      },
    ]),
    // Units requested per day, split by how far the booking has got
    Booking.aggregate([
      { $match: bookingScope },
      { $unwind: "$items" },
      trendGroup({ dateField: "requestedFor", groupField: "status", series: ITEM_SERIES, timezone: timezoneName(query.tz), value: "$items.quantity" }),
    ]),
  ]);

  const total = totalOf(out);
  const stats = out.stats[0] ?? {};
  const rows = out.rows.map((i) => ({
    id: i.code,
    name: i.name,
    category: i.category,
    store: i.storeName,
    unit: i.unit ?? "",
    stock: i.stockOnHand ?? 0,
    stockUnit: i.stockUnit || i.unit || "",
    reorder: i.reorderLevel ?? 0,
    belowReorder: Boolean(i.belowReorder),
    status: i.status,
    weightKg: i.weightKg ?? null,
    volumeM3: i.volumeM3 ?? null,
    moved: i.moved,
    movedBookings: i.movedBookings,
    movedCompleted: i.movedCompleted,
  }));

  return reportResult({
    type: "items",
    query,
    rows,
    total,
    kpis: [
      kpi("Items", total, "in the catalog"),
      kpi("Units in stock", stats.stock ?? 0, "on hand across stores"),
      kpi("Low stock", stats.low ?? 0, `${stats.critical ?? 0} critical`),
      kpi("Below reorder level", stats.below ?? 0, "stock at or under the limit"),
      kpi("Units moved", stats.moved ?? 0, "booked in the date range"),
    ],
    breakdown: { title: "Units moved by item", sub: "Booked quantity in range, highest first", items: out.top.map((i) => [i.name, i.moved]) },
    trend: buildTrend({ rows: trendRows, series: ITEM_SERIES, from: query.from, to: query.to, tzOffset: query.tz, title: "Item movements per day", sub: "Units requested in bookings" }),
  });
}

/* =====================================================================
   6. GOODS   preparation, handover and receiving (quantities and discrepancies)
   ===================================================================== */
const GOODS_STATUS = { Draft: "draft", Prepared: "prepared", "Handed over": "handed_over", Received: "confirmed", Cancelled: "cancelled" };
const GOODS_LABEL = Object.fromEntries(Object.entries(GOODS_STATUS).map(([label, value]) => [value, label]));
const GOODS_SORT = {
  date: "createdAt",
  booking: "bookingCode",
  trip: "tripCode",
  pickup: "pickupName",
  store: "storeName",
  status: "status",
  expected: "expected",
  prepared: "prepared",
  handedOver: "handedOver",
  received: "received",
  missing: "missing",
  damaged: "damaged",
  excess: "excess",
  confirmedAt: "confirmedAt",
};

// Sum of one quantity over the item lines of a confirmation
const sumLines = (field) => ({ $sum: `$lines.${field}` });

async function goodsReport(query) {
  const { storeId, vehicleId } = await resolveFilters(query);
  const match = { ...dateFilter("createdAt", query) };
  if (query.status) match.status = GOODS_STATUS[query.status] ?? NONE;
  if (storeId) match.$or = [{ store: storeId }, { pickupStore: storeId }]; // the sending or the receiving store

  const [out] = await GoodsConfirmation.aggregate([
    { $match: match },
    join(Booking, "booking", "bk"),
    join(Trip, "trip", "tr"),
    join(Store, "store", "st"),
    join(Store, "pickupStore", "pk"),
    join(User, "confirmedBy", "usr"),
    {
      $addFields: {
        bookingCode: first("$bk.code"),
        tripCode: first("$tr.code"),
        tripVehicle: { $ifNull: [{ $arrayElemAt: ["$tr.vehicle", 0] }, { $arrayElemAt: ["$bk.vehicle", 0] }] },
        storeName: first("$st.name"),
        pickupName: first("$pk.name"),
        confirmedByName: first("$usr.name"),
        // Quantities added up over the item lines (a step that was not done yet counts as 0)
        expected: sumLines("expected"),
        prepared: sumLines("prepared.qty"),
        handedOver: sumLines("handover.qty"),
        received: sumLines("receipt.qty"),
        missing: sumLines("missing"),
        excess: sumLines("excess"),
        damaged: sumLines("damaged"),
        incorrect: sumLines("incorrect"),
      },
    },
    { $addFields: { discrepancy: { $add: ["$missing", "$excess", "$damaged", "$incorrect"] } } },
    ...(vehicleId ? [{ $match: { tripVehicle: vehicleId } }] : []),
    ...searchStage(query.q, ["bookingCode", "tripCode", "pickupName", "storeName", "confirmedByName", "notes"]),
    {
      $facet: {
        rows: [
          ...pageStages({ sortField: GOODS_SORT[query.sort] ?? "createdAt", dir: query.dir, page: query.page, limit: query.limit }),
          join(Item, "lines.item", "itemDocs"),
          { $project: { bk: 0, tr: 0, st: 0, pk: 0, usr: 0 } },
        ],
        total: [{ $count: "n" }],
        byStatus: [{ $group: { _id: "$status", n: { $sum: 1 } } }],
        stats: [
          {
            $group: {
              _id: null,
              expected: { $sum: "$expected" },
              prepared: { $sum: "$prepared" },
              handedOver: { $sum: "$handedOver" },
              received: { $sum: "$received" },
              missing: { $sum: "$missing" },
              excess: { $sum: "$excess" },
              damaged: { $sum: "$damaged" },
              incorrect: { $sum: "$incorrect" },
              affected: { $sum: { $cond: [{ $gt: ["$discrepancy", 0] }, 1, 0] } }, // confirmations with at least one discrepancy
            },
          },
        ],
        trend: [trendGroup({ dateField: "createdAt", groupField: "status", series: GOODS_SERIES, timezone: timezoneName(query.tz) })],
      },
    },
  ]);

  const total = totalOf(out);
  const stats = out.stats[0] ?? {};
  const discrepancies = (stats.missing ?? 0) + (stats.excess ?? 0) + (stats.damaged ?? 0) + (stats.incorrect ?? 0);

  // One step of one item line: what was counted and how it differs from the step before
  const step = (s) => (s ? { qty: s.qty ?? null, difference: s.difference ?? null, type: s.discrepancyType ?? "none", damaged: s.damaged ?? 0, incorrect: s.incorrect ?? 0, note: s.note ?? "" } : null);

  const rows = out.rows.map((g) => ({
    id: String(g._id),
    date: g.createdAt,
    booking: g.bookingCode,
    trip: g.tripCode,
    pickup: g.pickupName,
    store: g.storeName,
    status: GOODS_LABEL[g.status] ?? g.status,
    expected: g.expected,
    prepared: g.prepared,
    handedOver: g.handedOver,
    received: g.received,
    missing: g.missing,
    excess: g.excess,
    damaged: g.damaged,
    incorrect: g.incorrect,
    discrepancy: g.discrepancy,
    confirmedBy: g.confirmedByName,
    confirmedAt: g.confirmedAt ?? null,
    preparedAt: g.stages?.prepared?.confirmed ? g.stages.prepared.at : null,
    preparedBy: g.stages?.prepared?.confirmed ? g.stages.prepared.byName ?? "" : "",
    handoverAt: g.stages?.handover?.confirmed ? g.stages.handover.at : null,
    handoverBy: g.stages?.handover?.confirmed ? g.stages.handover.byName ?? "" : "",
    notes: { prepared: g.stages?.prepared?.note ?? "", handover: g.stages?.handover?.note ?? "", receipt: g.stages?.receipt?.note ?? "" },
    lines: (g.lines ?? []).map((line) => ({
      item: g.itemDocs.find((i) => String(i._id) === String(line.item))?.name ?? "Unknown item",
      expected: line.expected ?? 0,
      prepared: step(line.prepared),
      handover: step(line.handover),
      receipt: step(line.receipt),
      missing: line.missing ?? 0,
      excess: line.excess ?? 0,
      damaged: line.damaged ?? 0,
      incorrect: line.incorrect ?? 0,
    })),
    history: (g.history ?? []).map((h) => ({ stage: h.stage, action: h.action, by: h.byName ?? "", at: h.at, note: h.note ?? "" })),
  }));

  return reportResult({
    type: "goods",
    query,
    rows,
    total,
    kpis: [
      kpi("Expected goods", stats.expected ?? 0, `${plural(total, "confirmation")} in range`),
      kpi("Prepared", stats.prepared ?? 0, `${pct(stats.prepared ?? 0, stats.expected ?? 0)}% of expected`),
      kpi("Handed over", stats.handedOver ?? 0, `${pct(stats.handedOver ?? 0, stats.prepared ?? 0)}% of prepared`),
      kpi("Received", stats.received ?? 0, `${pct(stats.received ?? 0, stats.handedOver ?? 0)}% of handed over`),
      kpi("Discrepancies", discrepancies, `${plural(stats.affected ?? 0, "confirmation")} affected`),
      kpi("Missing goods", stats.missing ?? 0, "short of the step before"),
      kpi("Damaged goods", stats.damaged ?? 0, `${pct(stats.damaged ?? 0, stats.received ?? 0)}% of received`),
      kpi("Excess goods", stats.excess ?? 0, `${stats.incorrect ?? 0} incorrect units`),
    ],
    breakdown: {
      title: "Discrepancies by type",
      sub: `${plural(discrepancies, "unit")} across all steps`,
      items: [
        ["Missing", stats.missing ?? 0],
        ["Damaged", stats.damaged ?? 0],
        ["Excess", stats.excess ?? 0],
        ["Incorrect", stats.incorrect ?? 0],
      ].sort((a, b) => b[1] - a[1]),
    },
    trend: buildTrend({ rows: out.trend, series: GOODS_SERIES, from: query.from, to: query.to, tzOffset: query.tz, title: "Goods confirmations per day", sub: "By progress of the confirmation" }),
  });
}

/* =====================================================================
   7. AUDIT   system activity (reuses the Audit log queries)
   ===================================================================== */
const AUDIT_SORT = ["ts", "userName", "action", "entity"];

async function auditReport(query) {
  const filters = { q: query.q, action: query.status, entity: query.category, from: query.from, to: query.to };
  const filter = buildAuditFilter(filters);

  const [list, byEntity, trendRows] = await Promise.all([
    listAuditLogs({ ...filters, sort: AUDIT_SORT.includes(query.sort) ? query.sort : "ts", dir: query.dir, page: query.page, limit: query.limit }),
    AuditLog.aggregate([{ $match: filter }, { $group: { _id: "$entity", n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }, { $limit: 10 }]),
    AuditLog.aggregate([{ $match: filter }, trendGroup({ dateField: "createdAt", groupField: "action", series: AUDIT_SERIES, timezone: timezoneName(query.tz) })]),
  ]);

  const { summary } = list;
  return reportResult({
    type: "audit",
    query,
    rows: list.entries,
    total: list.total,
    kpis: [
      kpi("Events", summary.events, "in selected range"),
      kpi("Active users", summary.activeUsers, "performed at least one action"),
      kpi("Data changes", summary.dataChanges, "vehicles, stores, items, bookings"),
      kpi("Access changes", summary.accessChanges, "roles & account status"),
      kpi("Failed sign-ins", summary.failedLogins, summary.failedLogins > 5 ? "Review for suspicious activity" : "Within normal range"),
    ],
    breakdown: { title: "Activity by module", sub: plural(list.total, "event") + " in range", items: pairs(byEntity) },
    trend: buildTrend({ rows: trendRows, series: AUDIT_SERIES, from: query.from, to: query.to, tzOffset: query.tz, title: "Activity per day", sub: "By kind of event" }),
  });
}

/* =====================================================================
   Public functions used by the controller
   ===================================================================== */
const BUILDERS = {
  bookings: bookingsReport,
  trips: tripsReport,
  vehicles: vehiclesReport,
  stores: storesReport,
  items: itemsReport,
  goods: goodsReport,
  audit: auditReport,
};

// GET /reports/:type -> the chosen report for the filters in `query`
export async function getReport(type, query) {
  return BUILDERS[type](query);
}

// The status values a report can be filtered by (taken from the models, so they cannot drift)
const enumValues = (Model) => Model.schema.path("status").enumValues;

// GET /reports/options: report tabs and the dropdown values for the filters
export async function getReportOptions() {
  const [stores, vehicles, categories, audit] = await Promise.all([
    Store.find({ isDraft: { $ne: true } }).select("code name").sort({ name: 1 }).lean(),
    Vehicle.find({ isDraft: { $ne: true } }).select("code plate type").sort({ plate: 1 }).lean(),
    Item.distinct("category", { isDraft: { $ne: true } }),
    listAuditFilters(),
  ]);

  return {
    types: [
      { key: "bookings", label: "Bookings", title: "Booking register", statusLabel: "Status", statuses: enumValues(Booking).filter((s) => s !== "Draft"), search: "Search booking, store, vehicle or trip…" },
      { key: "trips", label: "Trips", title: "Trip register", statusLabel: "Status", statuses: enumValues(Trip), search: "Search trip, route, vehicle or driver…" },
      { key: "vehicles", label: "Vehicles", title: "Vehicle utilisation", statusLabel: "Status", statuses: VEHICLE_STATUSES, search: "Search vehicle, driver or hub…" },
      { key: "stores", label: "Stores", title: "Store performance", statusLabel: "Status", statuses: enumValues(Store), search: "Search store, district or manager…" },
      { key: "items", label: "Items", title: "Item inventory and movements", statusLabel: "Stock status", statuses: enumValues(Item), categoryLabel: "Category", categories: categories.sort(), search: "Search item, category or store…" },
      { key: "goods", label: "Goods receiving", title: "Goods preparation, handover and receiving", statusLabel: "State", statuses: Object.keys(GOODS_STATUS), search: "Search booking, trip, store or employee…" },
      { key: "audit", label: "Audit", title: "System activity", statusLabel: "Action", statuses: audit.actions, categoryLabel: "Module", categories: audit.entities, search: "Search user, record ID or details…" },
    ],
    stores: stores.map((s) => ({ code: s.code, name: s.name })),
    vehicles: vehicles.map((v) => ({ code: v.code, plate: v.plate, type: v.type })),
  };
}

// POST /reports/export: note in the audit history that a report was downloaded
export async function recordReportExport({ type, rowCount }, user, ip) {
  await record({
    user,
    action: "EXPORT",
    entity: "Report",
    entityCode: type.toUpperCase(),
    description: `Exported ${type} report (${rowCount} rows, CSV)`,
    ip,
  });
  return { message: "Export recorded." };
}
