import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db.js";

// Import from your new modular structure
import User from "../modules/users/users.model.js";
import Store from "../modules/stores/stores.model.js";
import Item from "../modules/items/items.model.js";
import Vehicle from "../modules/vehicles/vehicles.model.js";
import { seedStoreUsers } from "./storeUsers.js";

async function seed() {
  await connectDB();

  console.log("Clearing old data...");
  await User.deleteMany({});
  await Store.deleteMany({});
  await Item.deleteMany({});
  await Vehicle.deleteMany({});

  console.log("Creating stores...");
  const stores = await Store.insertMany([
    { code: "STR-001", name: "Main Store – Biyagama", shortName: "Biyagama Hub", type: "Central Hub", manager: "Kamal Perera", phone: "+94 11 234 5678", district: "Gampaha", address: "No. 45, Biyagama Export Processing Zone Road, Biyagama", dispatchEmail: "biyagama@fleetline.com", capacityM3: 50000, alertThreshold: 90, loadingBays: 6 },
    { code: "STR-002", name: "Store 2 – Ja-Ela", shortName: "Ja-Ela Hub", type: "Distribution", manager: "Nimal Fernando", phone: "+94 11 298 4410", district: "Gampaha", address: "No. 12, Negombo Road, Ja-Ela", dispatchEmail: "jaela@fleetline.com", capacityM3: 30000, alertThreshold: 90, loadingBays: 4 },
    { code: "STR-003", name: "Store 3 – Kandy", shortName: "Kandy Hub", type: "Regional Store", manager: "Dilshan Fernando", phone: "+94 81 222 3344", district: "Kandy", address: "No. 88, Peradeniya Road, Kandy", dispatchEmail: "kandy@fleetline.com", capacityM3: 25000, alertThreshold: 90, loadingBays: 3 },
  ]);

  console.log("Creating admin user...");
  await User.create({
    name: "System Administrator",
    email: "admin@fuchsius.com",
    employeeId: "EMP-001",
    passwordHash: "Admin@123", // Will be hashed automatically
    role: "SYSTEM_ADMIN",
    status: "Active",
  });

  console.log("Creating store employees...");
  await seedStoreUsers(); // store accounts for Store Web login (hashed by the User model)

  console.log("Creating sample items...");
  await Item.insertMany([
    { code: "FG-2210", name: "Packed rice flour 25 kg", unit: "bag", category: "Finished Goods", store: stores[0]._id },
    { code: "FG-2305", name: "Coconut oil 1 L", unit: "bottle", category: "Finished Goods", store: stores[0]._id },
  ]);

  console.log("Creating sample vehicles...");
  await Vehicle.insertMany([
    { code: "VH-001", plate: "NB-4521", type: "10 ft lorry", capacity: "1,200 units", status: "Available", hub: stores[0]._id },
    { code: "VH-002", plate: "WP-3308", type: "14 ft lorry", capacity: "2,000 units", status: "Available", hub: stores[0]._id },
  ]);

  console.log("✅ Seeding complete!");
  await disconnectDB();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});