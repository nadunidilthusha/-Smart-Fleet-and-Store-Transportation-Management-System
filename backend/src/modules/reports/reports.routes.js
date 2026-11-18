import { Router } from "express";
import * as controller from "./reports.controller.js";

const router = Router();

// Frontend: admin-web src/api/reportApi.js (Reports page)
// Mounted in routes/index.js at /api/reports (SYSTEM_ADMIN only)
router.get("/", controller.list);                              // GET   /api/reports   TODO: agree the report types with the frontend

export default router;
