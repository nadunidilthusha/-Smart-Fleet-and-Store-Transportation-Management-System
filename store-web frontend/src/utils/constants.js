// Authentication storage keys
export const TOKEN_KEY = "store_token";
export const USER_KEY = "store_user";

// Application information
export const APP_NAME = "FleetLine";
export const APP_FULL_NAME = "Smart Fleet and Store Transportation Management System";
export const APP_VERSION = "1.0";

// Sidebar navigation for the store portal
export const NAV_GROUPS = [
  {
    label: null,
    items: [{ label: "Dashboard", to: "/dashboard", icon: "dashboard" }],
  },
  {
    label: "BOOKINGS",
    items: [{ label: "Bookings", to: "/bookings", icon: "bookings" }],
  },
  {
    label: "OPERATIONS",
    items: [
      { label: "Store schedule", to: "/schedule", icon: "schedule" },
      { label: "Trip progress", to: "/trip-progress", icon: "trips" },
      { label: "Goods confirmation", to: "/goods-confirmation", icon: "items" },
    ],
  },
];

// Trip status indicator colors
export const TRIP_STATUS_DOT = {
  Planned: "bg-blue-500",
  Scheduled: "bg-blue-500",
  "In transit": "bg-green-500",
  Loading: "bg-amber-500",
  Unloading: "bg-amber-500",
  Delayed: "bg-red-500",
  Completed: "bg-slate-400",
  Cancelled: "bg-slate-400",
  "Waiting at store": "bg-amber-500",
  Unallocated: "bg-slate-400",
};

// Page titles for the top navigation bar
export function getPageTitle(pathname) {
  const pageTitles = [
    ["/dashboard", "Dashboard"],
    ["/bookings/new", "New booking"],
    ["/bookings", "Bookings"],
    ["/schedule", "Store schedule"],
    ["/trip-progress", "Trip progress"],
    ["/goods-confirmation", "Goods confirmation"],
    ["/notifications", "Notifications"],
  ];

  const match = pageTitles.find(
    ([path]) => pathname === path || pathname.startsWith(`${path}/`)
  );

  return match?.[1] ?? "Dashboard";
}
