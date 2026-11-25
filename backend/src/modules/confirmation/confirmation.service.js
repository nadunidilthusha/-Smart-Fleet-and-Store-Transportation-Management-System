import GoodsConfirmation, { STAGES } from "./confirmation.model.js";
import Booking from "../bookings/bookings.model.js";
import Trip from "../trips/trips.model.js";
import ApiError from "../../utils/ApiError.js";
import runInTransaction from "../../utils/transaction.js";
import { releaseBookingFromTrips } from "../trips/trips.service.js";
import { notifyAdmins } from "../notifications/notifications.service.js";
import { record } from "../audit/audit.service.js";

// Business logic and database access for goods confirmation lives here.
// Controllers call these functions. Keep req and res out of this file.
//
// One confirmation per booking, three steps in order:
//   prepared  the sending store counts what it packed        (compared with the booked quantity)
//   handover  the sending store gives the goods to the driver (compared with prepared)
//   receipt   the receiving store counts what arrived         (compared with handed over)
// Every quantity is typed in by an employee: nothing is ever copied from the expected quantity.

const MAX_QUANTITY = 1_000_000;
const STAGE_LABEL = { prepared: "Preparation", handover: "Handover", receipt: "Receipt" };
const STATUS_AFTER = { prepared: "prepared", handover: "handed_over", receipt: "confirmed" }; // status once the step is confirmed
const BOOKING_HISTORY = { prepared: "Goods prepared", handover: "Handed over to driver", receipt: "Goods received" };

// Fill in store names, items, vehicle and driver of a booking
const POPULATE = [
  { path: "pickup", select: "name shortName" },
  { path: "destination", select: "name shortName" },
  { path: "items.item", select: "code name unit" },
  { path: "vehicle", select: "plate type" },
  { path: "driver", select: "name" },
];

function requireStore(user) {
  if (!user?.storeId) throw ApiError.forbidden("Your account is not assigned to a store.");
  return String(user.storeId);
}

const sameId = (a, b) => String(a?._id ?? a) === String(b?._id ?? b);
const storeName = (s) => s?.shortName || s?.name || "";

// A cancelled confirmation stays in the database for history, but the booking starts again from step one
const isLive = (conf) => Boolean(conf) && conf.status !== "cancelled";
const isDone = (conf, stage) => isLive(conf) && Boolean(conf.stages?.[stage]?.confirmed);

// The step that is waiting to be done ("done" when the goods were received)
function currentStage(conf) {
  return STAGES.find((s) => !isDone(conf, s)) ?? "done";
}

// Quantity a step is compared with: preparation vs the booking, handover vs preparation, receipt vs handover
function baseQuantity(line, stage) {
  if (stage === "prepared") return line.expected;
  if (stage === "handover") return line.prepared?.qty ?? 0;
  return line.handover?.qty ?? 0;
}

// Quantity difference to the step before and the kind of discrepancy: missing, excess, damaged, incorrect, or several
function classify(qty, base, damaged, incorrect) {
  const difference = qty - base;
  const kinds = [];
  if (difference < 0) kinds.push("missing");
  if (difference > 0) kinds.push("excess");
  if (damaged > 0) kinds.push("damaged");
  if (incorrect > 0) kinds.push("incorrect");
  return { difference, discrepancyType: kinds.length === 0 ? "none" : kinds.length === 1 ? kinds[0] : "multiple" };
}

// Missing, excess, damaged and incorrect units of one item, added up over the confirmed steps
function totalsOf(line, confirmedStages) {
  const totals = { missing: 0, excess: 0, damaged: 0, incorrect: 0 };
  for (const stage of confirmedStages) {
    const step = line[stage];
    if (!step || step.qty == null) continue;
    totals.missing += Math.max(-step.difference, 0);
    totals.excess += Math.max(step.difference, 0);
    totals.damaged += step.damaged;
    totals.incorrect += step.incorrect;
  }
  return totals;
}

