import { connectDB, disconnectDB } from "../config/db.js";
import Store from "../modules/stores/stores.model.js";
import Item from "../modules/items/items.model.js";
import User from "../modules/users/users.model.js";
import Vehicle from "../modules/vehicles/vehicles.model.js";
import Trip from "../modules/trips/trips.model.js";
import Booking from "../modules/bookings/bookings.model.js";


const MAIN = "Main Store – Biyagama";
const JAELA = "Store 2 – Ja-Ela";
const KANDY = "Store 3 – Kandy";

// Optional: the vehicles and trips that make a booking show as Scheduled / In transit / Completed
const SCHEDULED_VEHICLE = "LB-2204";
const IN_TRANSIT = { vehicle: "NB-4521", trip: "TR-0412" };
const COMPLETED = { vehicle: "KA-5101", trip: "TR-0414" };

// Items used below (created only if they do not exist yet)
const ITEMS = [
  { code: "FG-2210", name: "Packed rice flour 25 kg", unit: "bag", category: "Finished Goods" },
  { code: "FG-2305", name: "Coconut oil 1 L", unit: "bottle", category: "Finished Goods" },
  { code: "FG-2418", name: "Tea leaves 500 g", unit: "pack", category: "Finished Goods" },
  { code: "RM-0045", name: "Plastic packaging roll", unit: "roll", category: "Raw Materials" },
  { code: "RM-0112", name: "Cardboard carton 5-ply", unit: "box", category: "Raw Materials" },
];

/* ---------- date helpers (everything is relative to today) ---------- */
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
// at(1, "09:00") = tomorrow 09:00, at(-1, "16:10") = yesterday 16:10
const at = (dayOffset, time) => {
  const [h, m] = time.split(":").map(Number);
  const d = startOfToday();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
};
const minutesAgo = (m) => new Date(Date.now() - m * 60000);

