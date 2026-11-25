import Trip from "./trips.model.js";
import Vehicle from "../vehicles/vehicles.model.js";
import Booking from "../bookings/bookings.model.js";
import Store from "../stores/stores.model.js";
import ApiError from "../../utils/ApiError.js";

// Business logic and database access for trips lives here.
// Controllers call these functions. Keep req and res out of this file.
// TODO: queries and business rules for trips

// A trip keeps its vehicle and driver busy until it is Completed ("Unallocated" trips have no vehicle yet)
export const ACTIVE_TRIP_STATUSES = ["Scheduled", "In transit", "Delayed"];

// Does this vehicle (Mongo _id) have a trip that has not completed yet?
export async function hasActiveTrip(vehicleId, { session = null } = {}) {
  return Boolean(await Trip.exists({ vehicle: vehicleId, status: { $in: ACTIVE_TRIP_STATUSES } }).session(session));
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

/* =====================================================================
   Trip revalidation: keeps load, route, vehicle and driver correct when a booking
   (or its goods confirmation) is cancelled. Always call it inside runInTransaction.
   ===================================================================== */

// Bookings that stay on a trip. Cancelled, rejected and draft bookings no longer belong to it.
const LIVE_BOOKING_STATUSES = ["Approved", "Completed"];

// "1,200 units" or "3,500 kg" -> { value: 1200, unit: "units" }
export function parseCapacity(text) {
  const value = Number(String(text ?? "").replace(/[^\d.]/g, "")) || 0;
  return { value, unit: /kg/i.test(String(text ?? "")) ? "kg" : "units" };
}

// Trip load: how full the vehicle is, in percent (same meaning as Trip.load). Kilogram vehicles use item weights when every item has one.
export function calculateLoad(bookings, capacityText) {
  const { value, unit } = parseCapacity(capacityText);
  if (!value) return 0;
  const lines = bookings.flatMap((b) => b.items ?? []);
  const byWeight = unit === "kg" && lines.length > 0 && lines.every((l) => l.item?.weightKg > 0);
  const used = lines.reduce((sum, l) => sum + l.quantity * (byWeight ? l.item.weightKg : 1), 0);
  return Math.round((used / value) * 100);
}

// A vehicle goes back to Available when no active trip and no approved booking still holds it (Maintenance and Inactive are never touched)
export async function releaseVehicleIfIdle(vehicleId, { session = null } = {}) {
  if (!vehicleId) return false;
  if (await hasActiveTrip(vehicleId, { session })) return false;
  if (await Booking.exists({ vehicle: vehicleId, status: "Approved" }).session(session)) return false;
  const result = await Vehicle.updateOne({ _id: vehicleId, status: "In Use" }, { $set: { status: "Available" } }, { session });
  return result.modifiedCount > 0;
}

// Recalculate one trip from the bookings it still carries: load, stops and route, and release the vehicle and driver when nothing is left
export async function revalidateTrip(tripId, { session = null } = {}) {
  const trip = await Trip.findById(tripId).session(session);
  if (!trip) return null;
  const vehicleBefore = trip.vehicle ? String(trip.vehicle) : null;
  const loadBefore = trip.load;

  const bookings = await Booking.find({ _id: { $in: trip.bookings }, status: { $in: LIVE_BOOKING_STATUSES } })
    .select("pickup destination status items")
    .populate("items.item", "weightKg")
    .session(session)
    .lean();
  const carrying = bookings.filter((b) => b.status === "Approved"); // delivered bookings no longer fill the vehicle

  // Drop bookings that were cancelled or removed from the trip
  trip.bookings = trip.bookings.filter((id) => bookings.some((b) => String(b._id) === String(id)));

  // Load is recalculated against the capacity of the vehicle that is still assigned
  const vehicle = trip.vehicle ? await Vehicle.findById(trip.vehicle).select("capacity").session(session).lean() : null;
  trip.load = vehicle ? calculateLoad(carrying, vehicle.capacity) : 0;

  const notStarted = ["Scheduled", "Unallocated"].includes(trip.status);
  if (bookings.length === 0) {
    // Nothing left to carry: a trip that has not left yet gives back its route, vehicle and driver
    if (notStarted) {
      trip.stops = [];
      trip.route = "";
      trip.vehicle = undefined;
      trip.driver = undefined;
      trip.status = "Unallocated";
    }
  } else {
    // Route: remove pending stops that no remaining booking picks up from or delivers to; visited stops stay
    const needed = new Set(bookings.flatMap((b) => [String(b.pickup), String(b.destination)]));
    const kept = trip.stops.filter((stop) => stop.status !== "Pending" || needed.has(String(stop.store)));
    if (kept.length !== trip.stops.length) {
      // Reuse the wording of the existing route text when it lines up with the stops, otherwise use store names
      const labels = String(trip.route ?? "").split("→").map((s) => s.trim());
      if (labels.length === trip.stops.length) {
        trip.route = trip.stops.map((stop, i) => (kept.includes(stop) ? labels[i] : null)).filter(Boolean).join(" → ");
      } else {
        const stores = await Store.find({ _id: { $in: kept.map((s) => s.store) } }).select("name shortName").session(session).lean();
        trip.route = kept.map((s) => stores.find((st) => String(st._id) === String(s.store))?.shortName ?? "").filter(Boolean).join(" → ");
      }
      trip.stops = kept.map((stop, i) => ({ store: stop.store, sequence: i + 1, status: stop.status }));
    }
  }

  await trip.save({ session });
  const vehicleReleased = vehicleBefore ? await releaseVehicleIfIdle(vehicleBefore, { session }) : false;

  return { code: trip.code, loadBefore, load: trip.load, status: trip.status, stops: trip.stops.length, vehicleReleased };
}

// Take a cancelled booking off every active trip, free its vehicle and driver, and revalidate each trip it was on
export async function releaseBookingFromTrips({ bookingId, session = null }) {
  const booking = await Booking.findById(bookingId).select("vehicle").session(session).lean();
  const trips = await Trip.find({ bookings: bookingId, status: { $in: ACTIVE_TRIP_STATUSES } }).select("_id").session(session).lean();

  // The booking itself no longer holds a vehicle or driver
  await Booking.updateOne({ _id: bookingId }, { $unset: { vehicle: 1, driver: 1 } }, { session });

  const results = [];
  for (const { _id } of trips) {
    await Trip.updateOne({ _id }, { $pull: { bookings: bookingId } }, { session });
    results.push(await revalidateTrip(_id, { session }));
  }
  await releaseVehicleIfIdle(booking?.vehicle, { session });
  return results.filter(Boolean);
}
