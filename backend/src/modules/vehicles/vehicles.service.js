import Vehicle from "./vehicles.model.js";
import ApiError from "../../utils/ApiError.js";
import Store from "../stores/stores.model.js";
import { findDriver, getDrivers } from "./vehicles.mockData.js";
import { getBusyDriverIds, hasActiveTrip } from "../trips/trips.service.js";

// Business logic and database access for vehicles lives here.
// Controllers call these functions. Keep req and res out of this file.

const UNASSIGNED = "Unassigned";

// Load the driver (legacy) and the hub Store so records show names; the hub is a real Store reference
const withRefs = (query) => query.populate("driver", "name").populate("hub", "code name shortName");

// Copy a stored driver/hub snapshot into a plain object, or null when nothing was selected
const snapshot = (details) => (details?.id ? details.toObject() : null);

// Map a vehicle document to the record shape the Vehicles screens expect
function toRecord(vehicle) {
  return {
    id: vehicle.code,
    plate: vehicle.plate,
    type: vehicle.type,
    model: vehicle.model || "—",
    driver: vehicle.driverDetails?.name || vehicle.driver?.name || UNASSIGNED,
    driverId: vehicle.driverDetails?.id || "",
    driverDetails: snapshot(vehicle.driverDetails),
    capacity: vehicle.capacity,
    hub: vehicle.hub?.name || vehicle.hubDetails?.name || "—", // old records may still hold a hub snapshot instead of a Store
    hubId: vehicle.hub?.code || vehicle.hubDetails?.id || "",
    hubDetails: snapshot(vehicle.hubDetails),
    mileage: vehicle.mileage || "0 km",
    fuel: vehicle.fuel,
    status: vehicle.status,
    isDraft: vehicle.isDraft,
    revenueLicenseExpiry: vehicle.revenueLicenseExpiry ? vehicle.revenueLicenseExpiry.toISOString().slice(0, 10) : "",
    nextServiceDueKm: vehicle.nextServiceDueKm || "",
    insurancePolicyRef: vehicle.insurancePolicyRef || "",
    documents: (vehicle.documents || []).map(({ name, url, size, type }) => ({ name, url, size, type })),
  };
}

// Throw a 422 that the form shows under the given field
const invalid = (field, message) => ApiError.unprocessable("Please check the highlighted fields.", { errors: [{ field, message }] });

// Driver status as shown to the user: "On Trip" comes from real trips, other states from the driver record
const driverStatus = (driver, busyDriverIds) => (busyDriverIds.has(driver.id) ? "On Trip" : driver.status);

// Pick a driver by id; empty, "pool" or "Unassigned" clears it. Only Available drivers (not on an active trip) can be newly assigned.
function pickDriver(value, currentId, busyDriverIds) {
  if (!value || /unassigned|^pool$/i.test(value)) return null;
  const driver = findDriver(value);
  if (!driver) throw invalid("driver", "Selected driver does not exist.");
  const status = driverStatus(driver, busyDriverIds);
  if (status !== "Available" && driver.id !== currentId) throw invalid("driver", `${driver.name} is not available (${status}).`);
  return driver;
}

// Pick the hub Store by its code (STR-001). Returns { store }, null to clear, or { keep: true } for an old hub snapshot left unchanged.
// Only saved, non-Inactive stores can be newly assigned.
async function pickHub(value, current) {
  if (!value) return null;
  const store = await Store.findOne({ code: value });
  if (store) {
    const isCurrent = Boolean(current?.hub) && String(current.hub) === String(store._id);
    if ((store.isDraft || store.status === "Inactive") && !isCurrent) throw invalid("hub", `${store.name} is not active.`);
    return { store };
  }
  if (value === current?.hubDetails?.id) return { keep: true };
  throw invalid("hub", "Selected store does not exist.");
}

// Turn validated request fields into model fields; `current` is the existing vehicle when editing
async function toFields(body, current, busyDriverIds = new Set()) {
  const fields = {};
  for (const key of ["plate", "type", "model", "capacity", "mileage", "fuel", "status", "nextServiceDueKm", "insurancePolicyRef", "documents"]) {
    if (body[key] !== undefined) fields[key] = body[key];
  }
  // Store the selected driver details on the vehicle and drop any legacy reference
  if (body.driver !== undefined) {
    fields.driverDetails = pickDriver(body.driver, current?.driverDetails?.id, busyDriverIds) ?? {};
    fields.driver = null;
  }
  // The hub is a reference to the Store document; any old hub snapshot is cleared
  if (body.hub !== undefined) {
    const picked = await pickHub(body.hub, current);
    if (!picked?.keep) {
      fields.hub = picked?.store._id ?? null;
      fields.hubDetails = {};
    }
  }
  if (body.revenueLicenseExpiry !== undefined) fields.revenueLicenseExpiry = body.revenueLicenseExpiry || null;
  const draft = body.asDraft ?? body.isDraft;
  if (draft !== undefined) fields.isDraft = draft;
  return fields;
}

// GET /vehicles: every vehicle (drafts included), newest first
export async function listVehicles() {
  const vehicles = await withRefs(Vehicle.find().sort({ createdAt: -1 }));
  return vehicles.map(toRecord);
}

// GET /vehicles/:id: one vehicle by code, used to pre-fill the edit form
export async function getVehicle(code) {
  const vehicle = await withRefs(Vehicle.findOne({ code }));
  if (!vehicle) throw ApiError.notFound("Vehicle not found");
  return toRecord(vehicle);
}

