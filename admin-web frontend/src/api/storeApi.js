import apiClient from "./apiClient";

// While the backend is not ready the Stores screens use sample data.
// Set VITE_USE_MOCK=false in your .env file to use the real API.
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

/*
  Booking-compatible list (existing consumers: Bookings / NewBookingForm):
  GET /stores  ->  [{ id, name }]

  Master-data records (Stores dashboard / Add Store):
  GET  /stores/records  ->  [{ code, name, type, manager, phone, district, vehicles, usedM3, capacityM3, status, lowStock }]
  POST /stores          body: create/draft store payload (backend contract TBD)
*/

// Keep these names stable for booking pickup/destination dropdowns
let mockStores = [
  { id: "main", name: "Main Store – Biyagama" },
  { id: "store-2", name: "Store 2 – Ja-Ela" },
  { id: "store-3", name: "Store 3 – Kandy" },
];

let mockStoreRecords = [
  {
    code: "STR-001",
    name: "Biyagama Central Hub",
    type: "Central Hub",
    manager: "Kamal Perera",
    phone: "+94 11 234 5678",
    district: "Gampaha",
    vehicles: 5,
    usedM3: 44000,
    capacityM3: 50000,
    status: "Active",
    lowStock: false,
  },
  {
    code: "STR-002",
    name: "Ja-Ela Distribution Center",
    type: "Distribution",
    manager: "Nimal Fernando",
    phone: "+94 11 298 4410",
    district: "Gampaha",
    vehicles: 3,
    usedM3: 22000,
    capacityM3: 30000,
    status: "Active",
    lowStock: false,
  },
  {
    code: "STR-003",
    name: "Kandy Regional Store",
    type: "Regional Store",
    manager: "Dilshan Fernando",
    phone: "+94 81 222 3344",
    district: "Kandy",
    vehicles: 4,
    usedM3: 22500,
    capacityM3: 25000,
    status: "High Capacity",
    lowStock: true,
  },
];

const STATUS_LABELS = {
  active: "Active",
  high_capacity: "High Capacity",
  inactive: "Inactive",
};

// Map Add Store form values into the dashboard list record shape
export function mapStoreFormToRecord(formData, { asDraft = false } = {}) {
  const capacityM3 = Number(String(formData.storageCapacity || "0").replace(/,/g, "")) || 0;
  const status = asDraft
    ? "Inactive"
    : STATUS_LABELS[formData.operationalStatus] || "Active";

  return {
    code: formData.storeCode,
    name: formData.storeName,
    type: formData.storeType || "Regional Store",
    manager: formData.managerName || "—",
    phone: formData.contactPhone || "—",
    district: formData.district || "—",
    vehicles: Array.isArray(formData.assignedVehicles) ? formData.assignedVehicles.length : 0,
    usedM3: 0,
    capacityM3,
    status,
    lowStock: false,
    isDraft: asDraft,
    address: formData.address || "",
    dispatchEmail: formData.dispatchEmail || "",
    alertThreshold: formData.alertThreshold || "",
    loadingBays: formData.loadingBays || "",
    assignedVehicles: formData.assignedVehicles || [],
  };
}

// Existing booking-facing API — keep return shape unchanged
export async function getStores() {
  if (USE_MOCK) {
    await wait(150);
    return JSON.parse(JSON.stringify(mockStores));
  }
  const { data } = await apiClient.get("/stores");
  return data;
}

// Master-data list for StoresDashboard
export async function getStoreRecords() {
  if (USE_MOCK) {
    await wait();
    return JSON.parse(JSON.stringify(mockStoreRecords));
  }
  // Backend dependency: dedicated master-data list endpoint is not in this repo yet.
  const { data } = await apiClient.get("/stores/records");
  return data;
}

export async function createStore(formData, { asDraft = false } = {}) {
  const record = mapStoreFormToRecord(formData, { asDraft });

  if (USE_MOCK) {
    await wait(400);
    mockStoreRecords = [record, ...mockStoreRecords.filter((s) => s.code !== record.code)];

    // Also expose the new store to booking dropdowns as { id, name }
    if (!asDraft && record.name) {
      const bookingId = record.code.toLowerCase();
      mockStores = [
        { id: bookingId, name: record.name },
        ...mockStores.filter((s) => s.id !== bookingId && s.name !== record.name),
      ];
    }

    return record;
  }

  // Backend dependency: POST /stores is not available in this repository yet.
  const { data } = await apiClient.post("/stores", { ...record, asDraft });
  return data;
}
