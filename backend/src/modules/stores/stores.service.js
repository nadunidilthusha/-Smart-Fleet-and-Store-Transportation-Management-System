import Store from "./stores.model.js";
import Vehicle from "../vehicles/vehicles.model.js";
import Booking from "../bookings/bookings.model.js";
import User from "../users/users.model.js";
import Item from "../items/items.model.js";
import ApiError from "../../utils/ApiError.js";

// Business logic and database access for stores lives here.
// Controllers call these functions. Keep req and res out of this file.
// A vehicle belongs to a store through vehicle.hub (the store's _id), so vehicle counts and the
// assigned-vehicle list are always read from the Vehicles collection.

const DASH = "—";
const caseInsensitive = { locale: "en", strength: 2 };

// Throw a 422 that the form shows under the given field
const invalid = (field, message) => ApiError.unprocessable("Please check the highlighted fields.", { errors: [{ field, message }] });

// Map a store document to the record shape the Stores screens expect
function toRecord(store, vehicleCodes = []) {
  return {
    id: store.code,
    code: store.code,
    name: store.name,
    shortName: store.shortName || "",
    type: store.type || "Regional Store",
    manager: store.manager || DASH,
    phone: store.phone || DASH,
    dispatchEmail: store.dispatchEmail || "",
    district: store.district || DASH,
    address: store.address || "",
    vehicles: vehicleCodes.length,
    assignedVehicles: vehicleCodes,
    usedM3: store.usedM3 || 0,
    capacityM3: store.capacityM3 || 0,
    alertThreshold: store.alertThreshold ?? "",
    loadingBays: store.loadingBays ?? "",
    status: store.status,
    lowStock: Boolean(store.lowStock),
    isDraft: Boolean(store.isDraft),
  };
}

// storeId -> [vehicle codes] for the given stores
async function vehicleCodesByStore(storeIds) {
  const vehicles = await Vehicle.find({ hub: { $in: storeIds } }).select("code hub").sort({ code: 1 }).lean();
  const map = new Map();
  for (const vehicle of vehicles) {
    const key = String(vehicle.hub);
    map.set(key, [...(map.get(key) ?? []), vehicle.code]);
  }
  return map;
}

// GET /stores/records: every store (drafts included), newest first
export async function listStoreRecords() {
  const stores = await Store.find().sort({ createdAt: -1 });
  const codes = await vehicleCodesByStore(stores.map((s) => s._id));
  return stores.map((store) => toRecord(store, codes.get(String(store._id))));
}

// GET /stores: stores that can be picked in dropdowns (bookings pickup/destination, users, items): saved, not drafts, not Inactive
// Returns { id, code, name }; id and name are what the older { id, name } consumers read, code is extra.
export async function listStoreOptions() {
  const stores = await Store.find({ isDraft: { $ne: true }, status: { $ne: "Inactive" } }).select("code name").sort({ name: 1 }).lean();
  return stores.map((store) => ({ id: String(store._id), code: store.code, name: store.name }));
}