// GET /vehicles/options: every saved vehicle, with whether it can be assigned to this store
// A vehicle is selectable only when it has no hub, or it is already based at the store being edited.
// Pass the store code when editing so those vehicles stay selectable. There is no row limit.
export async function listVehicleOptions(storeCode) {
  const store = storeCode ? await Store.findOne({ code: storeCode }).select("_id name").lean() : null;
  const vehicles = await withRefs(Vehicle.find().sort({ code: 1 })); // full fleet, including ones already assigned
  return vehicles.map((vehicle) => {
    const kg = Number(String(vehicle.capacity).replace(/[^\d]/g, "")) || 0;
    const hubName = vehicle.hub?.name || vehicle.hubDetails?.name || "";
    const hubCode = vehicle.hub?.code || "";
    const atThisStore = Boolean(store && vehicle.hub && String(vehicle.hub._id) === String(store._id));
    const takenElsewhere = Boolean(vehicle.hub && !atThisStore);
    const draft = Boolean(vehicle.isDraft);
    return {
      id: vehicle.code,
      label: vehicle.type,
      plate: vehicle.plate || "",
      status: vehicle.status,
      capacity: `${Math.max(8, Math.round(kg / 100))} m³`, // rough volume estimate, same rule the frontend used
      model: vehicle.model || "—",
      hub: hubName,
      hubCode,
      selectable: !takenElsewhere && !draft, // free, or already based at the store being edited
      assignment: draft ? "draft" : atThisStore ? "this-store" : takenElsewhere ? "other-store" : "available",
      location: draft ? "Draft — finish the vehicle before assigning it" : atThisStore ? "Assigned to this store" : takenElsewhere ? `Assigned to ${hubName}` : "Available",
    };
  });
}

// GET /vehicles/form-options: drivers (mock data for now) and hubs (real Stores) for the searchable dropdowns
// Pass the vehicle code when editing so that vehicle's current driver and hub stay selectable
export async function listFormOptions(vehicleCode) {
  const busyDriverIds = await getBusyDriverIds();
  const current = vehicleCode ? await Vehicle.findOne({ code: vehicleCode }).select("driverDetails.id hub hubDetails") : null;
  const currentDriverId = current?.driverDetails?.id;

  const stores = await Store.find({ isDraft: { $ne: true } }).sort({ name: 1 }).lean();
  const hubs = stores.map((s) => ({
    id: s.code,
    name: s.name,
    location: s.district || "",
    address: s.address || "",
    status: s.status,
    value: s.code,
    label: s.name,
    disabled: s.status === "Inactive" && String(current?.hub) !== String(s._id),
  }));
  // A hub saved before real stores existed stays selectable so editing does not lose it
  const legacy = current?.hubDetails;
  if (legacy?.id && !hubs.some((h) => h.value === legacy.id)) {
    hubs.push({ id: legacy.id, name: legacy.name, location: legacy.location || "", address: legacy.address || "", status: legacy.status || "", value: legacy.id, label: legacy.name, disabled: false });
  }

  return {
    drivers: getDrivers().map((d) => {
      const status = driverStatus(d, busyDriverIds);
      return { ...d, status, value: d.id, label: `${d.name} (${d.id})`, disabled: status !== "Available" && d.id !== currentDriverId };
    }),
    hubs,
  };
}

// POST /vehicles: create a vehicle, or complete an earlier draft saved with the same ID
export async function createVehicle(body) {
  const asDraft = Boolean(body.asDraft ?? body.isDraft);
  const existing = await Vehicle.findOne({ code: body.id });
  if (existing && !existing.isDraft) throw ApiError.conflict("A vehicle with this ID already exists.", { errors: [{ field: "id", message: "Already exists" }] });

  const busyDriverIds = body.driver !== undefined ? await getBusyDriverIds() : undefined;
  const fields = await toFields(body, existing, busyDriverIds);
  // Drafts always stay Inactive and may miss type and capacity
  fields.isDraft = asDraft;
  if (asDraft) {
    fields.status = "Inactive";
    fields.type = fields.type || "Vehicle";
    fields.capacity = fields.capacity || "0 kg";
  }

  const vehicle = existing ?? new Vehicle({ code: body.id });
  vehicle.set(fields);
  await vehicle.save();
  return toRecord(await withRefs(Vehicle.findById(vehicle._id)));
}

// PATCH /vehicles/:id: update any vehicle fields; :id is the vehicle code (VH-001)
export async function updateVehicle(code, body) {
  const vehicle = await Vehicle.findOne({ code });
  if (!vehicle) throw ApiError.notFound("Vehicle not found");

  let busyDriverIds;
  if (body.driver !== undefined) {
    busyDriverIds = await getBusyDriverIds();
    // The driver of a vehicle that is on a trip cannot be swapped until that trip completes
    const newId = findDriver(body.driver)?.id ?? "";
    if (newId !== (vehicle.driverDetails?.id || "") && (await hasActiveTrip(vehicle._id))) {
      throw invalid("driver", "This vehicle has an active trip. Its driver can be changed once the trip is completed.");
    }
  }
  vehicle.set(await toFields(body, vehicle, busyDriverIds));
  await vehicle.save();
  return toRecord(await withRefs(Vehicle.findById(vehicle._id)));
}

// DELETE /vehicles/:id: remove the vehicle from MongoDB (vehicles on an active trip cannot be deleted)
export async function deleteVehicle(code) {
  const vehicle = await Vehicle.findOne({ code });
  if (!vehicle) throw ApiError.notFound("Vehicle not found");
  if (await hasActiveTrip(vehicle._id)) throw ApiError.conflict("This vehicle has an active trip and cannot be deleted. Complete the trip first.");
  await vehicle.deleteOne();
  return { id: code, message: "Vehicle deleted successfully." };
}
