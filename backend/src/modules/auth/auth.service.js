import bcrypt from "bcryptjs";
import User from "../users/users.model.js";
import Store from "../stores/stores.model.js";
import ApiError from "../../utils/ApiError.js";
import { ROLES } from "../../config/constants.js";
import { signToken } from "../../utils/token.js";

/* =====================================================================
   1. ADMIN PORTAL  (POST /api/auth/login, GET /api/auth/me)
   ===================================================================== */

const MAX_FAILED_ATTEMPTS = 5; // wrong passwords allowed ...
const LOCK_MINUTES = 15; // ... before sign-in is paused for this long
const LOCK_MS = LOCK_MINUTES * 60 * 1000;


const failedAttempts = new Map();


const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

function assertNotLocked(key) {
  const entry = failedAttempts.get(key);
  if (entry?.lockedUntil > Date.now()) {
    const minutes = Math.ceil((entry.lockedUntil - Date.now()) / 60000);
    throw new ApiError(429, `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`, {
      code: "TOO_MANY_ATTEMPTS",
    });
  }
}

function recordFailure(key) {
  const now = Date.now();
  const entry = failedAttempts.get(key);
  const expired = !entry || now - entry.first > LOCK_MS || (entry.lockedUntil && entry.lockedUntil <= now);
  const next = expired ? { count: 1, first: now, lockedUntil: 0 } : { ...entry, count: entry.count + 1 };
  if (next.count >= MAX_FAILED_ATTEMPTS) next.lockedUntil = now + LOCK_MS;
  failedAttempts.set(key, next);

  // keep the map small: drop entries whose window is over
  if (failedAttempts.size > 1000) {
    for (const [k, v] of failedAttempts) if (now - v.first > LOCK_MS && v.lockedUntil <= now) failedAttempts.delete(k);
  }
}

// The user object the frontends keep in localStorage after login
function toSessionUser(user) {
  const base = { id: String(user._id), name: user.name, email: user.email, employeeId: user.employeeId, role: user.role };
  if (user.store?._id) return { ...base, storeId: String(user.store._id), storeName: user.store.name };
  return base;
}

// POST /api/auth/login -> { token, user }   (administrators only)
export async function adminLogin({ email, password, ip = "" }) {
  const key = `${ip}|${email}`;
  assertNotLocked(key);

  const user = await User.findOne({ email }).select("+passwordHash").populate("store", "name");

  // Same message and same timing for an unknown email and a wrong password, so accounts cannot be guessed
  const passwordOk = user ? await user.comparePassword(password) : (await bcrypt.compare(password, DUMMY_HASH), false);
  if (!passwordOk) {
    recordFailure(key);
    throw ApiError.unauthorized("Incorrect email or password.");
  }
  failedAttempts.delete(key);

  // These are only checked after the password is correct
  if (user.status !== "Active") throw ApiError.forbidden("This account is inactive. Contact the system administrator.");
  if (user.role !== ROLES.SYSTEM_ADMIN) {
    throw ApiError.forbidden("This account cannot use the admin portal. Use the store portal instead.");
  }

  const token = signToken({ sub: String(user._id), role: user.role, name: user.name });
  return { token, user: toSessionUser(user) };
}

// GET /api/auth/me -> the signed-in user (works for admin and store accounts)
export async function getMe(userId) {
  const user = await User.findById(userId).populate("store", "name");
  // 401 makes the frontend sign the person out
  if (!user || user.status !== "Active") throw ApiError.unauthorized("Your account is no longer active. Please sign in again.");
  return toSessionUser(user);
}

/* =====================================================================
   2. STORE WEB  (POST /api/auth/store/login, GET /api/auth/store/locations)
   ===================================================================== */

// Roles allowed to use the Store Web portal (admins and drivers can never sign in there)
const STORE_ROLES = [ROLES.STORE_MANAGER, ROLES.STORE_EMPLOYEE];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Store Web: active store locations for the login dropdown (public, no sensitive data)
export async function listStoreLocations() {
  const stores = await Store.find({ status: { $ne: "Inactive" } }).sort({ code: 1 }).select("name shortName");
  return stores.map((store) => ({ id: String(store._id), name: store.name, shortName: store.shortName || store.name }));
}

// Store Web: sign in a store manager or employee for the selected store, returns { token, user }
export async function storeLogin({ storeId, identity, password }) {
  // The selected location must be a real, active store
  const store = /^[a-f\d]{24}$/i.test(storeId) ? await Store.findById(storeId) : null;
  if (!store || store.status === "Inactive") throw ApiError.badRequest("Select a valid assigned location.");

  // Match by work email or employee ID, only among users assigned to this store (admins have no store)
  const key = identity.trim();
  const user = await User.findOne({
    store: store._id,
    $or: [{ email: key.toLowerCase() }, { employeeId: new RegExp(`^${escapeRegex(key)}$`, "i") }],
  }).select("+passwordHash");

  // Same message for unknown user and wrong password so accounts cannot be guessed
  const invalid = ApiError.unauthorized("Invalid credentials for the selected store.");
  if (!user || !(await user.comparePassword(password))) throw invalid;

  // Only checked after the password is correct
  if (user.status !== "Active") throw ApiError.forbidden("This account is inactive. Contact your Store Admin.");
  if (!STORE_ROLES.includes(user.role)) throw ApiError.forbidden("This account is not permitted to use the store portal.");

  // Token carries the store so every /api/store query can be limited to it
  const token = signToken({ sub: String(user._id), role: user.role, storeId: String(store._id), name: user.name });
  return {
    token,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      employeeId: user.employeeId,
      role: user.role,
      storeId: String(store._id),
      storeName: store.name,
    },
  };
}