// A whole number from 0 to MAX_QUANTITY, or null when left empty (an error is recorded when it is required or invalid)
function readNumber(value, field, label, errors, { required = false } = {}) {
  if (value === "" || value === null || value === undefined) {
    if (required) errors.push({ field, message: `Enter the ${label}.` });
    return null;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > MAX_QUANTITY) {
    errors.push({ field, message: `The ${label} must be a whole number from 0 to ${MAX_QUANTITY.toLocaleString("en-US")}.` });
    return null;
  }
  return n;
}

// Check the typed quantities and build the confirmation lines for the step being saved (earlier steps are kept as they were)
function buildLines({ booking, saved, input, stage, confirm, errors }) {
  const bookedCodes = booking.items.map((l) => l.item.code);
  const typed = new Map();
  for (const line of input.lines) {
    if (typed.has(line.code)) errors.push({ field: `lines.${line.code}`, message: "Each item can only be listed once." });
    if (!bookedCodes.includes(line.code)) errors.push({ field: `lines.${line.code}`, message: `Item ${line.code} is not on this booking.` });
    typed.set(line.code, line);
  }

  return booking.items.map((bookingLine) => {
    const code = bookingLine.item.code;
    const old = saved.find((l) => sameId(l.item, bookingLine.item._id)) ?? {};
    const line = { item: bookingLine.item._id, expected: bookingLine.quantity, prepared: old.prepared, handover: old.handover, receipt: old.receipt };

    const given = typed.get(code);
    if (!given) {
      errors.push({ field: `lines.${code}`, message: `Enter quantities for ${bookingLine.item.name}.` });
      return line;
    }

    const qty = readNumber(given.quantity, `lines.${code}.quantity`, "actual quantity", errors, { required: confirm });
    const damaged = readNumber(given.damaged, `lines.${code}.damaged`, "damaged quantity", errors) ?? 0;
    const incorrect = readNumber(given.incorrect, `lines.${code}.incorrect`, "incorrect quantity", errors) ?? 0;

    // Damaged and incorrect goods are part of the counted quantity, so they cannot be more than it
    if (qty !== null && damaged > qty) errors.push({ field: `lines.${code}.damaged`, message: "Damaged quantity cannot be more than the counted quantity." });
    if (qty !== null && incorrect > qty) errors.push({ field: `lines.${code}.incorrect`, message: "Incorrect quantity cannot be more than the counted quantity." });

    const base = baseQuantity(line, stage);
    const found = qty === null ? { difference: undefined, discrepancyType: "none" } : classify(qty, base, damaged, incorrect);
    line[stage] = { qty: qty ?? undefined, damaged, incorrect, ...found, note: given.note };
    return line;
  });
}

/* =====================================================================
   Reading: the Goods confirmation page
   ===================================================================== */

// Latest trip carrying each booking (bookingId -> trip with vehicle and driver)
async function tripsByBooking(bookingIds) {
  const map = new Map();
  if (!bookingIds.length) return map;
  const trips = await Trip.find({ bookings: { $in: bookingIds }, status: { $ne: "Unallocated" } })
    .sort({ createdAt: 1 })
    .populate([{ path: "vehicle", select: "plate type" }, { path: "driver", select: "name" }])
    .lean();
  for (const trip of trips) for (const id of trip.bookings) map.set(String(id), trip);
  return map;
}

// Status of a booking from the point of view of the signed-in store, used for the queue tabs
function queueStatus(booking, conf, storeId) {
  const sender = sameId(booking.pickup, storeId);
  if (isDone(conf, "receipt")) return "Completed";
  if (sender) {
    if (!isDone(conf, "prepared")) return "To prepare";
    if (!isDone(conf, "handover")) return "Handover";
    return "Waiting"; // on its way, the receiving store has the next step
  }
  return isDone(conf, "handover") ? "Receiving" : "Waiting"; // goods are not with the driver yet
}

const QUEUE_ACTION = { "To prepare": "Prepare goods", Handover: "Hand over", Receiving: "Receive goods", Waiting: "View details", Completed: "View receipt" };
const QUEUE_ORDER = ["Receiving", "Handover", "To prepare", "Waiting", "Completed"];