// GET /stores/next-code: the next free STR-### code for the Add Store form
export async function nextStoreCode() {
  const stores = await Store.find().select("code").lean();
  const highest = stores.reduce((max, { code }) => {
    const n = Number(/^STR-(\d+)$/i.exec(code)?.[1]);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return { code: `STR-${String(highest + 1).padStart(3, "0")}` };
}

// GET /stores/:id: one store by code (used to pre-fill the edit form)
export async function getStore(code) {
  const store = await Store.findOne({ code });
  if (!store) throw ApiError.notFound("Store not found");
  const codes = await vehicleCodesByStore([store._id]);
  return toRecord(store, codes.get(String(store._id)));
}

// Store names are how bookings find a store, so two stores cannot share a name
async function assertNameFree(name, ignoreId) {
  if (!name) return;
  const filter = { name };
  if (ignoreId) filter._id = { $ne: ignoreId };
  if (await Store.exists(filter).collation(caseInsensitive)) throw invalid("name", "A store with this name already exists.");
}

// Turn validated request fields into model fields
function toFields(body) {
  const fields = {};
  for (const key of ["name", "type", "manager", "phone", "dispatchEmail", "district", "address", "capacityM3", "alertThreshold", "loadingBays", "status"]) {
    if (body[key] !== undefined) fields[key] = body[key] ?? null;
  }
  const draft = body.asDraft ?? body.isDraft;
  if (draft !== undefined) fields.isDraft = draft;
  return fields;
}

// A saved (non-draft) store needs the complete registration; used when a draft is completed or a store is edited
function assertComplete(store) {
  const required = [
    ["type", "Select a store type."],
    ["manager", "Manager name is required."],
    ["phone", "Contact phone is required."],
    ["dispatchEmail", "Enter a valid dispatch email."],
    ["district", "Select a district."],
    ["address", "Physical facility address is required."],
    ["capacityM3", "Enter a valid storage capacity."],
    ["alertThreshold", "Enter a valid alert threshold."],
  ];
  const errors = required.filter(([field]) => !store[field]).map(([field, message]) => ({ field, message }));
  if (errors.length) throw ApiError.unprocessable("Please check the highlighted fields.", { errors });
}

// Make `codes` the vehicles based at this store: they move here, and vehicles no longer listed are released
async function allocateVehicles(store, codes) {
  const vehicles = await Vehicle.find({ code: { $in: codes } }).select("_id code");
  const missing = codes.filter((code) => !vehicles.some((v) => v.code === code));
  if (missing.length) throw invalid("assignedVehicles", `Vehicle ${missing.join(", ")} was not found.`);

  const ids = vehicles.map((v) => v._id);
  await Vehicle.updateMany({ hub: store._id, _id: { $nin: ids } }, { $set: { hub: null } });
  if (ids.length) await Vehicle.updateMany({ _id: { $in: ids } }, { $set: { hub: store._id, hubDetails: {} } });
}

// POST /stores: create a store, or complete an earlier draft saved with the same code
export async function createStore(body) {
  const asDraft = Boolean(body.asDraft ?? body.isDraft);
  const existing = await Store.findOne({ code: body.code });
  if (existing && !existing.isDraft) throw ApiError.conflict("A store with this code already exists.", { errors: [{ field: "code", message: "Already exists" }] });
  await assertNameFree(body.name, existing?._id);

  const store = existing ?? new Store({ code: body.code });
  store.set(toFields(body));
  store.isDraft = asDraft;
  if (asDraft) store.status = "Inactive"; // drafts stay Inactive until they are completed
  else assertComplete(store);
  await store.save();

  if (body.assignedVehicles !== undefined) await allocateVehicles(store, body.assignedVehicles);
  return getStore(store.code);
}

// PATCH /stores/:id: update any store fields; :id is the store code (STR-001)
export async function updateStore(code, body) {
  const store = await Store.findOne({ code });
  if (!store) throw ApiError.notFound("Store not found");
  if (body.name !== undefined) await assertNameFree(body.name, store._id);

  store.set(toFields(body));
  if (store.isDraft) store.status = "Inactive";
  else assertComplete(store);
  await store.save();

  if (body.assignedVehicles !== undefined) await allocateVehicles(store, body.assignedVehicles);
  return getStore(store.code);
}

// DELETE /stores/:id: remove the store from MongoDB unless other records still point to it
export async function deleteStore(code) {
  const store = await Store.findOne({ code });
  if (!store) throw ApiError.notFound("Store not found");

  const [vehicles, bookings, users, items] = await Promise.all([
    Vehicle.countDocuments({ hub: store._id }),
    Booking.countDocuments({ $or: [{ pickup: store._id }, { destination: store._id }] }),
    User.countDocuments({ store: store._id }),
    Item.countDocuments({ store: store._id }),
  ]);
  const inUse = [
    [vehicles, "vehicle"],
    [bookings, "booking"],
    [users, "user"],
    [items, "item"],
  ]
    .filter(([count]) => count > 0)
    .map(([count, label]) => `${count} ${label}${count === 1 ? "" : "s"}`);
  if (inUse.length) {
    throw ApiError.conflict(`${store.name} cannot be deleted because it is still used by ${inUse.join(", ")}. Reassign or remove them first.`);
  }

  await store.deleteOne();
  return { id: code, message: "Store deleted successfully." };
}
