import User from "../modules/users/users.model.js";
import Store from "../modules/stores/stores.model.js";
import { ROLES } from "../config/constants.js";
import logger from "../utils/logger.js";

// Sample Store Web accounts (password for all: Store@123). Safe to run more than once: nothing is overwritten or deleted.
const STORES = [
  { code: "STR-001", name: "Main Store – Biyagama", shortName: "Biyagama Hub" },
  { code: "STR-002", name: "Store 2 – Ja-Ela", shortName: "Ja-Ela Hub" },
  { code: "STR-003", name: "Store 3 – Kandy", shortName: "Kandy Hub" },
];

const STORE_USERS = [
  { name: "Ashan Wickrama", email: "ashan.w@fleetline.store", employeeId: "EMP-1001", role: ROLES.STORE_MANAGER, storeCode: "STR-001" },
  { name: "Nimal Perera", email: "nimal.e@fleetline.store", employeeId: "EMP-1042", role: ROLES.STORE_EMPLOYEE, storeCode: "STR-001" },
  { name: "Kamal Jayasuriya", email: "kamal.j@fleetline.store", employeeId: "EMP-1108", role: ROLES.STORE_MANAGER, storeCode: "STR-002" },
  { name: "Ruwan Silva", email: "ruwan.k@fleetline.store", employeeId: "EMP-1203", role: ROLES.STORE_EMPLOYEE, storeCode: "STR-003" },
  // Store employees (a store employee must belong to a store, so Store Login can match them to the selected location)
  { name: "Dilani Perera", email: "employee1@fuchsius.com", employeeId: "STORE-EMP-001", role: ROLES.STORE_EMPLOYEE, storeCode: "STR-001" },
  { name: "Sanjaya Fernando", email: "employee2@fuchsius.com", employeeId: "STORE-EMP-002", role: ROLES.STORE_EMPLOYEE, storeCode: "STR-001" },
  { name: "Tharindu Jayawardena", email: "employee3@fuchsius.com", employeeId: "STORE-EMP-003", role: ROLES.STORE_EMPLOYEE, storeCode: "STR-002" },
  { name: "Nadeesha Wickramasinghe", email: "employee4@fuchsius.com", employeeId: "STORE-EMP-004", role: ROLES.STORE_EMPLOYEE, storeCode: "STR-003" },
];

// Create any missing stores and store users (existing records are left untouched)
export async function seedStoreUsers() {
  // $setOnInsert keeps stores that already exist exactly as they are
  for (const store of STORES) {
    await Store.updateOne({ code: store.code }, { $setOnInsert: store }, { upsert: true });
  }

  for (const { storeCode, ...data } of STORE_USERS) {
    if (await User.exists({ $or: [{ email: data.email }, { employeeId: data.employeeId }] })) continue;
    const store = await Store.findOne({ code: storeCode }).select("_id");
    // passwordHash is hashed by the User model before saving
    await User.create({ ...data, passwordHash: "Store@123", store: store._id, status: "Active" }); // Store@123 = default password for every seeded store account; saved hashed, never as plain text
    logger.info(`Seeded store user ${data.email}`);
  }
}