// The full detail of one booking for the page
function present(booking, conf, trip, storeId) {
  const live = isLive(conf) ? conf : null;
  const stage = currentStage(conf);
  const sender = sameId(booking.pickup, storeId);
  const actingStore = stage === "receipt" ? booking.destination : booking.pickup;

  const lines = booking.items.map((bookingLine) => {
    const saved = live?.lines?.find((l) => sameId(l.item, bookingLine.item._id));
    const step = (key) => ({
      qty: saved?.[key]?.qty ?? null,
      damaged: saved?.[key]?.damaged ?? 0,
      incorrect: saved?.[key]?.incorrect ?? 0,
      difference: saved?.[key]?.difference ?? null,
      discrepancyType: saved?.[key]?.discrepancyType ?? "none",
      note: saved?.[key]?.note ?? "",
    });
    return {
      id: bookingLine.item.code,
      name: bookingLine.item.name,
      unit: bookingLine.item.unit,
      expected: bookingLine.quantity,
      prepared: step("prepared"),
      handover: step("handover"),
      receipt: step("receipt"),
    };
  });

  const vehicle = trip?.vehicle ?? booking.vehicle;
  const driver = trip?.driver ?? booking.driver;

  return {
    id: booking.code,
    tripId: trip?.code ?? "",
    status: live?.status ?? "draft",
    stage,
    role: sender ? "sender" : "receiver",
    canAct: stage !== "done" && booking.status === "Approved" && sameId(actingStore, storeId),
    canCancel: Boolean(live) && live.status !== "confirmed",
    wasCancelled: conf?.status === "cancelled",
    pickup: booking.pickup?.name ?? "",
    destination: booking.destination?.name ?? "",
    hub: storeName(sender ? booking.destination : booking.pickup),
    route: `${booking.pickup?.name ?? ""} → ${booking.destination?.name ?? ""}`,
    vehicle: vehicle ? `${vehicle.plate} · ${vehicle.type}` : "",
    driver: driver?.name ?? "",
    waybill: trip?.waybill ?? "",
    priority: booking.priority,
    requestedFor: booking.requestedFor,
    steps: STAGES.map((key) => {
      const meta = live?.stages?.[key];
      return {
        key,
        label: key === "prepared" ? "Prepared" : key === "handover" ? "Handover" : "Receipt",
        done: Boolean(meta?.confirmed),
        active: stage === key,
        at: meta?.confirmed ? meta.at : null,
        by: meta?.confirmed ? meta.byName ?? "" : "",
        store: key === "receipt" ? booking.destination?.name ?? "" : booking.pickup?.name ?? "",
      };
    }),
    lines,
    notes: { prepared: live?.stages?.prepared?.note ?? "", handover: live?.stages?.handover?.note ?? "", receipt: live?.stages?.receipt?.note ?? "" },
    handoverAt: live?.stages?.handover?.at ?? null,
    resolution: live?.stages?.receipt?.resolution ?? "accept_partial",
    history: (conf?.history ?? []).map((h) => ({ stage: h.stage, action: h.action, by: h.byName ?? "", at: h.at, note: h.note ?? "" })),
  };
}

