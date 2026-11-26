import LoadingSlot from "./schedule.model.js";
import Trip from "../trips/trips.model.js";

export async function getScheduleData({ storeId, startDate, endDate }) {
  const filter = {};
  if (storeId) filter.store = storeId;
  
  // If dates are provided, filter by them
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = startDate;
    if (endDate) filter.date.$lte = endDate;
  }

  // 1. Fetch Store Loading Slots
  const slots = await LoadingSlot.find(filter)
    .populate("store", "name shortName")
    .populate("booking", "code status")
    .populate("trip", "code status")
    .sort({ date: 1, startTime: 1 });

  // 2. Fetch Active Trips for the timeline
  const tripFilter = {};
  if (storeId) tripFilter["stops.store"] = storeId;
  if (startDate || endDate) {
    tripFilter.createdAt = {};
    // Assuming trips are planned within a few days of creation
    if (startDate) tripFilter.createdAt.$gte = new Date(startDate);
    if (endDate) tripFilter.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59));
  }

  const trips = await Trip.find(tripFilter)
    .populate("vehicle", "plate type")
    .populate("driver", "name")
    .populate("stops.store", "name shortName")
    .sort({ createdAt: 1 });

  return {
    slots,
    trips
  };
}