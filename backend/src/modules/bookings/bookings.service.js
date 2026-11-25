import Booking from "./bookings.model.js";
import Store from "../stores/stores.model.js";
import Item from "../items/items.model.js";
import User from "../users/users.model.js";
import Trip from "../trips/trips.model.js";
import ApiError from "../../utils/ApiError.js";
import { notifyAdmins } from "../notifications/notifications.service.js";
import { nextCode } from "../../utils/sequence.js";

const pad = (n) => String(n).padStart(2, "0");

// Booking number prefix: BK-<month><day>, for example BK-1104 -> BK-1104-0087
const codePrefix = (d) => `BK-${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

/* =====================================================================
   1. ADMIN PORTAL
   ===================================================================== */

// Fill in store names, the requester and the item details
const POPULATE = [
  { path: "pickup", select: "name" },
  { path: "destination", select: "name" },
  { path: "requestedBy", select: "name" },
  { path: "items.item", select: "code name unit" },
];

// The shape the admin Bookings page expects (see admin-web src/api/bookingApi.js)
export function toBookingResponse(b) {
  const items = (b.items ?? []).map((line) => ({
    code: line.item?.code ?? "",
    item: line.item?.name ?? "",
    quantity: line.quantity,
    unit: line.item?.unit ?? "",
  }));

  return {
    id: b.code,
    pickup: b.pickup?.name ?? "",
    destination: b.destination?.name ?? "",
    requestedFor: b.requestedFor,
    submittedAt: b.submittedAt,
    requestedBy: b.requestedBy?.name ?? "",
    units: items.reduce((sum, i) => sum + i.quantity, 0),
    priority: b.priority,
    status: b.status,
    notes: b.notes ?? "",
    comment: b.adminNote ?? "", // the administrator's comment to the store
    items,
  };
}

// The five cards at the top of the Bookings page
function buildSummary(bookings) {
  const count = (status) => bookings.filter((b) => b.status === status).length;
  const pending = bookings.filter((b) => b.status === "Pending");
  const oldest = pending.length ? Math.min(...pending.map((b) => new Date(b.submittedAt).getTime())) : null;

  return {
    pending: pending.length,
    approved: count("Approved"),
    changesRequested: count("Changes requested"),
    rejected: count("Rejected"),
    all: bookings.length,
    pendingUnits: pending.reduce((sum, b) => sum + b.units, 0),
    oldestPendingHours: oldest ? Math.max(0, Math.round((Date.now() - oldest) / 36e5)) : 0,
  };
}

// GET /api/bookings -> { bookings, summary }
export async function listBookings() {
  // Drafts are private to the store that is still writing them
  const docs = await Booking.find({ status: { $ne: "Draft" } }).sort({ submittedAt: -1 }).populate(POPULATE).lean();
  const bookings = docs.map(toBookingResponse);
  return { bookings, summary: buildSummary(bookings) };
}

// GET /api/bookings/:id   (id is the booking number, for example BK-1104-0087)
export async function getBooking(code) {
  const doc = await Booking.findOne({ code, status: { $ne: "Draft" } }).populate(POPULATE).lean();
  if (!doc) throw ApiError.notFound("Booking not found");
  return toBookingResponse(doc);
}

// POST /api/bookings  (the administrator creates a booking)
export async function createBooking(input, user) {
  const codes = input.items.map((i) => i.code);
  const problems = [];

  if (input.pickup === input.destination) {
    problems.push({ field: "destination", message: "Destination must be different from the pickup store." });
  }
  if (new Set(codes).size !== codes.length) {
    problems.push({ field: "items", message: "Each item can only be added once." });
  }

  const requestedFor = new Date(input.requestedFor);
  if (requestedFor.getTime() < Date.now() - 15 * 60 * 1000) {
    problems.push({ field: "requestedFor", message: "Choose a date and time in the future." });
  }

  const [stores, items] = await Promise.all([
    Store.find({ name: { $in: [input.pickup, input.destination] }, status: { $ne: "Inactive" } }).select("name"),
    Item.find({ code: { $in: codes } }).select("code"),
  ]);

  const pickup = stores.find((s) => s.name === input.pickup);
  const destination = stores.find((s) => s.name === input.destination);
  if (!pickup) problems.push({ field: "pickup", message: "Pickup store was not found." });
  if (!destination) problems.push({ field: "destination", message: "Destination store was not found." });
  for (const code of codes) {
    if (!items.some((i) => i.code === code)) problems.push({ field: "items", message: `Item ${code} was not found.` });
  }

  if (problems.length) throw ApiError.unprocessable("Please check the highlighted fields.", { errors: problems });

  // Booking number: BK-<month><day>-<running number>, for example BK-1104-0087
  const now = new Date();
  const code = await nextCode(codePrefix(now));

  const booking = await Booking.create({
    code,
    pickup: pickup._id,
    destination: destination._id,
    requestedFor,
    submittedAt: now,
    requestedBy: user.id,
    priority: input.priority,
    status: "Pending",
    notes: input.notes,
    items: input.items.map((line) => ({
      item: items.find((i) => i.code === line.code)._id,
      quantity: line.quantity,
    })),
    history: [{ label: "Submitted", at: now }],
  });

  await booking.populate(POPULATE);

  // Show the new booking in the Notifications page
  const units = input.items.reduce((sum, line) => sum + line.quantity, 0);
  const urgent = input.priority === "Urgent";
  await notifyAdmins({
    type: "booking",
    severity: urgent ? "warning" : "info",
    title: urgent ? "Urgent booking created" : "New booking created",
    message: `${user.name} created ${code} (${pickup.name} to ${destination.name}) for ${units.toLocaleString("en-US")} units.`,
    link: `/bookings?booking=${code}`,
  });

  return toBookingResponse(booking.toObject());
}

// PATCH /api/bookings/:id/status  (approve, request changes or reject a pending booking)
export async function reviewBooking(code, { status, comment }) {
  // One atomic update: only a Pending booking can be reviewed, so two admins cannot both decide
  const updated = await Booking.findOneAndUpdate(
    { code, status: "Pending" },
    { $set: { status, adminNote: comment }, $push: { history: { label: status, at: new Date() } } },
    { new: true }
  )
    .populate(POPULATE)
    .lean();

  if (!updated) {
    const exists = await Booking.exists({ code });
    throw exists
      ? ApiError.conflict("Only pending bookings can be reviewed. This booking has already been decided.")
      : ApiError.notFound("Booking not found");
  }

  // Show the decision in the Notifications page
  const decision = {
    Approved: { title: "Booking approved", message: `${code} was approved and is ready for trip planning.`, severity: "info" },
    "Changes requested": { title: "Changes requested", message: `${code} is waiting for the store to make the requested changes.`, severity: "info" },
    Rejected: { title: "Booking rejected", message: `${code} was rejected.`, severity: "warning" },
  }[status];
  if (decision) await notifyAdmins({ type: "booking", ...decision, link: `/bookings?booking=${code}` });

  return toBookingResponse(updated);
}

/* =====================================================================
   2. STORE PORTAL
   Every store only sees and changes its own bookings. The store id comes
   from the login token (req.user.storeId).
   ===================================================================== */

// Keep in sync with the store web (src/api/bookingApi.js)
const STORE_HOURS = { open: "06:00", close: "20:00" };
const STORE_EDITABLE = ["Draft", "Pending", "Changes requested"]; // statuses saved in the database
const STORE_CANCELLABLE = ["Draft", "Pending approval", "Changes requested", "Approved", "Scheduled"]; // statuses the store sees

const STORE_POPULATE = [
  { path: "pickup", select: "name" },
  { path: "destination", select: "name" },
  { path: "requestedBy", select: "name store" },
  { path: "items.item", select: "code name unit" },
  { path: "vehicle", select: "plate type" },
  { path: "driver", select: "name" },
];

function requireStore(user) {
  if (!user?.storeId) throw ApiError.forbidden("Your account is not assigned to a store.");
  return String(user.storeId);
}


function storeStatus(booking, tripStatus) {
  switch (booking.status) {
    case "Pending":
      return "Pending approval";
    case "Approved":
      if (tripStatus === "In transit" || tripStatus === "Delayed") return "In transit";
      if (tripStatus === "Completed") return "Completed";
      if (tripStatus === "Scheduled" || booking.vehicle) return "Scheduled";
      return "Approved";
    default:
      return booking.status; // Draft, Changes requested, Rejected, Completed, Cancelled
  }
}

// bookingId -> status of the latest trip carrying it
async function tripStatusByBooking(bookingIds) {
  const map = new Map();
  if (!bookingIds.length) return map;
  const trips = await Trip.find({ bookings: { $in: bookingIds }, status: { $ne: "Unallocated" } })
    .select("bookings status")
    .sort({ createdAt: 1 })
    .lean();
  for (const trip of trips) for (const id of trip.bookings) map.set(String(id), trip.status);
  return map;
}

// The shape the store Bookings pages expect (see store-web src/api/bookingApi.js)
function toStoreResponse(b, tripStatus) {
  const items = (b.items ?? []).map((line) => ({
    code: line.item?.code ?? "",
    item: line.item?.name ?? "",
    quantity: line.quantity,
    unit: line.item?.unit ?? "",
  }));

  return {
    id: b.code,
    pickup: b.pickup?.name ?? "",
    destination: b.destination?.name ?? "",
    requestedFor: b.requestedFor,
    submittedAt: b.submittedAt,
    priority: b.priority,
    status: storeStatus(b, tripStatus),
    notes: b.notes ?? "",
    adminNote: b.adminNote ?? "",
    vehicle: b.vehicle ? `${b.vehicle.plate} · ${b.vehicle.type}` : "",
    driver: b.driver?.name ?? "",
    items,
    units: items.reduce((sum, i) => sum + i.quantity, 0),
    history: [...(b.history ?? [])]
      .sort((a, c) => new Date(a.at) - new Date(c.at))
      .map((h) => ({ label: h.label, at: h.at })),
  };
}

async function presentForStore(bookingDocs) {
  const list = Array.isArray(bookingDocs) ? bookingDocs : [bookingDocs];
  const trips = await tripStatusByBooking(list.map((b) => b._id));
  const result = list.map((b) => toStoreResponse(b, trips.get(String(b._id))));
  return Array.isArray(bookingDocs) ? result : result[0];
}

// Bookings a store may see: sent from or to it, plus its own drafts (drafts are private)
async function visibleToStore(storeId) {
  const staffIds = await User.distinct("_id", { store: storeId });
  return {
    $or: [
      { status: { $ne: "Draft" }, $or: [{ pickup: storeId }, { destination: storeId }] },
      { status: "Draft", requestedBy: { $in: staffIds } },
    ],
  };
}

async function findVisible(code, storeId) {
  const doc = await Booking.findOne({ $and: [{ code }, await visibleToStore(storeId)] })
    .populate(STORE_POPULATE)
    .lean();
  if (!doc) throw ApiError.notFound("Booking not found");
  return doc;
}

// Only the store that requested a booking may edit or cancel it
function assertOwnRequest(doc, storeId) {
  if (String(doc.requestedBy?.store) !== storeId) {
    throw ApiError.forbidden("Only the store that requested this booking can change it.");
  }
}

// Checks the form data and turns store names and item codes into database ids
async function resolveStoreInput(input, storeId) {
  const draft = input.draft;
  const problems = [];
  const codes = input.items.map((i) => i.code);

  if (new Set(codes).size !== codes.length) problems.push({ field: "items", message: "Each item can only be added once." });

  const names = [input.pickup, input.destination].filter(Boolean);
  const [stores, items] = await Promise.all([
    Store.find({ name: { $in: names }, status: { $ne: "Inactive" } }).select("name"),
    Item.find({ code: { $in: codes } }).select("code"),
  ]);

  const pickup = stores.find((s) => s.name === input.pickup);
  const destination = input.destination ? stores.find((s) => s.name === input.destination) : null;

  if (!pickup) problems.push({ field: "pickup", message: "Pickup store was not found." });
  if (input.destination && !destination) problems.push({ field: "destination", message: "Destination store was not found." });
  if (!draft && !input.destination) problems.push({ field: "destination", message: "Choose a destination store." });
  if (pickup && destination && String(pickup._id) === String(destination._id)) {
    problems.push({ field: "destination", message: "Destination must be different from the pickup store." });
  }

  // the booking has to move goods from or to the signed-in store
  const involvesMyStore = [pickup, destination].some((s) => s && String(s._id) === storeId);
  if (pickup && (destination || draft) && !involvesMyStore) {
    problems.push({ field: "destination", message: "Pickup or destination must be your own store." });
  }

  for (const code of codes) {
    if (!items.some((i) => i.code === code)) problems.push({ field: "items", message: `Item ${code} was not found.` });
  }

  const requestedFor = new Date(input.requestedFor);
  if (!draft) {
    if (!codes.length) problems.push({ field: "items", message: "Add at least one item with a quantity." });
    if (requestedFor.getTime() < Date.now() - 15 * 60 * 1000) {
      problems.push({ field: "requestedFor", message: "Choose a date and time in the future." });
    }
    const hhmm = `${pad(requestedFor.getHours())}:${pad(requestedFor.getMinutes())}`;
    if (hhmm < STORE_HOURS.open || hhmm > STORE_HOURS.close) {
      problems.push({ field: "requestedFor", message: `Choose a time between ${STORE_HOURS.open} and ${STORE_HOURS.close}.` });
    }
  }

  if (problems.length) throw ApiError.unprocessable("Please check the highlighted fields.", { errors: problems });

  return {
    pickup,
    destination,
    requestedFor,
    lines: input.items.map((line) => ({ item: items.find((i) => i.code === line.code)._id, quantity: line.quantity })),
  };
}

// GET /api/store/booking-options -> { stores, items }
export async function getStoreBookingOptions() {
  const [stores, items] = await Promise.all([
    Store.find({ status: { $ne: "Inactive" } }).select("name").sort({ name: 1 }).lean(),
    Item.find({ isDraft: { $ne: true } }).select("code name unit").sort({ code: 1 }).lean(), // draft items are not bookable
  ]);
  return {
    stores: stores.map((s) => ({ id: String(s._id), name: s.name })),
    items: items.map((i) => ({ code: i.code, name: i.name, unit: i.unit })),
  };
}

// GET /api/store/bookings -> [booking]
export async function listStoreBookings(user) {
  const storeId = requireStore(user);
  const docs = await Booking.find(await visibleToStore(storeId))
    .sort({ createdAt: -1 })
    .populate(STORE_POPULATE)
    .lean();
  return presentForStore(docs);
}

// GET /api/store/bookings/:id
export async function getStoreBooking(code, user) {
  const storeId = requireStore(user);
  return presentForStore(await findVisible(code, storeId));
}

// POST /api/store/bookings  (store manager) - submit, or save as a draft
export async function createStoreBooking(input, user) {
  const storeId = requireStore(user);
  const data = await resolveStoreInput(input, storeId);

  const now = new Date();
  const created = await Booking.create({
    code: await nextCode(codePrefix(now)),
    pickup: data.pickup._id,
    destination: data.destination?._id,
    requestedFor: data.requestedFor,
    submittedAt: now,
    requestedBy: user.id,
    priority: input.priority,
    status: input.draft ? "Draft" : "Pending",
    notes: input.notes,
    items: data.lines,
    history: [{ label: input.draft ? "Draft saved" : "Submitted", at: now }],
  });

  const saved = await Booking.findById(created._id).populate(STORE_POPULATE).lean();

  // Tell the administrators a booking is waiting (drafts are private, so no alert for them)
  if (!input.draft) {
    const units = data.lines.reduce((sum, line) => sum + line.quantity, 0);
    const urgent = input.priority === "Urgent";
    await notifyAdmins({
      type: "booking",
      severity: urgent ? "warning" : "info",
      title: urgent ? "Urgent booking waiting" : "New booking submitted",
      message: `${user.name} submitted ${created.code} (${data.pickup.name} to ${data.destination.name}) for ${units.toLocaleString("en-US")} units.`,
      link: `/bookings?booking=${created.code}`,
    });
  }

  return presentForStore(saved);
}

// PUT /api/store/bookings/:id  (store manager) - edit, and resubmit when changes were requested
export async function updateStoreBooking(code, input, user) {
  const storeId = requireStore(user);
  const doc = await findVisible(code, storeId);
  assertOwnRequest(doc, storeId);
  if (!STORE_EDITABLE.includes(doc.status)) throw ApiError.conflict("This booking can no longer be edited.");

  const data = await resolveStoreInput(input, storeId);
  const now = new Date();

  const set = {
    pickup: data.pickup._id,
    requestedFor: data.requestedFor,
    priority: input.priority,
    notes: input.notes,
    items: data.lines,
  };
  const update = { $set: set };
  if (data.destination) set.destination = data.destination._id;
  else update.$unset = { destination: 1 };

  // "Save draft" only keeps the edits. "Submit" sends a draft, or resends a booking with requested changes.
  if (!input.draft && doc.status !== "Pending") {
    set.status = "Pending";
    set.submittedAt = now;
    set.adminNote = ""; // the administrator will review it again
    update.$push = { history: { label: doc.status === "Draft" ? "Submitted" : "Resubmitted", at: now } };
  }

  const updated = await Booking.findOneAndUpdate({ _id: doc._id, status: doc.status }, update, { new: true })
    .populate(STORE_POPULATE)
    .lean();
  if (!updated) throw ApiError.conflict("This booking was just changed by someone else. Reload and try again.");

  // A draft was sent, or a booking with requested changes was resubmitted: it needs a new decision
  if (!input.draft && doc.status !== "Pending") {
    const first = doc.status === "Draft";
    await notifyAdmins({
      type: "booking",
      severity: "info",
      title: first ? "New booking submitted" : "Booking resubmitted",
      message: `${user.name} ${first ? "submitted" : "resubmitted"} ${code} for review.`,
      link: `/bookings?booking=${code}`,
    });
  }

  return presentForStore(updated);
}

// PATCH /api/store/bookings/:id/cancel  (store manager)
export async function cancelStoreBooking(code, user) {
  const storeId = requireStore(user);
  const doc = await findVisible(code, storeId);
  assertOwnRequest(doc, storeId);

  const tripStatus = (await tripStatusByBooking([doc._id])).get(String(doc._id));
  const current = storeStatus(doc, tripStatus);
  if (!STORE_CANCELLABLE.includes(current)) {
    throw ApiError.conflict(`A booking that is "${current}" can no longer be cancelled.`);
  }

  const updated = await Booking.findOneAndUpdate(
    { _id: doc._id, status: doc.status },
    { $set: { status: "Cancelled" }, $push: { history: { label: "Cancelled", at: new Date() } } },
    { new: true }
  )
    .populate(STORE_POPULATE)
    .lean();
  if (!updated) throw ApiError.conflict("This booking was just changed by someone else. Reload and try again.");

  await notifyAdmins({
    type: "booking",
    severity: "info",
    title: "Booking cancelled",
    message: `${user.name} cancelled ${code}.`,
    link: `/bookings?booking=${code}`,
  });

  return presentForStore(updated);
}