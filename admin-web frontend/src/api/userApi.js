import apiClient from "./apiClient";

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

let mockUsers = [
  { id: "demo-admin", name: "Sadun Perera", email: "admin@fuchsius.com", employeeId: "EMP-001", role: "SYSTEM_ADMIN", storeId: null, status: "Active", createdAt: "2026-09-01T08:00:00" },
  { id: "u-2", name: "Ashan Wickrama", email: "ashan.w@fleetline.store", employeeId: "EMP-1001", role: "STORE_MANAGER", storeId: "main", status: "Active", createdAt: "2026-09-03T09:10:00" },
  { id: "u-3", name: "Nimal Perera", email: "nimal.p@fleetline.store", employeeId: "EMP-1002", role: "STORE_EMPLOYEE", storeId: "main", status: "Active", createdAt: "2026-09-03T09:20:00" },
  { id: "u-4", name: "Kamal Jayasuriya", email: "kamal.j@fleetline.store", employeeId: "EMP-1003", role: "STORE_MANAGER", storeId: "store-2", status: "Active", createdAt: "2026-09-05T10:00:00" },
  { id: "u-5", name: "Nimali Bandara", email: "nimali.b@fleetline.store", employeeId: "EMP-1004", role: "STORE_EMPLOYEE", storeId: "store-3", status: "Active", createdAt: "2026-09-08T11:30:00" },
  { id: "u-6", name: "Ruwan Silva", email: "ruwan.s@fleetline.store", employeeId: "EMP-1005", role: "STORE_MANAGER", storeId: "store-3", status: "Active", createdAt: "2026-09-08T11:45:00" },
  { id: "u-7", name: "Kasun Silva", email: "kasun.s@fleetline.store", employeeId: "DRV-0091", role: "DRIVER", storeId: "main", status: "Active", createdAt: "2026-09-12T08:15:00" },
  { id: "u-8", name: "Roshan Fernando", email: "roshan.f@fleetline.store", employeeId: "DRV-0092", role: "DRIVER", storeId: null, status: "Inactive", createdAt: "2026-09-12T08:20:00" },
];
let nextMockId = 9;

// Same error shape axios gives, so the page has one code path for mock and real
function fail(status, message, errors = []) {
  const error = new Error(message);
  error.response = { status, data: { message, errors } };
  return error;
}

const copy = (value) => JSON.parse(JSON.stringify(value));

function checkDuplicates(candidate, ignoreId) {
  const errors = [];
  const others = mockUsers.filter((u) => u.id !== ignoreId);
  if (candidate.email && others.some((u) => u.email.toLowerCase() === candidate.email.toLowerCase())) {
    errors.push({ field: "email", message: "This email is already in use." });
  }
  if (candidate.employeeId && others.some((u) => u.employeeId.toLowerCase() === candidate.employeeId.toLowerCase())) {
    errors.push({ field: "employeeId", message: "This employee ID is already in use." });
  }
  if (errors.length) throw fail(409, "A user with these details already exists.", errors);
}

export async function getUsers() {
  if (USE_MOCK) {
    await wait();
    return copy(mockUsers);
  }
  const { data } = await apiClient.get("/users");
  return data;
}

export async function createUser(payload) {
  if (USE_MOCK) {
    await wait(400);
    checkDuplicates(payload);
    // eslint-disable-next-line no-unused-vars
    const { password, ...rest } = payload;
    const created = { id: `u-${nextMockId++}`, ...rest, status: "Active", createdAt: new Date().toISOString() };
    mockUsers = [created, ...mockUsers];
    return copy(created);
  }
  const { data } = await apiClient.post("/users", payload);
  return data;
}

export async function updateUser(id, patch) {
  if (USE_MOCK) {
    await wait(350);
    const index = mockUsers.findIndex((u) => u.id === id);
    if (index === -1) throw fail(404, "User not found.");
    checkDuplicates(patch, id);
    // eslint-disable-next-line no-unused-vars
    const { password, ...rest } = patch;
    mockUsers[index] = { ...mockUsers[index], ...rest };
    return copy(mockUsers[index]);
  }
  const { data } = await apiClient.patch(`/users/${id}`, patch);
  return data;
}

// Server field names -> form field names, so errors show under the right input
const FIELD_MAP = {
  name: "name",
  email: "email",
  employeeId: "employeeId",
  role: "role",
  store: "storeId",
  storeId: "storeId",
  password: "password",
  passwordHash: "password",
  status: "status",
};

// Turns any API error into { message, fieldErrors }
export function parseUserError(error, fallback = "Something went wrong. Try again.") {
  const fieldErrors = {};
  (error?.response?.data?.errors ?? []).forEach((item) => {
    const key = FIELD_MAP[item.field];
    if (key && !fieldErrors[key]) fieldErrors[key] = item.message;
  });
  let message = error?.response?.data?.message ?? fallback;
  if (!error?.response) message = "We could not reach the server. Check your connection and try again.";
  return { message, fieldErrors };
}