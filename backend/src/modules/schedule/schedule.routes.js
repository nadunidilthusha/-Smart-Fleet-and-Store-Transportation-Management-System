import { Router } from "express";
import * as controller from "./schedule.controller.js";

const router = Router();

// Frontend: admin-web and store-web Schedule pages (also the Loading slots card on the dashboards)
// Mounted in routes/index.js at /api/schedule (SYSTEM_ADMIN only)
router.get("/", controller.list);                              // GET   /api/schedule

export default router;
