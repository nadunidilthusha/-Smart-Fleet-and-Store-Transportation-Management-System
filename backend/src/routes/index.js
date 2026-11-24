import { Router } from "express";
import { ROLES } from "../config/constants.js";
import { env } from "../config/env.js";
import protect from "../middleware/auth.js";
import authorize from "../middleware/authorize.js";
import healthRoutes from "./health.routes.js";
import storeRoutes from "./store.routes.js";
import authRoutes from "../modules/auth/auth.routes.js";
import usersRoutes from "../modules/users/users.routes.js";
import storesRoutes from "../modules/stores/stores.routes.js";
import itemsRoutes from "../modules/items/items.routes.js";
import vehiclesRoutes from "../modules/vehicles/vehicles.routes.js";
import bookingsRoutes from "../modules/bookings/bookings.routes.js";
import tripsRoutes from "../modules/trips/trips.routes.js";
import scheduleRoutes from "../modules/schedule/schedule.routes.js";
import trackingRoutes from "../modules/tracking/tracking.routes.js";
import notificationsRoutes from "../modules/notifications/notifications.routes.js";
import dashboardRoutes from "../modules/dashboard/dashboard.routes.js";
import reportsRoutes from "../modules/reports/reports.routes.js";
import auditRoutes from "../modules/audit/audit.routes.js";

// All API routes. A new module = one import + one router.use line here.
const router = Router();

// ---- Public ----
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);

// ---- Admin portal: signed in + SYSTEM_ADMIN ----
const adminOnly = [protect, authorize(ROLES.SYSTEM_ADMIN)];
// TEMP (development only): Vehicles, Stores and Items skip sign-in until login is built; production and test keep adminOnly. Remove once login works.
const vehiclesGuard = env.NODE_ENV === "development" ? [] : adminOnly;
router.use("/users", ...adminOnly, usersRoutes);             // admin-web src/api/userApi.js
router.use("/stores", ...vehiclesGuard, storesRoutes);       // admin-web src/api/storeApi.js
router.use("/items", ...vehiclesGuard, itemsRoutes);            // admin-web src/api/itemApi.js
router.use("/vehicles", ...vehiclesGuard, vehiclesRoutes);   // admin-web src/api/vehicleApi.js
router.use("/bookings", ...adminOnly, bookingsRoutes);       // admin-web src/api/bookingApi.js and store-web src/api/bookingApi.js
router.use("/trips", ...adminOnly, tripsRoutes);             // admin-web TripPlanner and Trips pages; store-web TripProgress pages
router.use("/schedule", ...adminOnly, scheduleRoutes);       // admin-web and store-web Schedule pages
router.use("/tracking", ...adminOnly, trackingRoutes);       // admin-web src/api/trackingApi.js
router.use("/notifications", ...adminOnly, notificationsRoutes); // admin-web and store-web src/api/notificationApi.js
router.use("/dashboard", ...adminOnly, dashboardRoutes);     // admin-web src/api/dashboardApi.js and store-web src/api/dashboardApi.js
router.use("/reports", ...adminOnly, reportsRoutes);         // admin-web src/api/reportApi.js
router.use("/audit-log", ...adminOnly, auditRoutes);         // admin-web src/api/auditApi.js

// ---- Store portal: signed in + store roles ----
router.use("/store", protect, authorize(ROLES.STORE_MANAGER, ROLES.STORE_EMPLOYEE), storeRoutes);

export default router;
