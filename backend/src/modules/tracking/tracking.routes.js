import { Router } from "express";
import * as controller from "./tracking.controller.js";

const router = Router();

// Frontend: admin-web src/api/trackingApi.js (Live map). Positions are also pushed through sockets/
// Mounted in routes/index.js at /api/tracking (SYSTEM_ADMIN only)
router.get("/live", controller.live);                          // GET   /api/tracking/live   latest position of every active vehicle

export default router;
