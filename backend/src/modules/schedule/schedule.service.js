import LoadingSlot from "./schedule.model.js";
import Trip from "../trips/trips.model.js";
import Store from "../stores/stores.model.js";
import Vehicle from "../vehicles/vehicles.model.js";
import ApiError from "../../utils/ApiError.js";

const pad = (n) => String(n).padStart(2, "0");
const toLocalDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Strictly use Dispatch Date & Time (trip.scheduledAt),
// falling back only to earliest booking.requestedFor for older trips (NEVER trip.createdAt)
function getTripDispatchAt(trip) {
  if (trip.scheduledAt) {
    const d = new Date(trip.scheduledAt);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const times = (trip.bookings ?? [])
    .map((b) => (b?.requestedFor ? new Date(b.requestedFor).getTime() : NaN))
    .filter((t) => !Number.isNaN(t));

  if (times.length > 0) {
    return new Date(Math.min(...times));
  }

  return null;
}

export async function getScheduleData({ storeId, startDate, endDate }) {
  const slotFilter = {};
  if (storeId) slotFilter.store = storeId;

  if (startDate || endDate) {
    slotFilter.date = {};
    if (startDate) slotFilter.date.$gte = startDate;
    if (endDate) slotFilter.date.$lte = endDate;
  }

  const tripFilter = { status: { $ne: "Unallocated" } };
  if (storeId) tripFilter["stops.store"] = storeId;

  const [slots, allTrips, stores, vehicles] = await Promise.all([
    LoadingSlot.find(slotFilter)
      .populate("store", "name shortName")
      .populate("booking", "code status requestedFor")
      .populate("trip", "code status")
      .sort({ date: 1, startTime: 1 })
      .lean(),

    Trip.find(tripFilter)
      .populate("vehicle", "plate type status")
      .populate("driver", "name")
      .populate("stops.store", "name shortName")
      .populate("bookings", "code requestedFor status")
      .sort({ scheduledAt: 1 })
      .lean(),

    Store.find(storeId ? { _id: storeId } : { status: { $ne: "Inactive" } })
      .select("name shortName status")
      .sort({ name: 1 })
      .lean(),

    storeId
      ? Promise.resolve([])
      : Vehicle.find({ status: { $ne: "Inactive" } })
          .select("plate type status capacity")
          .sort({ plate: 1 })
          .lean(),
  ]);

  // Filter trips strictly by Dispatch Date (scheduledAt / booking.requestedFor), ignoring createdAt
  const trips = allTrips
    .map((trip) => {
      const dispatchAt = getTripDispatchAt(trip);
      return {
        ...trip,
        plannedAt: dispatchAt ? dispatchAt.toISOString() : null,
        plannedDate: dispatchAt ? toLocalDateStr(dispatchAt) : null,
      };
    })
    .filter((trip) => {
      if (!trip.plannedDate) return false;
      if (startDate && trip.plannedDate < startDate) return false;
      if (endDate && trip.plannedDate > endDate) return false;
      return true;
    });

  return { slots, trips, vehicles, stores };
}

// BE-6 & BE-7: Reserve a slot and detect conflicts
export async function reserveSlotForBooking({ storeId, requestedFor, bookingId }) {
  const store = await Store.findById(storeId);
  if (!store) throw ApiError.notFound("Store not found");

  const requestedDate = new Date(requestedFor);

  // Use local time components to prevent timezone shifting
  const dateStr = toLocalDateStr(requestedDate);
  const startTime = `${pad(requestedDate.getHours())}:${pad(requestedDate.getMinutes())}`;

  // Create a 1-hour window for the slot
  const endTimeDate = new Date(requestedDate.getTime() + 60 * 60000);
  const endTime = `${pad(endTimeDate.getHours())}:${pad(endTimeDate.getMinutes())}`;

  // 1. Check Operating Hours
  const open = store.operatingHours?.open || "06:00";
  const close = store.operatingHours?.close || "20:00";
  if (startTime < open || endTime > close) {
    throw ApiError.badRequest(`Time is outside store hours (${open} - ${close}) for ${store.name}`);
  }

  // 2. Check Simultaneous Vehicle Capacity (Overlaps)
  const overlappingSlots = await LoadingSlot.countDocuments({
    store: storeId,
    date: dateStr,
    status: "Reserved",
    $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
  });

  const maxCapacity = store.loadingSlotRules?.maxSimultaneousVehicles || 2;
  if (overlappingSlots >= maxCapacity) {
    throw ApiError.conflict(`This time slot is fully booked at ${store.name}. Please choose another time.`);
  }

  // 3. Reserve
  return await LoadingSlot.create({
    store: storeId,
    date: dateStr,
    startTime,
    endTime,
    status: "Reserved",
    booking: bookingId,
  });
}

// Rollback helper if a second slot reservation fails
export async function releaseSlotById(slotId) {
  if (!slotId) return;
  await LoadingSlot.deleteOne({ _id: slotId });
}