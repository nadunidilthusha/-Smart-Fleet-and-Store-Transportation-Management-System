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
    { code: "STR-001", name: "Main Store – Biyagama", shortName: "Biyagama Hub" },
    { code: "STR-002", name: "Store 2 – Ja-Ela", shortName: "Ja-Ela Hub" },
    { code: "STR-003", name: "Store 3 – Kandy", shortName: "Kandy Hub" },
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