import { connectDB, disconnectDB } from "../config/db.js";
import logger from "../utils/logger.js";

// Run with: npm run seed
// Each team member adds their own sample data here (users, stores, items, vehicles ...).
// Keep it safe to run more than once.
async function seed() {
  await connectDB();

  // TODO: await seedUsers();
  // TODO: await seedStores();
  // TODO: await seedItems();
  // TODO: await seedVehicles();

  logger.info("Seed finished (nothing to seed yet).");
  await disconnectDB();
}

seed().catch((err) => {
  logger.error("Seed failed:", err.message);
  process.exit(1);
});
