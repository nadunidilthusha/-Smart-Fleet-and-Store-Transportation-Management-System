
import mongoose from "mongoose";
import User from "./users.model.js";
import Store from "../stores/stores.model.js";
import ApiError from "../../utils/ApiError.js";
import { ROLES } from "../../config/constants.js";

// Roles that must be assigned to a store
const STORE_ROLES = [
  ROLES.STORE_MANAGER,
  ROLES.STORE_EMPLOYEE,
];

// Convert MongoDB user documents into safe frontend objects
function formatUser(user) {
  const store = user.store;

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    employeeId: user.employeeId,
    role: user.role,
    storeId: store?._id
      ? String(store._id)
      : store
        ? String(store)
        : null,
    storeName: store?.name || null,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// Check whether a store exists and is active
async function validateStore(storeId) {
  if (!storeId) {
    throw ApiError.badRequest(
      "A store must be assigned to this user."
    );
  }

  if (!mongoose.isValidObjectId(storeId)) {
    throw ApiError.badRequest("Invalid store ID.");
  }

  const store = await Store.findById(storeId);

  if (!store || store.status === "Inactive") {
    throw ApiError.badRequest(
      "Select a valid active store."
    );
  }

  return store;
}

// Validate role and store assignment
async function validateRoleAndStore(role, storeId) {
  if (role === ROLES.SYSTEM_ADMIN) {
    return null;
  }

  if (STORE_ROLES.includes(role)) {
    return await validateStore(storeId);
  }

  // Drivers may optionally have a home store
  if (storeId) {
    return await validateStore(storeId);
  }

  return null;
}

// Handle duplicate email and employee ID errors
function handleDatabaseError(error) {
  if (error?.code === 11000) {
    if (error.keyPattern?.email) {
      throw ApiError.conflict(
        "This email address is already registered.",
        {
          errors: [
            {
              field: "email",
              message: "This email address is already in use.",
            },
          ],
        }
      );
    }

    if (error.keyPattern?.employeeId) {
      throw ApiError.conflict(
        "This employee ID is already registered.",
        {
          errors: [
            {
              field: "employeeId",
              message: "This employee ID is already in use.",
            },
          ],
        }
      );
    }

    throw ApiError.conflict(
      "A user with these details already exists."
    );
  }

  throw error;
}

// GET /api/users
export async function listUsers() {
  const users = await User.find()
    .populate("store", "name")
    .sort({ createdAt: -1 });

  return users.map(formatUser);
}

// GET /api/users/:id
export async function getUserById(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw ApiError.badRequest("Invalid user ID.");
  }

  const user = await User.findById(id)
    .populate("store", "name");

  if (!user) {
    throw ApiError.notFound("User not found.");
  }

  return formatUser(user);
}

// POST /api/users
export async function createUser(data) {
  const {
    name,
    email,
    employeeId,
    password,
    role,
    storeId,
  } = data;

  const store = await validateRoleAndStore(role, storeId);

  try {
    const user = new User({
      name,
      email: email.toLowerCase(),
      employeeId: employeeId.toUpperCase(),
      passwordHash: password,
      role,
      store: store?._id || null,
      status: "Active",
    });

    await user.save();

    await user.populate("store", "name");

    return formatUser(user);
  } catch (error) {
    handleDatabaseError(error);
  }
}

// PATCH /api/users/:id
export async function updateUser(id, data, currentUserId) {
  if (!mongoose.isValidObjectId(id)) {
    throw ApiError.badRequest("Invalid user ID.");
  }

  const user = await User.findById(id);

  if (!user) {
    throw ApiError.notFound("User not found.");
  }

  const isSelf = String(user._id) === String(currentUserId);

  // Prevent users from changing their own role or status
  if (
    isSelf &&
    (data.role !== undefined || data.status !== undefined)
  ) {
    throw ApiError.forbidden(
      "You cannot change your own role or status."
    );
  }

  const nextRole = data.role ?? user.role;
  const nextStatus = data.status ?? user.status;

  // Do not allow removal of the last active administrator
  const removingActiveAdmin =
    user.role === ROLES.SYSTEM_ADMIN &&
    user.status === "Active" &&
    (
      nextRole !== ROLES.SYSTEM_ADMIN ||
      nextStatus !== "Active"
    );

  if (removingActiveAdmin) {
    const activeAdminCount = await User.countDocuments({
      role: ROLES.SYSTEM_ADMIN,
      status: "Active",
    });

    if (activeAdminCount <= 1) {
      throw ApiError.conflict(
        "At least one active administrator is required."
      );
    }
  }

  // Resolve the resulting store assignment
  let nextStoreId;

  if (nextRole === ROLES.SYSTEM_ADMIN) {
    nextStoreId = null;
  } else if (data.storeId !== undefined) {
    nextStoreId = data.storeId;
  } else {
    nextStoreId = user.store
      ? String(user.store)
      : null;
  }

  const store = await validateRoleAndStore(
    nextRole,
    nextStoreId
  );

  // Update only the fields provided by the frontend
  if (data.name !== undefined) {
    user.name = data.name;
  }

  if (data.email !== undefined) {
    user.email = data.email.toLowerCase();
  }

  if (data.password) {
    // The User model hashes this in its pre-save hook
    user.passwordHash = data.password;
  }

  if (data.role !== undefined) {
    user.role = nextRole;
  }

  if (
    data.role !== undefined ||
    data.storeId !== undefined
  ) {
    user.store = store?._id || null;
  }

  if (data.status !== undefined) {
    user.status = nextStatus;
  }

  try {
    await user.save();

    await user.populate("store", "name");

    return formatUser(user);
  } catch (error) {
    handleDatabaseError(error);
  }
}
