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

// Feature keys used by route guards and UI permission
export const PERMISSIONS = {
  VIEW_DASHBOARD: "VIEW_DASHBOARD",
  MANAGE_BOOKINGS: "MANAGE_BOOKINGS",
  VIEW_SCHEDULE: "VIEW_SCHEDULE",
  VIEW_TRIP_PROGRESS: "VIEW_TRIP_PROGRESS",
  CONFIRM_GOODS: "CONFIRM_GOODS",
  VIEW_NOTIFICATIONS: "VIEW_NOTIFICATIONS",
};

// Store-portal capabilities granted per role
const ROLE_PERMISSIONS = {
  [ROLES.STORE_MANAGER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_BOOKINGS,
    PERMISSIONS.VIEW_SCHEDULE,
    PERMISSIONS.VIEW_TRIP_PROGRESS,
    PERMISSIONS.CONFIRM_GOODS,
    PERMISSIONS.VIEW_NOTIFICATIONS,
  ],
  [ROLES.STORE_EMPLOYEE]: [
    PERMISSIONS.VIEW_DASHBOARD,
    //PERMISSIONS.MANAGE_BOOKINGS,
    PERMISSIONS.VIEW_SCHEDULE,
    PERMISSIONS.VIEW_TRIP_PROGRESS,
    PERMISSIONS.CONFIRM_GOODS,
    PERMISSIONS.VIEW_NOTIFICATIONS,
  ]
}

// true when no roles are required, or the user's role is in the list
export const hasRole = (user, allowedRoles = []) =>
  allowedRoles.length === 0 || allowedRoles.includes(user?.role);

// true when the user's role includes the requested permission key
export const canAccess = (user, permission) => {
  if (!user?.role || !permission) return false;
  const granted = ROLE_PERMISSIONS[user.role] || [];
  return granted.includes(permission);
}
