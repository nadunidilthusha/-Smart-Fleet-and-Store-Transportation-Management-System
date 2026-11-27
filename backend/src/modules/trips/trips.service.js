import Trip from "./trips.model.js";
import Vehicle from "../vehicles/vehicles.model.js";
import Booking from "../bookings/bookings.model.js";
import Store from "../stores/stores.model.js";
import ApiError from "../../utils/ApiError.js";
import { notifyStore } from "../notifications/notifications.service.js";

// Business logic and database access for trips lives here.

export const ACTIVE_TRIP_STATUSES = ["Scheduled", "In transit", "Delayed"];

export async function hasActiveTrip(vehicleId, { session = null } = {}) {
  return Boolean(await Trip.exists({ vehicle: vehicleId, status: { $in: ACTIVE_TRIP_STATUSES } }).session(session));
}

export async function getBusyDriverIds({ excludeTripId } = {}) {
  const filter = { status: { $in: ACTIVE_TRIP_STATUSES }, vehicle: { $ne: null } };
  if (excludeTripId) filter._id = { $ne: excludeTripId };
  const vehicleIds = await Trip.distinct("vehicle", filter);
  if (vehicleIds.length === 0) return new Set();
  const vehicles = await Vehicle.find({ _id: { $in: vehicleIds } }).select("driverDetails.id");
  return new Set(vehicles.map((vehicle) => vehicle.driverDetails?.id).filter(Boolean));
}

export async function assertDriverFreeForTrip(vehicleId, options) {
  const vehicle = await Vehicle.findById(vehicleId).select("driverDetails.id driverDetails.name");
  const driverId = vehicle?.driverDetails?.id;
  if (!driverId) return;
  if ((await getBusyDriverIds(options)).has(driverId)) {
    throw ApiError.conflict(`${vehicle.driverDetails.name || driverId} is already on another active trip.`);
  }
}

export function parseCapacity(text) {
  const value = Number(String(text ?? "").replace(/[^\d.]/g, "")) || 0;
  return { value, unit: /kg/i.test(String(text ?? "")) ? "kg" : "units" };
}

export function calculateLoad(bookings, capacityText) {
  const { value, unit } = parseCapacity(capacityText);
  if (!value) return 0;
  const lines = bookings.flatMap((b) => b.items ?? []);
  const byWeight = unit === "kg" && lines.length > 0 && lines.every((l) => l.item?.weightKg > 0);
  const used = lines.reduce((sum, l) => sum + l.quantity * (byWeight ? l.item.weightKg : 1), 0);
  return Math.round((used / value) * 100);
}

export async function releaseVehicleIfIdle(vehicleId, { session = null } = {}) {
  if (!vehicleId) return false;
  if (await hasActiveTrip(vehicleId, { session })) return false;
  if (await Booking.exists({ vehicle: vehicleId, status: "Approved" }).session(session)) return false;
  const result = await Vehicle.updateOne({ _id: vehicleId, status: "In Use" }, { $set: { status: "Available" } }, { session });
  return result.modifiedCount > 0;
}

