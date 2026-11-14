import apiClient from "./apiClient";

// While the backend is not ready the Goods Confirmation screen uses sample data.
// Set VITE_USE_MOCK=false in your .env file to use the real API.
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

/*
  GET  /store/goods-confirmation          -> active trip + queue + tab counts
  POST /store/goods-confirmation/draft    -> save draft verification
  POST /store/goods-confirmation/confirm  -> complete goods receipt
*/

let mockActiveTrip = {
  id: "TRP-8842",
  hub: "Ja-Ela Hub",
  route: "Main Store (Biyagama) → Ja-Ela Hub",
  vehicle: "VH-002 (Mitsubishi Fuso)",
  driver: "Kamal Perera",
  waybill: "WB-8842-LK",
  steps: [
    { key: "prepared", label: "Prepared", detail: "08:30 • Main Store", done: true },
    { key: "in_transit", label: "In Transit", detail: "Kamal Perera (VH-002)", done: true },
    { key: "receiving", label: "Receiving", detail: "Verification in progress", done: false, active: true },
  ],
  lines: [
    {
      id: "line-1",
      name: "Packed rice flour 25 kg",
      expected: 40,
      unit: "bags",
      received: 38,
      condition: "Damaged (Tear)",
    },
    {
      id: "line-2",
      name: "Steel Flange (100mm)",
      expected: 150,
      unit: "units",
      received: 150,
      condition: "Good Condition",
    },
    {
      id: "line-3",
      name: "Copper Wire Spool (50m)",
      expected: 25,
      unit: "spools",
      received: 25,
      condition: "Good Condition",
    },
  ],
  discrepancyNote:
    "2 bags found torn with spillage at tailgate. 38 bags accepted sound.",
  attachment: { name: "tailgate_tear_01.jpg", size: "2.4 MB" },
  resolution: "accept_partial",
  acknowledged: false,
};

let mockQueue = [
  {
    id: "TRP-8839",
    status: "In Transit",
    route: "Colombo Port → Main Store",
    driver: "S. Dias",
    units: 180,
    action: "View Details",
  },
  {
    id: "TRP-8835",
    status: "Prepared",
    route: "Kandy Depot → Main Store",
    driver: "Roshan F.",
    units: 96,
    action: "View Manifest",
  },
  {
    id: "TRP-8828",
    status: "Completed",
    route: "Galle Regional Hub → Main Store",
    driver: "N. Herath",
    units: 210,
    action: "View Receipt",
  },
];

const mockTabCounts = {
  All: 18,
  Prepared: 4,
  "In Transit": 6,
  Receiving: 8,
};

// Load the active verification trip plus inbound queue for the page
export async function getGoodsConfirmation() {
  if (USE_MOCK) {
    await wait();
    return {
      activeTrip: JSON.parse(JSON.stringify(mockActiveTrip)),
      queue: JSON.parse(JSON.stringify(mockQueue)),
      tabCounts: { ...mockTabCounts },
    };
  }
  const { data } = await apiClient.get("/store/goods-confirmation");
  return data;
}

// Persist a draft of received quantities and discrepancy notes
export async function saveConfirmationDraft(payload) {
  if (USE_MOCK) {
    await wait(300);
    mockActiveTrip = {
      ...mockActiveTrip,
      lines: payload.lines ?? mockActiveTrip.lines,
      discrepancyNote: payload.discrepancyNote ?? mockActiveTrip.discrepancyNote,
      resolution: payload.resolution ?? mockActiveTrip.resolution,
      acknowledged: Boolean(payload.acknowledged),
    };
    return { ok: true, draft: true };
  }
  const { data } = await apiClient.post("/store/goods-confirmation/draft", payload);
  return data;
}

// Complete goods confirmation for the active inbound trip
export async function confirmGoodsReceipt(payload) {
  if (USE_MOCK) {
    await wait(400);
    mockActiveTrip = {
      ...mockActiveTrip,
      lines: payload.lines ?? mockActiveTrip.lines,
      discrepancyNote: payload.discrepancyNote ?? mockActiveTrip.discrepancyNote,
      resolution: payload.resolution ?? mockActiveTrip.resolution,
      acknowledged: true,
    };
    return { ok: true, confirmed: true, tripId: mockActiveTrip.id };
  }
  const { data } = await apiClient.post("/store/goods-confirmation/confirm", payload);
  return data;
}
