import apiClient from "./apiClient";
import { ROLES } from "../utils/roles";


const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const wait = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));



// Shown on the login page only while VITE_USE_MOCK is on
export const DEMO_ACCOUNTS = [
  { label: "Administrator", email: "admin@smartfleet.com", password: "Admin@123" },
  { label: "Store manager (not allowed here)", email: "mmanager@smartfleet.com", password: "Manager@123" },
];

const MOCK_USERS = [
  { id: "demo-admin", name: "Sadun Perera", email: "admin@smartfleet.com", password: "Admin@123", role: ROLES.SYSTEM_ADMIN },
  { id: "mock-manager", name: "Ashan Wickrama", email: "manager@smartfleet.com", password: "Manager@123", role: ROLES.STORE_MANAGER, storeId: "main" },
];

// Error in the same shape axios gives, so the page has one code path
function fail(status, message) {
  const error = new Error(message);
  error.response = { status, data: { message } };
  return error;
}

export async function loginRequest({ email, password }) {
  const cleanEmail = email.trim().toLowerCase();

  if (USE_MOCK) {
    await wait();
    const found = MOCK_USERS.find((u) => u.email === cleanEmail && u.password === password);
    if (!found) throw fail(401, "Incorrect email or password.");
    // eslint-disable-next-line no-unused-vars
    const { password: _hidden, ...user } = found;
    return { token: `mock-token-${user.id}`, user };
  }

  const { data } = await apiClient.post("/auth/login", { email: cleanEmail, password });
  return data;
}

// Friendly text for the red message above the form
export function loginErrorMessage(error) {
  if (!error?.response) return "We could not reach the server. Check your connection and try again.";
  if (error.response.data?.message) return error.response.data.message;
  return "Sign in failed. Try again.";
}