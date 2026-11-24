import apiClient from "./apiClient";

/*
  Items always use the real backend (MongoDB `items` collection) so data survives a refresh and the
  booking item picker reads the same catalog.

  GET    /items            ->  [{ code, name, unit }]   saved items for booking item pickers (drafts excluded)
  GET    /items/records    ->  [{ id, code, name, category, hub, hubCode, unit, weightKg, volumeM3, stockOnHand, stockUnit,
                                  reorderLevel, status, criticalHighSpec, stackable, isDraft }]
  GET    /items/next-code  ->  { code }                 next free ITM-#### code
  GET    /items/:id        ->  one item record (id is the item code), used by the edit form
  POST   /items            body: Add Item record + asDraft (see mapItemFormToRecord)
  PATCH  /items/:id        body: any item fields (id is the item code)
  DELETE /items/:id        ->  { id, message }
*/

// Catalog categories and units of measure offered by the Add/Edit form and the Items dashboard filters
export const ITEM_CATEGORIES = ["Finished Goods", "Raw Materials", "Sub-Assemblies", "Spare Parts & Fasteners"];
export const ITEM_UNITS = ["unit", "bag", "bottle", "box", "kit", "pack", "pallet", "roll", "spool"];

// Form status keys (Status & Handling tiles) <-> status labels stored by the backend
const STATUS_LABELS = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  reorder_soon: "Reorder Soon",
  critical_low: "Critical Low",
};
const STATUS_KEYS = Object.fromEntries(Object.entries(STATUS_LABELS).map(([key, label]) => [label, key]));

// Backend field names -> Add Item form field names, used to show server validation errors
const SERVER_FIELD_TO_FORM = {
  code: "itemCode",
  name: "itemName",
  category: "category",
  hub: "storageHub",
  unit: "unit",
  weightKg: "weightKg",
  volumeM3: "volumeM3",
  stockOnHand: "stockOnHand",
  reorderLevel: "reorderLevel",
  status: "operationalStatus",
};

// Turn an Axios error into { message, fieldErrors } for banners and per-field messages
export function parseItemError(err, fallback = "Something went wrong. Please try again.") {
  const data = err?.response?.data;
  const fieldErrors = {};
  (data?.errors || []).forEach(({ field, message }) => {
    const name = SERVER_FIELD_TO_FORM[field] || field;
    if (name && !fieldErrors[name]) fieldErrors[name] = message;
  });
  const message = data?.message || (err?.request && !err?.response ? "Cannot reach the server." : err?.message) || fallback;
  return { message, fieldErrors };
}

// Map Add Item form values into the backend payload (the storage hub is sent as a store code)
export function mapItemFormToRecord(formData, { asDraft = false } = {}) {
  return {
    code: formData.itemCode,
    name: formData.itemName,
    category: formData.category || "",
    hub: formData.storageHub || "",
    unit: formData.unit || "unit",
    weightKg: String(formData.weightKg ?? "").replace(/,/g, ""),
    volumeM3: String(formData.volumeM3 ?? "").replace(/,/g, ""),
    stockOnHand: String(formData.stockOnHand ?? "").replace(/,/g, ""),
    reorderLevel: String(formData.reorderLevel ?? "").replace(/,/g, ""),
    status: STATUS_LABELS[formData.operationalStatus] || "In Stock",
    criticalHighSpec: Boolean(formData.criticalHighSpec),
    stackable: Boolean(formData.stackable),
    isDraft: asDraft,
  };
}

// Map a saved item record back into Add/Edit Item form values (pre-fills the edit form)
export function mapItemRecordToForm(record) {
  return {
    itemCode: record.code,
    itemName: record.name || "",
    category: record.category || "",
    storageHub: record.hubCode || "",
    unit: record.unit || "unit",
    weightKg: String(record.weightKg ?? ""),
    volumeM3: String(record.volumeM3 ?? ""),
    stockOnHand: String(record.stockOnHand ?? ""),
    reorderLevel: String(record.reorderLevel ?? ""),
    operationalStatus: STATUS_KEYS[record.status] || "in_stock",
    criticalHighSpec: Boolean(record.criticalHighSpec),
    stackable: record.stackable !== false,
  };
}

// Booking-facing catalog: [{ code, name, unit }]
export async function getItems() {
  const { data } = await apiClient.get("/items");
  return data;
}

// Master-data list for ItemsDashboard (read from MongoDB)
export async function getItemRecords() {
  const { data } = await apiClient.get("/items/records");
  return data;
}

// Next free item code for the Add Item form
export async function getNextItemCode() {
  const { data } = await apiClient.get("/items/next-code");
  return data.code;
}

// Load one saved item by its code (GET /items/:id)
export async function getItem(id) {
  const { data } = await apiClient.get(`/items/${encodeURIComponent(id)}`);
  return data;
}

// Save an item (or draft) to MongoDB and return the saved record
export async function createItem(formData, { asDraft = false } = {}) {
  const record = mapItemFormToRecord(formData, { asDraft });
  const { data } = await apiClient.post("/items", { ...record, asDraft });
  return data;
}

// Save edits to an existing item by its code (PATCH /items/:id); the code itself cannot change
export async function updateItem(id, formData, { asDraft = false } = {}) {
  const record = mapItemFormToRecord(formData, { asDraft });
  delete record.code;
  const { data } = await apiClient.patch(`/items/${encodeURIComponent(id)}`, { ...record, asDraft });
  return data;
}

// Delete an item from MongoDB by its code (DELETE /items/:id)
export async function deleteItem(id) {
  const { data } = await apiClient.delete(`/items/${encodeURIComponent(id)}`);
  return data;
}
