import Trip from "./trips.model.js";
import Vehicle from "../vehicles/vehicles.model.js";
import ApiError from "../../utils/ApiError.js";

// Business logic and database access for trips lives here.
// Controllers call these functions. Keep req and res out of this file.
// TODO: queries and business rules for trips

// A trip keeps its vehicle and driver busy until it is Completed ("Unallocated" trips have no vehicle yet)
export const ACTIVE_TRIP_STATUSES = ["Scheduled", "In transit", "Delayed"];

// Does this vehicle (Mongo _id) have a trip that has not completed yet?
export async function hasActiveTrip(vehicleId) {
  return Boolean(await Trip.exists({ vehicle: vehicleId, status: { $in: ACTIVE_TRIP_STATUSES } }));
}

// Driver ids (e.g. "DRV-042") that are on an active trip. A driver is assigned to a vehicle, so a driver
// is busy while the vehicle they drive has an active trip. Completing the trip frees them automatically.
export async function getBusyDriverIds({ excludeTripId } = {}) {
  const filter = { status: { $in: ACTIVE_TRIP_STATUSES }, vehicle: { $ne: null } };
  if (excludeTripId) filter._id = { $ne: excludeTripId };
  const vehicleIds = await Trip.distinct("vehicle", filter);
  if (vehicleIds.length === 0) return new Set();
  const vehicles = await Vehicle.find({ _id: { $in: vehicleIds } }).select("driverDetails.id");
  return new Set(vehicles.map((vehicle) => vehicle.driverDetails?.id).filter(Boolean));
}

// Use when a trip is created or its vehicle changes: the vehicle's driver must not already be on another active trip
export async function assertDriverFreeForTrip(vehicleId, options) {
  const vehicle = await Vehicle.findById(vehicleId).select("driverDetails.id driverDetails.name");
  const driverId = vehicle?.driverDetails?.id;
  if (!driverId) return;
  if ((await getBusyDriverIds(options)).has(driverId)) {
    throw ApiError.conflict(`${vehicle.driverDetails.name || driverId} is already on another active trip.`);
  }
}
