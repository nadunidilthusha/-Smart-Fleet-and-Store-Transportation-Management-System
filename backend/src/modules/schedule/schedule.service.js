import LoadingSlot from "./schedule.model.js";
import Trip from "../trips/trips.model.js";
import Store from "../stores/stores.model.js";
import ApiError from "../../utils/ApiError.js";

export async function getScheduleData({ storeId, startDate, endDate }) {
  const filter = {};
  if (storeId) filter.store = storeId;

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = startDate;
    if (endDate) filter.date.$lte = endDate;
  }

  const slots = await LoadingSlot.find(filter)
    .populate("store", "name shortName")
    .populate("booking", "code status")
    .populate("trip", "code status")
    .sort({ date: 1, startTime: 1 });

  const tripFilter = {};
  if (storeId) tripFilter["stops.store"] = storeId;
  if (startDate || endDate) {
    tripFilter.createdAt = {};
    if (startDate) tripFilter.createdAt.$gte = new Date(startDate);
    if (endDate) tripFilter.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
  }

  const trips = await Trip.find(tripFilter)
    .populate("vehicle", "plate type")
    .populate("driver", "name")
    .populate("stops.store", "name shortName")
    .sort({ createdAt: 1 });

  return { slots, trips };
}

// BE-6 & BE-7: Reserve a slot and detect conflicts
export async function reserveSlotForBooking({ storeId, requestedFor, bookingId }) {
  const store = await Store.findById(storeId);
  if (!store) throw ApiError.notFound("Store not found");

  const requestedDate = new Date(requestedFor);
  const pad = (n) => String(n).padStart(2, "0");

  // Use local time components to prevent timezone shifting
  const dateStr = `${requestedDate.getFullYear()}-${pad(requestedDate.getMonth() + 1)}-${pad(requestedDate.getDate())}`;
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