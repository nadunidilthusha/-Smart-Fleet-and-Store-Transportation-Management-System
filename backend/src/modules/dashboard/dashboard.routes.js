import { Router } from "express";
import * as controller from "./dashboard.controller.js";

const router = Router();

// Frontend: admin-web src/api/dashboardApi.js and store-web src/api/dashboardApi.js
// Mounted in routes/index.js at /api/dashboard (SYSTEM_ADMIN only)
router.get("/", controller.summary);                           // GET   /api/dashboard   KPI cards, trips today, loading slots, pending approvals

export default router;
