import Item from "./items.model.js";
import Store from "../stores/stores.model.js";
import Booking from "../bookings/bookings.model.js";
import ApiError from "../../utils/ApiError.js";

// Business logic and database access for items lives here.
// Controllers call these functions. Keep req and res out of this file.
// The storage hub is a reference to a Store (item.store); the frontend identifies it by store code.

const DEFAULT_UNIT = "unit";
const caseInsensitive = { locale: "en", strength: 2 };

// Fill in the storage hub store name and code
const withStore = (query) => query.populate("store", "code name");

// Throw a 422 that the form shows under the given field
const invalid = (field, message) => ApiError.unprocessable("Please check the highlighted fields.", { errors: [{ field, message }] });

// Map an item document to the record shape the Items screens expect
function toRecord(item) {
  return {
    id: item.code,
    code: item.code,
    name: item.name,
    category: item.category,
    hub: item.store?.name || "",
    hubCode: item.store?.code || "",
    unit: item.unit || DEFAULT_UNIT,
    weightKg: item.weightKg ?? 0,
    volumeM3: item.volumeM3 ?? 0,
    stockOnHand: item.stockOnHand ?? 0,
    stockUnit: item.stockUnit || item.unit || DEFAULT_UNIT,
    reorderLevel: item.reorderLevel ?? 0,
    status: item.status,
    criticalHighSpec: Boolean(item.criticalHighSpec),
    stackable: item.stackable !== false,
    isDraft: Boolean(item.isDraft),
  };
}

// GET /api/items -> [{ code, name, unit }] for the booking item picker (drafts are not bookable)
export async function listItemCatalog() {
  const items = await Item.find({ isDraft: { $ne: true } }).select("code name unit").sort({ code: 1 }).lean();
  return items.map((i) => ({ code: i.code, name: i.name, unit: i.unit }));
}

// GET /api/items/records: every item (drafts included), newest first
export async function listItemRecords() {
  const items = await withStore(Item.find().sort({ createdAt: -1 }));
  return items.map(toRecord);
}

// GET /api/items/next-code: the next free ITM-#### code for the Add Item form
export async function nextItemCode() {
  const items = await Item.find().select("code").lean();
  const highest = items.reduce((max, { code }) => {
    const n = Number(/^ITM-(\d+)$/i.exec(code)?.[1]);
    return Number.isFinite(n) && n > max ? n : max;
  }, 1000);
  return { code: `ITM-${highest + 1}` };
}

// GET /api/items/:id: one item by code (used to pre-fill the edit form)
export async function getItem(code) {
  const item = await withStore(Item.findOne({ code }));
  if (!item) throw ApiError.notFound("Item not found");
  return toRecord(item);
}

// Item names must be unique, so the same item cannot be registered twice under a new code
async function assertNameFree(name, ignoreId) {
  if (!name) return;
  const filter = { name };
  if (ignoreId) filter._id = { $ne: ignoreId };
  if (await Item.exists(filter).collation(caseInsensitive)) throw invalid("name", "An item with this name already exists.");
}

// Pick the storage hub Store by its code (STR-001). Only saved, non-Inactive stores can be newly assigned.
async function pickStore(value, current) {
  const store = await Store.findOne({ code: value });
  if (!store) throw invalid("hub", "Selected storage hub does not exist.");
  const isCurrent = Boolean(current?.store) && String(current.store) === String(store._id);
  if ((store.isDraft || store.status === "Inactive") && !isCurrent) throw invalid("hub", `${store.name} is not active.`);
  return store;
}

// Turn validated request fields into model fields; `current` is the existing item when editing
async function toFields(body, current) {
  const fields = {};
  for (const key of ["name", "category", "weightKg", "volumeM3", "stockOnHand", "reorderLevel", "status", "criticalHighSpec", "stackable"]) {
    if (body[key] !== undefined) fields[key] = body[key];
  }
  if (body.unit) {
    fields.unit = body.unit;
    fields.stockUnit = body.unit;
  }
  if (body.hub !== undefined) fields.store = body.hub ? (await pickStore(body.hub, current))._id : null;
  const draft = body.asDraft ?? body.isDraft;
  if (draft !== undefined) fields.isDraft = draft;
  return fields;
}

// A saved (non-draft) item needs the complete registration; used when a draft is completed or an item is edited
function assertComplete(item) {
  const errors = [];
  if (!item.category) errors.push({ field: "category", message: "Select a catalog category." });
  if (!item.store) errors.push({ field: "hub", message: "Select a primary storage hub." });
  for (const [field, message] of [
    ["weightKg", "Enter a valid unit weight in kg."],
    ["volumeM3", "Enter a valid unit volume in m³."],
    ["stockOnHand", "Enter a valid initial stock quantity."],
    ["reorderLevel", "Enter a valid reorder level."],
  ]) {
    if (item[field] === undefined || item[field] === null) errors.push({ field, message });
  }
  if (errors.length) throw ApiError.unprocessable("Please check the highlighted fields.", { errors });
}

// POST /api/items: create an item, or complete an earlier draft saved with the same code
export async function createItem(body) {
  const asDraft = Boolean(body.asDraft ?? body.isDraft);
  const existing = await Item.findOne({ code: body.code });
  if (existing && !existing.isDraft) throw ApiError.conflict("An item with this code already exists.", { errors: [{ field: "code", message: "Already exists" }] });
  await assertNameFree(body.name, existing?._id);

  const item = existing ?? new Item({ code: body.code });
  item.set(await toFields(body, existing));
  item.isDraft = asDraft;
  // Drafts may miss the category; the model still needs one and the unit used by bookings
  if (asDraft) item.category = item.category || "Finished Goods";
  item.unit = item.unit || DEFAULT_UNIT;
  if (!asDraft) assertComplete(item);
  await item.save();
  return getItem(item.code);
}

// PATCH /api/items/:id: update any item fields; :id is the item code (ITM-1029)
export async function updateItem(code, body) {
  const item = await Item.findOne({ code });
  if (!item) throw ApiError.notFound("Item not found");
  if (body.name !== undefined) await assertNameFree(body.name, item._id);

  item.set(await toFields(body, item));
  if (!item.isDraft) assertComplete(item);
  await item.save();
  return getItem(item.code);
}

// DELETE /api/items/:id: remove the item from MongoDB unless bookings still use it
export async function deleteItem(code) {
  const item = await Item.findOne({ code });
  if (!item) throw ApiError.notFound("Item not found");

  const bookings = await Booking.countDocuments({ "items.item": item._id });
  if (bookings > 0) {
    throw ApiError.conflict(`${item.name} cannot be deleted because it is used in ${bookings} booking${bookings === 1 ? "" : "s"}.`);
  }

  await item.deleteOne();
  return { id: code, message: "Item deleted successfully." };
}
