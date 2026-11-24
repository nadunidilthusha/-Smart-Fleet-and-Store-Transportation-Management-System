import apiClient from "./apiClient";

/*
  Stores always use the real backend (MongoDB `stores` collection) so data survives a refresh and every
  screen that needs a store (bookings, vehicles, users, items) reads the same list.

  GET    /stores            ->  [{ id, code, name }]   saved, active stores for dropdowns (id = database id, code = STR-001)
  GET    /stores/records    ->  [{ id, code, name, type, manager, phone, district, vehicles, usedM3, capacityM3, status, lowStock, isDraft, ... }]
  GET    /stores/next-code  ->  { code }               next free STR-### code
  GET    /stores/:id        ->  one store record (id is the store code), used by the edit form
  POST   /stores            body: Add Store record + asDraft (see mapStoreFormToRecord)
  PATCH  /stores/:id        body: any store fields (id is the store code)
  DELETE /stores/:id        ->  { id, message }
*/

// Store types offered by the Add/Edit form and the Stores dashboard filters
export const STORE_TYPES = ["Central Hub", "Regional Store", "Distribution", "Cold Storage"];

// Form status keys (Basic Store Information tiles) <-> status labels stored by the backend
const STATUS_LABELS = {
  active: "Active",
  high_capacity: "High Capacity",
  inactive: "Inactive",
};
const STATUS_KEYS = Object.fromEntries(Object.entries(STATUS_LABELS).map(([key, label]) => [label, key]));

// Backend field names -> Add Store form field names, used to show server validation errors
const SERVER_FIELD_TO_FORM = {
  code: "storeCode",
  name: "storeName",
  type: "storeType",
  status: "operationalStatus",
  manager: "managerName",
  phone: "contactPhone",
  dispatchEmail: "dispatchEmail",
  district: "district",
  address: "address",
  capacityM3: "storageCapacity",
  alertThreshold: "alertThreshold",
  loadingBays: "loadingBays",
  assignedVehicles: "assignedVehicles",
};

// Turn an Axios error into { message, fieldErrors } for banners and per-field messages
export function parseStoreError(err, fallback = "Something went wrong. Please try again.") {
  const data = err?.response?.data;
  const fieldErrors = {};
  (data?.errors || []).forEach(({ field, message }) => {
    const name = SERVER_FIELD_TO_FORM[field] || field;
    if (name && !fieldErrors[name]) fieldErrors[name] = message;
  });
  const message = data?.message || (err?.request && !err?.response ? "Cannot reach the server." : err?.message) || fallback;
  return { message, fieldErrors };
}

// Map Add Store form values into the backend payload (the backend owns usage, vehicle counts and alerts)
export function mapStoreFormToRecord(formData, { asDraft = false } = {}) {
  return {
    code: formData.storeCode,
    name: formData.storeName,
    type: formData.storeType || "",
    status: asDraft ? "Inactive" : STATUS_LABELS[formData.operationalStatus] || "Active",
    manager: formData.managerName || "",
    phone: formData.contactPhone || "",
    dispatchEmail: formData.dispatchEmail || "",
    district: formData.district || "",
    address: formData.address || "",
    capacityM3: String(formData.storageCapacity || "").replace(/,/g, ""),
    alertThreshold: String(formData.alertThreshold || ""),
    loadingBays: String(formData.loadingBays || ""),
    assignedVehicles: formData.assignedVehicles || [],
    isDraft: asDraft,
  };
}

// The dashboard shows "—" for empty values; the form should show them as empty
const blank = (value) => (value && value !== "—" ? String(value) : "");

// Map a saved store record back into Add/Edit Store form values (pre-fills the edit form)
export function mapStoreRecordToForm(record) {
  return {
    storeCode: record.code,
    storeName: record.name || "",
    storeType: record.type || "",
    operationalStatus: STATUS_KEYS[record.status] || "active",
    managerName: blank(record.manager),
    contactPhone: blank(record.phone),
    dispatchEmail: record.dispatchEmail || "",
    district: blank(record.district),
    address: record.address || "",
    storageCapacity: record.capacityM3 ? String(record.capacityM3) : "",
    alertThreshold: record.alertThreshold === "" ? "" : String(record.alertThreshold ?? ""),
    loadingBays: record.loadingBays === "" ? "" : String(record.loadingBays ?? ""),
    assignedVehicles: record.assignedVehicles || [],
  };
}

// Dropdown list used by bookings, users and items: [{ id, code, name }]
export async function getStores() {
  const { data } = await apiClient.get("/stores");
  return data;
}

// Master-data list for StoresDashboard (read from MongoDB)
export async function getStoreRecords() {
  const { data } = await apiClient.get("/stores/records");
  return data;
}

// Next free store code for the Add Store form
export async function getNextStoreCode() {
  const { data } = await apiClient.get("/stores/next-code");
  return data.code;
}

// Load one saved store by its code (GET /stores/:id)
export async function getStore(id) {
  const { data } = await apiClient.get(`/stores/${encodeURIComponent(id)}`);
  return data;
}

// Save a store (or draft) to MongoDB and return the saved record
export async function createStore(formData, { asDraft = false } = {}) {
  const record = mapStoreFormToRecord(formData, { asDraft });
  const { data } = await apiClient.post("/stores", { ...record, asDraft });
  return data;
}

// Save edits to an existing store by its code (PATCH /stores/:id); the code itself cannot change
export async function updateStore(id, formData, { asDraft = false } = {}) {
  const record = mapStoreFormToRecord(formData, { asDraft });
  delete record.code;
  const { data } = await apiClient.patch(`/stores/${encodeURIComponent(id)}`, { ...record, asDraft });
  return data;
}

// Delete a store from MongoDB by its code (DELETE /stores/:id)
export async function deleteStore(id) {
  const { data } = await apiClient.delete(`/stores/${encodeURIComponent(id)}`);
  return data;
}