// GET /api/store/goods-confirmation?booking=BK-1104-0087 -> { active, queue, tabCounts }
export async function getGoodsConfirmation({ booking: code } = {}, user) {
  const storeId = requireStore(user);

  // Approved bookings sent from or to this store, plus finished ones that have a confirmation record
  const done = await GoodsConfirmation.find({ status: "confirmed", $or: [{ store: storeId }, { pickupStore: storeId }] }).select("booking").lean();
  const bookings = await Booking.find({
    $and: [
      { $or: [{ pickup: storeId }, { destination: storeId }] },
      { $or: [{ status: "Approved" }, { _id: { $in: done.map((d) => d.booking) } }] },
    ],
  })
    .sort({ requestedFor: 1 })
    .limit(200)
    .populate(POPULATE)
    .lean();

  const ids = bookings.map((b) => b._id);
  const [confs, trips] = await Promise.all([GoodsConfirmation.find({ booking: { $in: ids } }).lean(), tripsByBooking(ids)]);
  const confOf = (b) => confs.find((c) => sameId(c.booking, b._id));

  const queue = bookings
    .map((b) => {
      const status = queueStatus(b, confOf(b), storeId);
      const trip = trips.get(String(b._id));
      return {
        id: b.code,
        status,
        route: `${b.pickup?.name ?? ""} → ${b.destination?.name ?? ""}`,
        driver: (trip?.driver ?? b.driver)?.name ?? "",
        units: b.items.reduce((sum, l) => sum + l.quantity, 0),
        action: QUEUE_ACTION[status],
      };
    })
    .sort((a, b) => QUEUE_ORDER.indexOf(a.status) - QUEUE_ORDER.indexOf(b.status));

  const tabCounts = { All: queue.length };
  for (const status of QUEUE_ORDER) tabCounts[status] = queue.filter((q) => q.status === status).length;

  // The booking that was asked for, otherwise the first one that needs work from this store
  let chosen = null;
  if (code) {
    chosen = bookings.find((b) => b.code === code);
    if (!chosen) throw ApiError.notFound("Booking not found");
  } else {
    chosen = bookings.find((b) => ["Receiving", "Handover", "To prepare"].includes(queueStatus(b, confOf(b), storeId))) ?? bookings[0] ?? null;
  }

  return {
    active: chosen ? present(chosen, confOf(chosen), trips.get(String(chosen._id)), storeId) : null,
    queue,
    tabCounts,
  };
}

/* =====================================================================
   Writing: save a draft or confirm a step
   ===================================================================== */

// The booking, only when it is sent from or to the signed-in store
async function findBookingFor(code, storeId) {
  const booking = await Booking.findOne({ code, $or: [{ pickup: storeId }, { destination: storeId }] }).populate(POPULATE).lean();
  if (!booking) throw ApiError.notFound("Booking not found");
  return booking;
}

// Short lines for the audit log: what was expected and what was counted
function auditChanges(lines, stage, bookingItems) {
  return lines.slice(0, 30).map((l) => {
    const name = bookingItems.find((b) => sameId(b.item._id, l.item))?.item.code ?? "";
    const step = l[stage];
    const issue = step.discrepancyType === "none" ? "" : ` (${step.discrepancyType}${step.difference ? ` ${step.difference > 0 ? "+" : ""}${step.difference}` : ""})`;
    return { field: name, before: `Expected ${l.expected}`, after: `${STAGE_LABEL[stage]} ${step.qty ?? "not counted"}${issue}` };
  });
}

