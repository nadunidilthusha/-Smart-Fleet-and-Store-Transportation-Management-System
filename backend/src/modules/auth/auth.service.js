import User from "../users/users.model.js";
import Store from "../stores/stores.model.js";
import ApiError from "../../utils/ApiError.js";
import { ROLES } from "../../config/constants.js";
import { signToken } from "../../utils/token.js";

// Business logic and database access for auth lives here.
// Controllers call these functions. Keep req and res out of this file.
// TODO (admin portal): check the password (bcryptjs), then return { token: signToken(...), user }  -> see utils/token.js

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
