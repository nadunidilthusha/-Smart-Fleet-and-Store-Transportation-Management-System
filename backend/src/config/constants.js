// Shared constants. Keep these in sync with the frontends:
//   roles    -> src/utils/roles.js
//   statuses -> src/api/bookingApi.js, vehicleApi.js, notificationApi.js

export const ROLES = {
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  STORE_MANAGER: "STORE_MANAGER",
  STORE_EMPLOYEE: "STORE_EMPLOYEE",
  DRIVER: "DRIVER",
};

export const BOOKING_STATUSES = [
  "Draft",
  "Pending approval",
  "Approved",
  "Changes requested",
  "Scheduled",
  "In transit",
  "Completed",
  "Cancelled",
  "Rejected",
];

export const BOOKING_PRIORITIES = ["Standard", "Urgent"];

export const VEHICLE_STATUSES = ["Available", "In Use", "Maintenance", "Inactive"];

export const NOTIFICATION_TYPES = ["booking", "trip", "vehicle", "system"];
export const NOTIFICATION_SEVERITIES = ["info", "warning", "critical"];