// POST /api/store/goods-confirmation/draft and /confirm (confirm: false saves a draft, true completes the step)
export async function saveStage(input, user, { confirm, ip }) {
  const storeId = requireStore(user);
  const stage = input.stage;
  const booking = await findBookingFor(input.bookingId, storeId);

  // Preparation and handover belong to the sending store, receipt to the receiving store
  const actingStore = stage === "receipt" ? booking.destination : booking.pickup;
  if (!sameId(actingStore, storeId)) {
    throw ApiError.forbidden(stage === "receipt" ? "Only the receiving store can confirm the receipt." : "Only the sending store can confirm preparation and handover.");
  }
  if (booking.status !== "Approved") throw ApiError.conflict(`A ${booking.status.toLowerCase()} booking cannot be confirmed.`);

  const existing = await GoodsConfirmation.findOne({ booking: booking._id }).lean();
  const live = isLive(existing) ? existing : null;

  // A step can only be confirmed once, and only after the step before it
  if (live?.stages?.[stage]?.confirmed) throw ApiError.conflict(`${STAGE_LABEL[stage]} was already confirmed for ${booking.code}.`);
  const earlier = STAGES[STAGES.indexOf(stage) - 1];
  if (earlier && !live?.stages?.[earlier]?.confirmed) throw ApiError.conflict(`Confirm ${STAGE_LABEL[earlier].toLowerCase()} first.`);

  const errors = [];
  const lines = buildLines({ booking, saved: live?.lines ?? [], input, stage, confirm, errors });
  const hasDiscrepancy = lines.some((l) => l[stage].discrepancyType !== "none");

  if (confirm) {
    // Any difference or damaged goods must be explained, and the employee confirms the count was done by hand
    if (hasDiscrepancy && !input.note) errors.push({ field: "note", message: "Add a discrepancy note to explain the differences." });
    if (!input.acknowledged) errors.push({ field: "acknowledged", message: "Confirm that the physical count matches the quantities entered." });
  }

  // Handover date and time: not in the future and not before the goods were prepared
  const now = new Date();
  let at = now;
  if (stage === "handover" && input.handoverAt) {
    at = new Date(input.handoverAt);
    if (Number.isNaN(at.getTime())) errors.push({ field: "handoverAt", message: "Enter a valid handover date and time." });
    else if (at.getTime() > now.getTime() + 5 * 60 * 1000) errors.push({ field: "handoverAt", message: "The handover time cannot be in the future." });
    else if (live?.stages?.prepared?.at && at < new Date(live.stages.prepared.at)) errors.push({ field: "handoverAt", message: "The handover cannot be before the goods were prepared." });
  }

  if (errors.length) throw ApiError.unprocessable("Please check the highlighted fields.", { errors });

  // Totals only count steps that are confirmed, so a draft never changes the reports
  const confirmedStages = STAGES.filter((s) => (s === stage ? confirm : live?.stages?.[s]?.confirmed));
  for (const line of lines) Object.assign(line, totalsOf(line, confirmedStages));

  const meta = {
    confirmed: confirm,
    at: confirm || (stage === "handover" && input.handoverAt) ? at : live?.stages?.[stage]?.at,
    by: user.id,
    byName: user.name,
    note: input.note,
    resolution: stage === "receipt" ? input.resolution ?? "accept_partial" : undefined,
  };
  const entry = { stage, action: confirm ? "confirmed" : "draft", by: user.id, byName: user.name, at: now, note: input.note };
  const trip = (await tripsByBooking([booking._id])).get(String(booking._id));

  // Save the confirmation and the booking history together
  try {
    await runInTransaction(async (session) => {
      if (!existing) {
        await GoodsConfirmation.create(
          [{ booking: booking._id, trip: trip?._id, store: booking.destination._id, pickupStore: booking.pickup._id, lines, status: confirm ? STATUS_AFTER[stage] : "draft", stages: { [stage]: meta }, history: [entry] }],
          { session }
        );
      } else {
        const set = { lines, trip: trip?._id, status: confirm ? STATUS_AFTER[stage] : live?.status ?? "draft" };
        const unset = {};
        const history = [entry];

        if (live) {
          set[`stages.${stage}`] = meta;
        } else {
          // Restart after a cancellation: clear the old steps, keep the history
          set.stages = { prepared: {}, handover: {}, receipt: {}, [stage]: meta };
          Object.assign(unset, { confirmedBy: 1, confirmedAt: 1, notes: 1 });
          history.unshift({ stage, action: "restarted", by: user.id, byName: user.name, at: now, note: "Confirmation started again" });
        }
        // The receipt closes the confirmation
        if (confirm && stage === "receipt") Object.assign(set, { confirmedBy: user.id, confirmedAt: at, notes: input.note });

        // Only update the record as it was read: a second click or another employee cannot confirm the same step twice
        const guard = { _id: existing._id, status: existing.status, ...(live ? { [`stages.${stage}.confirmed`]: { $ne: true } } : {}) };
        const update = { $set: set, $push: { history: { $each: history } } };
        if (Object.keys(unset).length) update.$unset = unset;
        const doc = await GoodsConfirmation.findOneAndUpdate(guard, update, { new: true, session });
        if (!doc) throw ApiError.conflict("This confirmation was just changed by someone else. Reload and try again.");
      }

      if (confirm) {
        // Booking history, and the booking is Completed once the goods are received
        const bookingUpdate = { $push: { history: { label: BOOKING_HISTORY[stage], at } } };
        if (stage === "receipt") bookingUpdate.$set = { status: "Completed" };
        const result = await Booking.updateOne({ _id: booking._id, status: "Approved" }, bookingUpdate, { session });
        if (result.modifiedCount === 0) throw ApiError.conflict("This booking was just changed. Reload and try again.");
      }
    });
  } catch (err) {
    if (err?.code === 11000) throw ApiError.conflict("This booking already has a confirmation. Reload and try again.");
    throw err;
  }

  if (confirm) {
    await record({
      user,
      action: "UPDATE",
      entity: "Goods confirmation",
      entityCode: booking.code,
      description: `Confirmed ${STAGE_LABEL[stage].toLowerCase()} for booking ${booking.code}${hasDiscrepancy ? " with discrepancies" : ""}`,
      changes: auditChanges(lines, stage, booking.items),
      details: { stage, tripId: trip?.code ?? null },
      ip,
    });
    // Let the administrators know when goods arrived with a problem
    if (stage === "receipt" && hasDiscrepancy) {
      await notifyAdmins({
        type: "booking",
        severity: "warning",
        title: "Goods received with discrepancies",
        message: `${user.name} received ${booking.code} at ${booking.destination.name} with missing, damaged or extra goods.`,
        link: "/reports?report=goods",
      });
    }
  }

  return getGoodsConfirmation({ booking: booking.code }, user);
}

