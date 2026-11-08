
// Authentication storage keys
export const TOKEN_KEY = "token";
export const USER_KEY = "user";

// Application information
export const APP_NAME = "Smart Fleet";
export const APP_FULL_NAME = "Smart Fleet and Store Transportation Management System";
export const APP_VERSION = "1.0.0";

// Sidebar navigation
export const NAV_GROUPS = [
  {
    label: null,
    items: [
      { label: "Dashboard", to: "/dashboard", icon: "dashboard" },
      { label: "Bookings", to: "/bookings", icon: "bookings" },
      { label: "Trips", to: "/trips", icon: "trips" },
      { label: "Trip Planning", to: "/trip-planner", icon: "planning" },
      { label: "Schedule", to: "/schedule", icon: "schedule" },
      { label: "Live Map", to: "/live-map", icon: "map" },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { label: "Vehicles", to: "/vehicles", icon: "vehicles" },
      { label: "Stores", to: "/stores", icon: "stores" },
      { label: "Items", to: "/items", icon: "items" },
      { label: "Users", to: "/users", icon: "users" },
    ],
  },
  {
    label: "ANALYTICS",
    items: [
      { label: "Reports", to: "/reports", icon: "reports" },
      { label: "Audit Log", to: "/audit-log", icon: "reports" },
    ],
  },
];

// Trip status indicator colors
export const TRIP_STATUS_DOT = {
  "Planned": "bg-blue-500",
  "Scheduled": "bg-blue-500",
  "In transit": "bg-green-500",
  "Loading": "bg-amber-500",
  "Unloading": "bg-amber-500",
  "Delayed": "bg-red-500",
  "Completed": "bg-slate-400",
  "Cancelled": "bg-slate-400",
};

// Page titles for the top navigation bar
export function getPageTitle(pathname) {
  const pageTitles = [
    ["/dashboard", "Dashboard"],
    ["/bookings", "Bookings"],
    ["/trips", "Trips"],
    ["/trip-planner", "Trip Planning"],
    ["/schedule", "Schedule"],
    ["/live-map", "Live Map"],
    ["/vehicles", "Vehicles"],
    ["/stores", "Stores"],
    ["/items", "Items"],
    ["/users", "Users"],
    ["/reports", "Reports"],
    ["/audit-log", "Audit Log"],
    ["/notifications", "Notifications"],
  ];

  const match = pageTitles.find(([path]) =>
    pathname === path || pathname.startsWith(path + "/")
  );

  return match?.[1] ?? "Dashboard";
}
