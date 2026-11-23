import apiClient from "./apiClient";

/*
  Vehicles always use the real backend (MongoDB `vehicles` collection) so data survives a refresh.

  GET   /vehicles                ->  [{ id, plate, type, model, driver, capacity, hub, mileage, fuel, status }]
  GET   /vehicles/options        ->  [{ id, label, capacity, model, location }]  (for store allocation UI)
  GET   /vehicles/form-options   ->  { drivers: [{ value, label, id, name, contact, licenseNumber, status, disabled }],
                                       hubs: [{ value, label, id, name, location, address, status, disabled }] }  (searchable dropdowns)
  GET   /vehicles/:id            ->  one vehicle record (edit form)
  POST  /vehicles                body: Add Vehicle record + asDraft (see mapVehicleFormToRecord)
  PATCH /vehicles/:id            body: any vehicle fields (id is the vehicle code)
*/

// Backend field names -> Add Vehicle form field names, used to show server validation errors
const SERVER_FIELD_TO_FORM = {
  id: "vehicleId",
  code: "vehicleId",
  plate: "plateNumber",
  type: "vehicleTypeModel",
  capacity: "capacityKg",
  driver: "assignedDriver",
  hub: "currentHub",
  mileage: "initialMileage",
  fuel: "fuelLevel",
  status: "operationalStatus",
};

// Form status keys (OperationalStatusSelector) <-> status labels stored by the backend
const STATUS_LABELS = {
  available: "Available",
  in_use: "In Use",
  maintenance: "Maintenance",
  inactive: "Inactive",
};
const STATUS_KEYS = Object.fromEntries(Object.entries(STATUS_LABELS).map(([key, label]) => [label, key]));

// Split "Type (Model)" style labels used by the Add Vehicle form
function parseTypeModel(value = "") {
  const match = String(value).match(/^(.*?)\s*\((.*)\)\s*$/);
  if (match) return { type: match[1].trim(), model: match[2].trim() };
  return { type: value || "Vehicle", model: "—" };
}

function formatCapacity(kg) {
  const n = Number(String(kg).replace(/,/g, ""));
  if (!Number.isFinite(n)) return `${kg} kg`;
  return `${n.toLocaleString("en-US")} kg`;
}

function formatMileage(km) {
  const n = Number(String(km).replace(/,/g, ""));
  if (!Number.isFinite(n)) return `${km} km`;
  return `${n.toLocaleString("en-US")} km`;
}

// Turn an Axios error into { message, fieldErrors } for banners and per-field messages
export function parseApiError(err, fallback = "Something went wrong. Please try again.") {
  const data = err?.response?.data;
  const fieldErrors = {};
  (data?.errors || []).forEach(({ field, message }) => {
    const name = SERVER_FIELD_TO_FORM[field] || field;
    if (name && !fieldErrors[name]) fieldErrors[name] = message;
  });
  const message = data?.message || (err?.request && !err?.response ? "Cannot reach the server." : err?.message) || fallback;
  return { message, fieldErrors };
}

// Map Add Vehicle form values into the backend payload (driver and hub are sent as ids)
export function mapVehicleFormToRecord(formData, { asDraft = false } = {}) {
  const { type, model } = parseTypeModel(formData.vehicleTypeModel);
  return {
    id: formData.vehicleId,
    plate: formData.plateNumber,
    type,
    model,
    driver: !formData.assignedDriver || formData.assignedDriver === "pool" ? "Unassigned" : formData.assignedDriver,
    capacity: formatCapacity(formData.capacityKg || 0),
    hub: formData.currentHub || "",
    mileage: formatMileage(formData.initialMileage || 0),
    fuel: Number(formData.fuelLevel) || 0,
    status: asDraft ? "Inactive" : STATUS_LABELS[formData.operationalStatus] || "Available",
    isDraft: asDraft,
    revenueLicenseExpiry: formData.revenueLicenseExpiry || "",
    nextServiceDueKm: formData.nextServiceDueKm || "",
    insurancePolicyRef: formData.insurancePolicyRef || "",
    documents: (formData.documents || []).map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    })),
  };
}

// Map a saved vehicle record back into Add/Edit Vehicle form values (pre-fills the edit form)
export function mapVehicleRecordToForm(record) {
  const hasModel = record.model && record.model !== "—";
  return {
    vehicleId: record.id,
    plateNumber: record.plate || "",
    vehicleTypeModel: hasModel ? `${record.model} (${record.type})` : record.type || "",
    capacityKg: String(record.capacity || "").replace(/[^\d.]/g, ""),
    assignedDriver: record.driverId || (record.driver === "Unassigned" ? "pool" : ""),
    currentHub: record.hubId || "",
    initialMileage: String(record.mileage || "").replace(/[^\d.]/g, ""),
    fuelLevel: Number(record.fuel) || 0,
    operationalStatus: STATUS_KEYS[record.status] || "available",
    revenueLicenseExpiry: record.revenueLicenseExpiry || "",
    nextServiceDueKm: record.nextServiceDueKm || "",
    insurancePolicyRef: record.insurancePolicyRef || "",
    documents: record.documents || [],
  };
}

// Vehicles dashboard list (read from MongoDB)
export async function getVehicles() {
  const { data } = await apiClient.get("/vehicles");
  return data;
}

// Compact options for the Add Store vehicle-allocation step
export async function getVehicleAllocationOptions() {
  const { data } = await apiClient.get("/vehicles/options");
  return data;
}

// Driver and hub dropdown options for the Add Vehicle form
export async function getVehicleFormOptions() {
  const { data } = await apiClient.get("/vehicles/form-options");
  return data;
}

// Save a vehicle (or draft) to MongoDB and return the saved record
export async function createVehicle(formData, { asDraft = false } = {}) {
  const record = mapVehicleFormToRecord(formData, { asDraft });
  const { data } = await apiClient.post("/vehicles", { ...record, asDraft });
  return data;
}

// Load one saved vehicle by its code (GET /vehicles/:id)
export async function getVehicle(id) {
  const { data } = await apiClient.get(`/vehicles/${encodeURIComponent(id)}`);
  return data;
}

// Save edits to an existing vehicle by its code (PATCH /vehicles/:id); the code itself cannot change
export async function updateVehicle(id, formData, { asDraft = false } = {}) {
  const record = mapVehicleFormToRecord(formData, { asDraft });
  delete record.id;
  const { data } = await apiClient.patch(`/vehicles/${encodeURIComponent(id)}`, { ...record, asDraft });
  return data;
}