export async function revalidateTrip(tripId, { session = null } = {}) {
  const trip = await Trip.findById(tripId).session(session);
  if (!trip) return null;
  const vehicleBefore = trip.vehicle ? String(trip.vehicle) : null;
  const loadBefore = trip.load;

  const bookings = await Booking.find({ _id: { $in: trip.bookings }, status: { $in: ["Approved", "Completed"] } })
    .select("pickup destination status items")
    .populate("items.item", "weightKg")
    .session(session)
    .lean();
  const carrying = bookings.filter((b) => b.status === "Approved");

  trip.bookings = trip.bookings.filter((id) => bookings.some((b) => String(b._id) === String(id)));

  const vehicle = trip.vehicle ? await Vehicle.findById(trip.vehicle).select("capacity").session(session).lean() : null;
  trip.load = vehicle ? calculateLoad(carrying, vehicle.capacity) : 0;

  const notStarted = ["Scheduled", "Unallocated"].includes(trip.status);
  if (bookings.length === 0) {
    if (notStarted) {
      trip.stops = [];
      trip.route = "";
      trip.vehicle = undefined;
      trip.driver = undefined;
      trip.status = "Unallocated";
    }
  } else {
    const needed = new Set(bookings.flatMap((b) => [String(b.pickup), String(b.destination)]));
    const kept = trip.stops.filter((stop) => stop.status !== "Pending" || needed.has(String(stop.store)));
    if (kept.length !== trip.stops.length) {
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

export async function releaseBookingFromTrips({ bookingId, session = null }) {
  const booking = await Booking.findById(bookingId).select("vehicle").session(session).lean();
  const trips = await Trip.find({ bookings: bookingId, status: { $in: ACTIVE_TRIP_STATUSES } }).select("_id").session(session).lean();
  await Booking.updateOne({ _id: bookingId }, { $unset: { vehicle: 1, driver: 1 } }, { session });
  const results = [];
  for (const { _id } of trips) {
    await Trip.updateOne({ _id }, { $pull: { bookings: bookingId } }, { session });
    results.push(await revalidateTrip(_id, { session }));
  }
  await releaseVehicleIfIdle(booking?.vehicle, { session });
  return results.filter(Boolean);
}

/* =====================================================================
   NEW FUNCTIONS: For Admin Trip Creation & Store Views
   ===================================================================== */

export async function createTrip(payload) {
  const { vehiclePlate, bookings, stops, load } = payload;

  // 1. Find Vehicle
  const vehicle = await Vehicle.findOne({ plate: vehiclePlate });
  if (!vehicle) throw ApiError.notFound("Vehicle not found");

  // 2. Find Bookings
  const bookingDocs = await Booking.find({ code: { $in: bookings } });

  // 3. Map Stops
  const storeNames = stops.map((s) => s.storeName);
  const storeDocs = await Store.find({ name: { $in: storeNames } });

  const formattedStops = stops.map((stop, index) => {
    const store = storeDocs.find((s) => s.name === stop.storeName);
    if (!store) throw ApiError.badRequest(`Store not found: ${stop.storeName}`);
    return {
      store: store._id,
      sequence: stop.sequence,
      status: index === 0 ? "Arrived" : "Pending",
      type: stop.type,
    };
  });

  // Generate Route string e.g. "Main Store → Ja-Ela"
  const routeString = stops.map((s) => s.storeName).join(" → ");

  // 4. Generate Code
  const tripCount = await Trip.countDocuments();
  const code = `TR-${String(tripCount + 1).padStart(4, "0")}`;

  // 5. Create Trip
  const trip = await Trip.create({
    code,
    route: routeString,
    vehicle: vehicle._id,
    driver: vehicle.driver,
    bookings: bookingDocs.map((b) => b._id),
    stops: formattedStops,
    load: load,
    status: "Scheduled",
    nextStop: stops[0]?.storeName || "Stop 1",
  });

  // 6. Update Bookings
  await Booking.updateMany(
    { _id: { $in: bookingDocs.map((b) => b._id) } },
    { $set: { vehicle: vehicle._id, driver: vehicle.driver } }
  );

  // 7. Notify all Pickup & Destination stores involved in this trip
  const uniqueStoreIds = [...new Set(formattedStops.map((s) => String(s.store)))];
  await Promise.all(
    uniqueStoreIds.map((storeId) =>
      notifyStore({
        storeId,
        type: "trip",
        severity: "info",
        title: "New trip scheduled",
        message: `Trip ${code} (${routeString}) has been scheduled with vehicle ${vehicle.plate}.`,
        link: `/trip-progress/${code}`,
      })
    )
  );

  return trip;
}

export async function getStoreTrips(user) {
  if (!user.storeId) throw ApiError.forbidden("No store assigned");

  const trips = await Trip.find({ "stops.store": user.storeId })
    .populate("vehicle", "plate type")
    .populate("driver", "name")
    .populate("stops.store", "name")
    .populate("bookings", "code")
    .sort({ createdAt: -1 })
    .lean();

  return trips.map((trip) => ({
    code: trip.code,
    status: trip.status,
    nextStop: trip.nextStop || "Calculating...",
    vehicle: trip.vehicle,
    stops: trip.stops,
    bookings: trip.bookings,
  }));
}

export async function getOneStoreTrip(code, user) {
  if (!user.storeId) throw ApiError.forbidden("No store assigned");

  const trip = await Trip.findOne({ code, "stops.store": user.storeId })
    .populate("vehicle", "plate type")
    .populate("driver", "name")
    .populate("stops.store", "name")
    .populate("bookings", "code")
    .lean();

  if (!trip) throw ApiError.notFound("Trip not found");
  return trip;
}

export async function completeStoreTrip(tripCode, user) {
  if (!user.storeId) throw ApiError.forbidden("No store assigned");

  // 1. Find the trip
  const trip = await Trip.findOne({ code: tripCode, "stops.store": user.storeId });
  if (!trip) throw ApiError.notFound("Trip not found");

  // 2. Update Trip Status
  trip.status = "Completed";
  trip.stops = trip.stops.map((stop) => ({ ...stop, status: "Completed" })); // Mark all stops completed
  await trip.save();

  // 3. Update Bookings inside this trip to 'Completed'
  if (trip.bookings && trip.bookings.length > 0) {
    await Booking.updateMany({ _id: { $in: trip.bookings } }, { $set: { status: "Completed" } });
  }

  // 4. Free up the vehicle
  if (trip.vehicle) {
    await releaseVehicleIfIdle(trip.vehicle);
  }

  return trip;
}