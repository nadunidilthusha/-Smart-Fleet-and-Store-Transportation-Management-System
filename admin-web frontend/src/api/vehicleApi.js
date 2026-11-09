import apiClient from "./apiClient";

// While the backend is not ready the Vehicles screens use sample data.
// Set VITE_USE_MOCK=false in your .env file to use the real API.
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

/*
  GET  /vehicles           ->  [{ id, plate, type, model, driver, capacity, hub, mileage, fuel, status }]
  POST /vehicles           body: create/draft vehicle payload (backend contract TBD)
  GET  /vehicles/options   ->  [{ id, label, capacity, model, location }]  (for store allocation UI)
*/

let mockVehicles = [
  { id: "VH-001", plate: "WP CAA-1201", type: "10T Heavy Truck", model: "Isuzu Giga", driver: "Kamal Perera", capacity: "10,000 kg", hub: "Biyagama Hub", mileage: "84,250 km", fuel: 85, status: "Available" },
  { id: "VH-002", plate: "WP CAB-3344", type: "5T Medium Truck", model: "Mitsubishi Fuso", driver: "Nimal Fernando", capacity: "5,000 kg", hub: "Ja-Ela Hub", mileage: "62,110 km", fuel: 42, status: "In Use" },
  { id: "VH-003", plate: "CP CAC-7788", type: "Light Truck", model: "Isuzu NPR 75", driver: "Unassigned", capacity: "3,500 kg", hub: "Kandy Hub", mileage: "12,450 km", fuel: 90, status: "Available" },
  { id: "VH-004", plate: "WP CAD-9012", type: "Pickup", model: "Toyota Hilux", driver: "Sajith Silva", capacity: "1,000 kg", hub: "Biyagama Hub", mileage: "45,780 km", fuel: 18, status: "Maintenance" },
  { id: "VH-005", plate: "WP CAE-5566", type: "Van", model: "Nissan Caravan", driver: "Ruwan Dias", capacity: "1,200 kg", hub: "Ja-Ela Hub", mileage: "33,920 km", fuel: 67, status: "Available" },
  { id: "VH-006", plate: "NP CAF-2211", type: "10T Heavy Truck", model: "Hino 500", driver: "Unassigned", capacity: "10,000 kg", hub: "Biyagama Hub", mileage: "101,340 km", fuel: 12, status: "Inactive" },
  { id: "VH-007", plate: "WP CAG-6677", type: "Light Truck", model: "Tata Ace", driver: "Priyantha Jayasuriya", capacity: "1,500 kg", hub: "Kandy Hub", mileage: "28,500 km", fuel: 74, status: "Available" },
  { id: "VH-008", plate: "WP CAH-8899", type: "5T Medium Truck", model: "Ashok Leyland", driver: "Chaminda Bandara", capacity: "5,000 kg", hub: "Biyagama Hub", mileage: "55,600 km", fuel: 55, status: "Available" },
  { id: "VH-009", plate: "CP CAI-1010", type: "Pickup", model: "Mitsubishi L200", driver: "Unassigned", capacity: "1,000 kg", hub: "Ja-Ela Hub", mileage: "19,870 km", fuel: 88, status: "Available" },
  { id: "VH-010", plate: "WP CAJ-4455", type: "Van", model: "Toyota HiAce", driver: "Lasith Wickramasinghe", capacity: "1,200 kg", hub: "Kandy Hub", mileage: "41,220 km", fuel: 36, status: "Available" },
  { id: "VH-011", plate: "WP CAK-7781", type: "Light Truck", model: "Isuzu ELF", driver: "Anura Pathirana", capacity: "3,000 kg", hub: "Biyagama Hub", mileage: "70,015 km", fuel: 61, status: "Available" },
  { id: "VH-012", plate: "NP CAL-3322", type: "10T Heavy Truck", model: "UD Quon", driver: "Unassigned", capacity: "10,000 kg", hub: "Ja-Ela Hub", mileage: "92,400 km", fuel: 25, status: "Available" },
];

const DRIVER_LABELS = {
  "drv-042": "Kamal Perera",
  "drv-018": "Nimal Fernando",
  "drv-027": "Sajith Silva",
  pool: "Unassigned",
};

const HUB_LABELS = {
  biyagama: "Biyagama Hub",
  "ja-ela": "Ja-Ela Hub",
  kandy: "Kandy Hub",
};

const STATUS_LABELS = {
  available: "Available",
  in_use: "In Use",
  maintenance: "Maintenance",
  inactive: "Inactive",
};

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

// Map Add Vehicle form values into the dashboard list record shape
export function mapVehicleFormToRecord(formData, { asDraft = false } = {}) {
  const { type, model } = parseTypeModel(formData.vehicleTypeModel);
  return {
    id: formData.vehicleId,
    plate: formData.plateNumber,
    type,
    model,
    driver: DRIVER_LABELS[formData.assignedDriver] || formData.assignedDriver || "Unassigned",
    capacity: formatCapacity(formData.capacityKg || 0),
    hub: HUB_LABELS[formData.currentHub] || formData.currentHub || "—",
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

export async function getVehicles() {
  if (USE_MOCK) {
    await wait();
    return JSON.parse(JSON.stringify(mockVehicles));
  }
  const { data } = await apiClient.get("/vehicles");
  return data;
}

// Compact options for the Add Store vehicle-allocation step
export async function getVehicleAllocationOptions() {
  const vehicles = await getVehicles();
  return vehicles
    .filter((v) => v.status === "Available" || v.status === "Inactive")
    .slice(0, 12)
    .map((v) => {
      const kg = Number(String(v.capacity).replace(/[^\d]/g, "")) || 0;
      return {
        id: v.id,
        label: v.type,
        capacity: `${Math.max(8, Math.round(kg / 100))} m³`,
        model: v.model,
        location: `Available at ${String(v.hub).replace(/ Hub$/, "")}`,
      };
    });
}

export async function createVehicle(formData, { asDraft = false } = {}) {
  const record = mapVehicleFormToRecord(formData, { asDraft });

  if (USE_MOCK) {
    await wait(400);
    // Replace existing id if the user re-saves the same vehicle code
    mockVehicles = [record, ...mockVehicles.filter((v) => v.id !== record.id)];
    return record;
  }

  // Backend dependency: POST /vehicles is not available in this repository yet.
  const { data } = await apiClient.post("/vehicles", { ...record, asDraft });
  return data;
}
