import apiClient from "./apiClient";

// While the backend is not ready the Items screens use sample data.
// Set VITE_USE_MOCK=false in your .env file to use the real API.
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

/*
  Booking-compatible catalog (existing consumers: Bookings / NewBookingForm):
  GET /items  ->  [{ code, name, unit }]

  Master-data records (Items dashboard / Add Item):
  GET  /items/records  ->  catalog rows for the Items table
  POST /items          body: create/draft item payload (backend contract TBD)
*/

// Keep this shape stable for booking item pickers
let mockBookingItems = [
  { code: "FG-2210", name: "Packed rice flour 25 kg", unit: "bag" },
  { code: "FG-2305", name: "Coconut oil 1 L", unit: "bottle" },
  { code: "FG-2418", name: "Tea leaves 500 g", unit: "pack" },
  { code: "RM-0045", name: "Plastic packaging roll", unit: "roll" },
  { code: "RM-0112", name: "Cardboard carton 5-ply", unit: "box" },
];

let mockItemRecords = [
  {
    code: "ITM-1029",
    name: "Steel Flange (100mm)",
    category: "Finished Goods",
    hub: "Main Store",
    weightKg: 4.5,
    volumeM3: 0.02,
    stockOnHand: 340,
    stockUnit: "Units",
    reorderLevel: 80,
    status: "In Stock",
    criticalHighSpec: false,
    stackable: true,
  },
  {
    code: "ITM-1044",
    name: "Hydraulic Seal Kit",
    category: "Spare Parts & Fasteners",
    hub: "Ja-Ela Distribution Center",
    weightKg: 1.2,
    volumeM3: 0.01,
    stockOnHand: 42,
    stockUnit: "Kits",
    reorderLevel: 50,
    status: "Low Stock",
    criticalHighSpec: false,
    stackable: true,
  },
  {
    code: "ITM-1102",
    name: "Aluminum Casing v3",
    category: "Sub-Assemblies",
    hub: "Kandy Regional Store",
    weightKg: 8.0,
    volumeM3: 0.05,
    stockOnHand: 195,
    stockUnit: "Units",
    reorderLevel: 60,
    status: "In Stock",
    criticalHighSpec: false,
    stackable: true,
  },
  {
    code: "ITM-1118",
    name: "Cold-Chain Coolant Pack",
    category: "Finished Goods",
    hub: "Main Store",
    weightKg: 2.4,
    volumeM3: 0.015,
    stockOnHand: 18,
    stockUnit: "Packs",
    reorderLevel: 40,
    status: "Critical Low",
    criticalHighSpec: true,
    stackable: false,
  },
  {
    code: "ITM-1150",
    name: "Packaging Film Roll",
    category: "Raw Materials",
    hub: "Ja-Ela Distribution Center",
    weightKg: 12.0,
    volumeM3: 0.08,
    stockOnHand: 95,
    stockUnit: "Spools",
    reorderLevel: 100,
    status: "Reorder Soon",
    criticalHighSpec: false,
    stackable: true,
  },
  {
    code: "ITM-1166",
    name: "Bearing Assembly 6204",
    category: "Spare Parts & Fasteners",
    hub: "Main Store",
    weightKg: 0.35,
    volumeM3: 0.002,
    stockOnHand: 520,
    stockUnit: "Units",
    reorderLevel: 120,
    status: "In Stock",
    criticalHighSpec: false,
    stackable: true,
  },
  {
    code: "ITM-1180",
    name: "Motor Housing Blank",
    category: "Raw Materials",
    hub: "Kandy Regional Store",
    weightKg: 6.8,
    volumeM3: 0.04,
    stockOnHand: 28,
    stockUnit: "Units",
    reorderLevel: 35,
    status: "Low Stock",
    criticalHighSpec: false,
    stackable: true,
  },
  {
    code: "ITM-1195",
    name: "Sensor Module SM-9",
    category: "Sub-Assemblies",
    hub: "Main Store",
    weightKg: 0.9,
    volumeM3: 0.008,
    stockOnHand: 210,
    stockUnit: "Units",
    reorderLevel: 70,
    status: "In Stock",
    criticalHighSpec: true,
    stackable: true,
  },
];

const STATUS_LABELS = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  reorder_soon: "Reorder Soon",
};

// Normalize form hub labels into the shorter dashboard display names
function normalizeHub(hub) {
  if (!hub) return "Main Store";
  if (hub.includes("Main Store") || hub.includes("Biyagama")) return "Main Store";
  if (hub.includes("Ja-Ela")) return "Ja-Ela Distribution Center";
  if (hub.includes("Kandy")) return "Kandy Regional Store";
  return hub;
}

// Map Add Item form values into the dashboard list record shape
export function mapItemFormToRecord(formData, { asDraft = false } = {}) {
  const stockOnHand = Number(formData.stockOnHand) || 0;
  const reorderLevel = Number(formData.reorderLevel) || 0;
  let status = STATUS_LABELS[formData.operationalStatus] || "In Stock";

  // Draft items stay visible but inactive for dispatch readiness
  if (asDraft) status = "Reorder Soon";

  return {
    code: formData.itemCode,
    name: formData.itemName,
    category: formData.category || "Finished Goods",
    hub: normalizeHub(formData.storageHub),
    weightKg: Number(formData.weightKg) || 0,
    volumeM3: Number(formData.volumeM3) || 0,
    stockOnHand,
    stockUnit: "Units",
    reorderLevel,
    status,
    criticalHighSpec: Boolean(formData.criticalHighSpec),
    stackable: Boolean(formData.stackable),
    isDraft: asDraft,
  };
}

// Existing booking-facing API — keep return shape unchanged
export async function getItems() {
  if (USE_MOCK) {
    await wait(150);
    return JSON.parse(JSON.stringify(mockBookingItems));
  }
  const { data } = await apiClient.get("/items");
  return data;
}

// Master-data list for ItemsDashboard
export async function getItemRecords() {
  if (USE_MOCK) {
    await wait();
    return JSON.parse(JSON.stringify(mockItemRecords));
  }
  // Backend dependency: dedicated master-data list endpoint is not in this repo yet.
  const { data } = await apiClient.get("/items/records");
  return data;
}

export async function createItem(formData, { asDraft = false } = {}) {
  const record = mapItemFormToRecord(formData, { asDraft });

  if (USE_MOCK) {
    await wait(400);
    mockItemRecords = [record, ...mockItemRecords.filter((i) => i.code !== record.code)];

    // Also expose the new item to booking pickers as { code, name, unit }
    if (!asDraft && record.name) {
      mockBookingItems = [
        { code: record.code, name: record.name, unit: record.stockUnit.toLowerCase() || "unit" },
        ...mockBookingItems.filter((i) => i.code !== record.code),
      ];
    }

    return record;
  }

  // Backend dependency: POST /items is not available in this repository yet.
  const { data } = await apiClient.post("/items", { ...record, asDraft });
  return data;
}