/* =====================================================================
   Cancelling
   ===================================================================== */

// Goods that are already with the driver (or delivered) cannot be cancelled with the booking
export async function assertNotHandedOver(bookingId) {
  if (await GoodsConfirmation.exists({ booking: bookingId, status: { $in: ["handed_over", "confirmed"] } })) {
    throw ApiError.conflict("The goods were already handed over to the driver, so this booking can no longer be cancelled.");
  }
}

// Cancelling a booking also closes its goods confirmation (called by the booking cancellation, inside its transaction)
export async function closeConfirmationForBooking(bookingId, { session = null, user, reason = "Booking cancelled" } = {}) {
  const entry = { stage: "booking", action: "cancelled", by: user?.id, byName: user?.name, at: new Date(), note: reason };
  return GoodsConfirmation.updateOne(
    { booking: bookingId, status: { $nin: ["cancelled", "confirmed"] } },
    { $set: { status: "cancelled" }, $push: { history: entry } },
    { session }
  );
}

// POST /api/store/goods-confirmation/cancel (store manager): cancel the confirmation, free the vehicle and driver, revalidate the trip
export async function cancelConfirmation({ bookingId, reason }, user, { ip }) {
  const storeId = requireStore(user);
  const booking = await findBookingFor(bookingId, storeId);

  const existing = await GoodsConfirmation.findOne({ booking: booking._id }).lean();
  if (!isLive(existing)) throw ApiError.conflict("There is no active goods confirmation to cancel.");
  if (existing.status === "confirmed") throw ApiError.conflict("Goods that were already received cannot be cancelled.");

  const now = new Date();
  // The confirmation, the booking history and the trip recalculation succeed or fail together
  const revalidated = await runInTransaction(async (session) => {
    const doc = await GoodsConfirmation.findOneAndUpdate(
      { _id: existing._id, status: existing.status },
      { $set: { status: "cancelled" }, $push: { history: { stage: currentStage(existing), action: "cancelled", by: user.id, byName: user.name, at: now, note: reason } } },
      { new: true, session }
    );
    if (!doc) throw ApiError.conflict("This confirmation was just changed by someone else. Reload and try again.");

    await Booking.updateOne({ _id: booking._id }, { $push: { history: { label: "Goods confirmation cancelled", at: now } } }, { session });
    // The trip load, route, vehicle and driver are recalculated without this booking
    return releaseBookingFromTrips({ bookingId: booking._id, session });
  });

  await record({
    user,
    action: "CANCEL",
    entity: "Goods confirmation",
    entityCode: booking.code,
    description: `Cancelled goods confirmation for booking ${booking.code}`,
    details: { reason, trips: revalidated.map((t) => t.code) },
    ip,
  });
  await notifyAdmins({
    type: "booking",
    severity: "info",
    title: "Goods confirmation cancelled",
    message: `${user.name} cancelled the goods confirmation for ${booking.code}. ${revalidated.length ? `${revalidated.map((t) => t.code).join(", ")} was recalculated.` : "The booking is not on a trip."}`,
    link: `/bookings?booking=${booking.code}`,
  });

  return { ...(await getGoodsConfirmation({ booking: booking.code }, user)), revalidated };
}
