export const ROLES = {
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  STORE_MANAGER: "STORE_MANAGER",
  STORE_EMPLOYEE: "STORE_EMPLOYEE",
  //DRIVER: "DRIVER",
};

export const ROLE_LABELS = {
  SYSTEM_ADMIN: "System Administrator",
  STORE_MANAGER: "Store Manager",
  STORE_EMPLOYEE: "Store Employee",
  //DRIVER: "Driver",
};

// true when no roles are required, or the user's role is in the list
export const hasRole = (user, allowedRoles = []) =>
  allowedRoles.length === 0 || allowedRoles.includes(user?.role);