async function run() {
  await connectDB();

  /* ---------- find what must already exist ---------- */
  const stores = await Store.find({ name: { $in: [MAIN, JAELA, KANDY] } });
  const store = Object.fromEntries(stores.map((s) => [s.name, s]));
  const missing = [MAIN, JAELA, KANDY].filter((name) => !store[name]);
  if (missing.length) {
    throw new Error(`These stores were not found: ${missing.join(", ")}. Seed the stores first.`);
  }

  // The user who "requests" each booking: the manager of that store
  const managerOf = async (name) => User.findOne({ role: "STORE_MANAGER", store: store[name]._id });
  const mainManager = await managerOf(MAIN);
  if (!mainManager) throw new Error(`No STORE_MANAGER found for "${MAIN}". Seed the store users first.`);
  const manager = { [MAIN]: mainManager, [JAELA]: (await managerOf(JAELA)) ?? mainManager, [KANDY]: (await managerOf(KANDY)) ?? mainManager };

  for (const it of ITEMS) {
    if (!(await Item.exists({ code: it.code }))) await Item.create({ ...it, store: store[MAIN]._id });
  }
  const itemId = Object.fromEntries((await Item.find({ code: { $in: ITEMS.map((i) => i.code) } })).map((i) => [i.code, i._id]));

  const vehicleBy = async (plate) => (plate ? Vehicle.findOne({ plate }) : null);
  const scheduledVehicle = await vehicleBy(SCHEDULED_VEHICLE);
  const transitVehicle = await vehicleBy(IN_TRANSIT.vehicle);
  const doneVehicle = await vehicleBy(COMPLETED.vehicle);

  /* ---------- the bookings ---------- */
  const line = (code, quantity) => ({ item: itemId[code], quantity });
  const make = (code, pickup, destination, requestedFor, priority, status, lines, submittedAt, extra = {}) => ({
    code,
    pickup: store[pickup]._id,
    destination: destination ? store[destination]._id : undefined,
    requestedFor,
    requestedBy: manager[MAIN]._id, // every sample is requested by the Main Store, so its manager can edit / cancel them
    priority,
    status,
    items: lines,
    submittedAt,
    history: [{ label: "Submitted", at: submittedAt }],
    ...extra,
  });

  const samples = [
    // Pending approval
    make("BK-1101-0009", MAIN, KANDY, at(1, "09:00"), "Standard", "Pending", [line("FG-2210", 600), line("FG-2305", 320)], minutesAgo(90)),
    // Approved, waiting for a vehicle
    make("BK-1101-0008", MAIN, JAELA, at(1, "07:30"), "Standard", "Approved", [line("FG-2305", 900)], at(-1, "14:10"),
      { history: [{ label: "Submitted", at: at(-1, "14:10") }, { label: "Approved", at: at(-1, "16:00") }] }),
    // Administrator asked for changes
    make("BK-1101-0007", KANDY, MAIN, at(1, "08:00"), "Standard", "Changes requested", [line("FG-2210", 1500)], at(-1, "15:22"),
      { adminNote: "Quantity is above one lorry (1,200 units). Reduce it or split into two bookings.",
        history: [{ label: "Submitted", at: at(-1, "15:22") }, { label: "Changes requested", at: at(0, "09:10") }] }),
    // Scheduled: a vehicle is assigned
    make("BK-1101-0006", JAELA, MAIN, at(0, "14:00"), "Urgent", "Approved", [line("RM-0045", 40)], at(-1, "11:40"),
      { notes: "Call the gate before arrival.", vehicle: scheduledVehicle?._id, driver: scheduledVehicle?.driver,
        history: [{ label: "Submitted", at: at(-1, "11:40") }, { label: "Approved", at: at(-1, "12:30") }, { label: "Vehicle assigned", at: at(-1, "13:05") }] }),
    // In transit: its trip is on the road
    make("BK-1101-0005", MAIN, KANDY, at(0, "09:00"), "Standard", "Approved", [line("FG-2305", 400)], at(-1, "09:15"),
      { vehicle: transitVehicle?._id, driver: transitVehicle?.driver,
        history: [{ label: "Submitted", at: at(-1, "09:15") }, { label: "Approved", at: at(-1, "10:00") }, { label: "Vehicle assigned", at: at(-1, "10:40") }, { label: "Loaded and departed", at: at(0, "09:20") }] }),
    // Completed: its trip is finished
    make("BK-1101-0004", MAIN, JAELA, at(-1, "08:00"), "Standard", "Approved", [line("FG-2210", 250)], at(-2, "15:00"),
      { vehicle: doneVehicle?._id, driver: doneVehicle?.driver,
        history: [{ label: "Submitted", at: at(-2, "15:00") }, { label: "Approved", at: at(-2, "16:10") }, { label: "Vehicle assigned", at: at(-2, "16:30") },
                  { label: "Loaded and departed", at: at(-1, "08:15") }, { label: "Delivered", at: at(-1, "09:40") }, { label: "Receipt confirmed", at: at(-1, "10:05") }] }),
    // Cancelled by the store
    make("BK-1101-0003", KANDY, MAIN, at(0, "11:00"), "Standard", "Cancelled", [line("FG-2418", 1200)], at(-2, "13:20"),
      { history: [{ label: "Submitted", at: at(-2, "13:20") }, { label: "Cancelled", at: at(-1, "08:00") }] }),
    // Rejected by the administrator
    make("BK-1101-0002", MAIN, JAELA, at(-1, "10:00"), "Standard", "Rejected", [line("FG-2305", 500)], at(-2, "10:05"),
      { adminNote: "Ja-Ela cannot receive goods on that day.",
        history: [{ label: "Submitted", at: at(-2, "10:05") }, { label: "Rejected", at: at(-2, "14:30") }] }),
    // Draft (no destination yet): only the Main Store can see it
    make("BK-1101-0001", MAIN, null, at(1, "10:00"), "Standard", "Draft", [line("FG-2210", 300)], minutesAgo(20),
      { notes: "Waiting for the final quantities.", history: [{ label: "Draft saved", at: minutesAgo(20) }] }),
  ];

  // remove only our own earlier samples, then create them again
  const codes = samples.map((s) => s.code);
  await Booking.deleteMany({ code: { $in: codes } });
  const created = await Booking.insertMany(samples);
  const idOf = Object.fromEntries(created.map((b) => [b.code, b._id]));

  /* ---------- attach two bookings to existing trips (skipped when the trip is not there) ---------- */
  const link = async (tripCode, bookingCode) => {
    const result = await Trip.updateOne({ code: tripCode }, { $addToSet: { bookings: idOf[bookingCode] } });
    return result.matchedCount > 0;
  };
  const linkedTransit = await link(IN_TRANSIT.trip, "BK-1101-0005");
  const linkedDone = await link(COMPLETED.trip, "BK-1101-0004");

  console.log(`\n✅ ${created.length} store bookings created (${codes.slice().sort()[0]} to ${codes.slice().sort().at(-1)}).`);
  if (!scheduledVehicle) console.log(`   Note: vehicle ${SCHEDULED_VEHICLE} was not found, so BK-1101-0006 shows as "Approved", not "Scheduled".`);
  if (!linkedTransit) console.log(`   Note: trip ${IN_TRANSIT.trip} was not found, so BK-1101-0005 will not show as "In transit".`);
  if (!linkedDone) console.log(`   Note: trip ${COMPLETED.trip} was not found, so BK-1101-0004 will not show as "Completed".`);

  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {
  console.error("\n❌ Store bookings seed failed:", err.message);
  process.exit(1);
});