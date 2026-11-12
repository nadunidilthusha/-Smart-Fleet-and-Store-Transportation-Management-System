import { ROLES } from "../utils/roles";

// Frontend-only mock auth - no backend calls for store login yet.
const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

// Stores available in the assigned store location dropdown
export const STORE_OPTIONS = [
    {
        id: "main",
        name: "Main Store - Biyagama (Regional Hub)",
        shortName: "Main Store - Biyagama",
    },
    {
        id: "jaela",
        name: "Store 2 - Ja-Ela (Distribution)",
        shortName: "Store 2 - Ja-Ela",
    },
    {
        id: "kandy",
        name: "Store 3 - Kandy (Regional)",
        shortName: "Store 3 - Kandy",
    },
];

/*
  Dummy store-portal accounts (password for all: Store@123)
  - ashan.w@fleetline.store  → Store Manager @ Main Store
  - nimal.e@fleetline.store  → Store Employee @ Main Store
  - kamal.j@fleetline.store  → Store Manager @ Ja-Ela
  - ruwan.k@fleetline.store  → Store Employee @ Kandy
  - driver.s@fleetline.store → Driver (blocked by portal role guard)
*/

const MOCK_USERS = [
    {
        id: "u-mgr-main",
        name: "Ashan Wickrama",
        email: "ashan.w@fleetline.store",
        employed: "EMP-1001",
        password: "Store@123",
        role: ROLES.STORE_MANAGER,
        storeId: "main"
    },
    {
        id: "u-mgr-main",
        name: "Nimal Perera",
        email: "nimal.e@fleetline.store",
        employed: "EMP-1042",
        password: "Store@123",
        role: ROLES.STORE_EMPLOYEE,
        storeId: "main",
    },
    {
        id: "u-mgr-jaela",
        name: "Kamal Jayasuriya",
        email: "kamal.j@fleetline.store",
        employed: "EMP-1108",
        password: "Store@123",
        role: ROLES.STORE_MANAGER,
        storeId: "jaela",
    },
    {
        id: "u-mgr-kandy",
        name: "Ruwan Silva",
        email: "ruwan.k@fleetline.store",
        employed: "EMP-1203",
        password: "Store@123",
        role: ROLES.STORE_EMPLOYEE,
        storeId: "kandy"
    },
    {
        id: "u-driver",
        name: "S. Dias",
        email: "driver.s@fleetline.store",
        employeeId: "DRV-0091",
        password: "Store@123",
        role: ROLES.DRIVER,
        storeId: "main",
    },
];

// Normalize email / employee-id input for lookup
function normalizeIdentity(value) {
    return String(value ?? "").trim().toLowerCase();
}

// Return the store option list used by the login dropdown
export async function getStoreOptions() {
    await wait(120);
    return STORE_OPTIONS.map(({ id, name, shortName }) => ({ id, name, shortName }));
}

// Return the store option list used by the login dropdown
export async function loginRequest({ storeId, identity, password}) {
    await wait();

    const store = STORE_OPTIONS.find((item) => item.id === storeId);
    if (!store) {
        const error = new Error("Select a valid assigned location.");
        error.code = "INVALID_STORE";
        throw error;
    }

    const key = normalizeIdentity(identity);
    const matched = MOCK_USERS.find(
        (user) => 
            user.storeId === storeId &&
            (normalizeIdentity(user.email) === key || normalizeIdentity(user.employeeId === key))
    );

    if (!matched || matched.password !== password) {
        const error = new Error("Invalid credentials for the selected store.");
        error.code = "INVALID_CREDENTIALS";
        throw error;
    }

    // Only store-portal roles may continue past login into the console
    if (matched.role !== ROLES.STORE_MANAGER && matched.role !== ROLES.STORE_EMPLOYEE) {
        const error = new Error("This account is not permitted to use the store portal.");
        error.code = "ROLE_DENIED";
        throw error;
    }

    // Shape returned to AuthContext.login({ token, user })
    return {
        token: `mock-store-token-${matched.id}`,
        user: {
            id: matched.id,
            name: matched.name,
            email: matched.email,
            employeeId: matched.employeeId,
            role: matched.role,
            storeId: store.id,
            storeName: store.shortName,
        },
    };
}