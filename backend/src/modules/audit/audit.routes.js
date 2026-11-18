import { Router } from "express";
import * as controller from "./audit.controller.js";

const router = Router();

// Frontend: admin-web src/api/auditApi.js (Audit log page)
// Mounted in routes/index.js at /api/audit-log (SYSTEM_ADMIN only)
router.get("/", controller.list);                              // GET   /api/audit-log

export default router;
