import Vehicle from "./vehicles.model.js";
import ApiError from "../../utils/ApiError.js";
import { findDriver, findHub, getDrivers, getHubs } from "./vehicles.mockData.js";

// Business logic and database access for vehicles lives here.
// Controllers call these functions. Keep req and res out of this file.

const UNASSIGNED = "Unassigned";

// Load legacy driver/hub references (seed data) so older records still show names
const withRefs = (query) => query.populate("driver", "name").populate("hub", "name shortName");

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
    hub: vehicle.hubDetails?.name || vehicle.hub?.shortName || vehicle.hub?.name || "—",
    hubId: vehicle.hubDetails?.id || "",
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

// Pick a driver by id; empty, "pool" or "Unassigned" clears it. Only Available drivers can be newly assigned.
function pickDriver(value, currentId) {
  if (!value || /unassigned|^pool$/i.test(value)) return null;
  const driver = findDriver(value);
  if (!driver) throw invalid("driver", "Selected driver does not exist.");
  if (driver.status !== "Available" && driver.id !== currentId) throw invalid("driver", `${driver.name} is not available (${driver.status}).`);
  return driver;
}

// Pick a hub by id; only Active hubs can be newly assigned
function pickHub(value, currentId) {
  if (!value) return null;
  const hub = findHub(value);
  if (!hub) throw invalid("hub", "Selected hub does not exist.");
  if (hub.status !== "Active" && hub.id !== currentId) throw invalid("hub", `${hub.name} is not active.`);
  return hub;
}

// Turn validated request fields into model fields; `current` is the existing vehicle when editing
function toFields(body, current) {
  const fields = {};
  for (const key of ["plate", "type", "model", "capacity", "mileage", "fuel", "status", "nextServiceDueKm", "insurancePolicyRef", "documents"]) {
    if (body[key] !== undefined) fields[key] = body[key];
  }
  // Store the selected driver/hub details on the vehicle and drop any legacy reference
  if (body.driver !== undefined) {
    fields.driverDetails = pickDriver(body.driver, current?.driverDetails?.id) ?? {};
    fields.driver = null;
  }
  if (body.hub !== undefined) {
    fields.hubDetails = pickHub(body.hub, current?.hubDetails?.id) ?? {};
    fields.hub = null;
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

// GET /vehicles/options: free vehicles offered when allocating a fleet to a new store
export async function listVehicleOptions() {
  const vehicles = await withRefs(Vehicle.find({ status: { $in: ["Available", "Inactive"] } }).sort({ createdAt: -1 }).limit(12));
  return vehicles.map((vehicle) => {
    const kg = Number(String(vehicle.capacity).replace(/[^\d]/g, "")) || 0;
    const hub = vehicle.hubDetails?.name || vehicle.hub?.shortName || vehicle.hub?.name || "";
    return {
      id: vehicle.code,
      label: vehicle.type,
      capacity: `${Math.max(8, Math.round(kg / 100))} m³`, // rough volume estimate, same rule the frontend used
      model: vehicle.model || "—",
      location: `Available at ${hub.replace(/ (Hub|Store|Center)$/, "")}`,
    };
  });
}

// GET /vehicles/form-options: drivers and hubs for the searchable dropdowns (mock data for now)
export async function listFormOptions() {
  return {
    drivers: getDrivers().map((d) => ({ ...d, value: d.id, label: `${d.name} (${d.id})`, disabled: d.status !== "Available" })),
    hubs: getHubs().map((h) => ({ ...h, value: h.id, label: h.name, disabled: h.status !== "Active" })),
  };
}

// POST /vehicles: create a vehicle, or complete an earlier draft saved with the same ID
export async function createVehicle(body) {
  const asDraft = Boolean(body.asDraft ?? body.isDraft);
  const existing = await Vehicle.findOne({ code: body.id });
  if (existing && !existing.isDraft) throw ApiError.conflict("A vehicle with this ID already exists.", { errors: [{ field: "id", message: "Already exists" }] });

  const fields = toFields(body, existing);
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

  vehicle.set(toFields(body, vehicle));
  await vehicle.save();
  return toRecord(await withRefs(Vehicle.findById(vehicle._id)));
}
