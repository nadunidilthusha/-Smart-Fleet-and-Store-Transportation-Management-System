import { Router } from "express";
import * as controller from "./reports.controller.js";
import validate from "../../middleware/validate.js";
import { exportReportSchema, reportParamsSchema, reportQuerySchema } from "./reports.schema.js";

const router = Router();

// Frontend: admin-web src/api/reportApi.js (Reports page)
// Mounted in routes/index.js at /api/reports (SYSTEM_ADMIN only)
// Read-only: every report is calculated from the existing collections when it is requested.
router.get("/options", controller.options);                    // GET   /api/reports/options  -> { types, stores, vehicles }
router.post("/export", validate({ body: exportReportSchema }), controller.exportReport); // POST  /api/reports/export   body { type, rowCount }
// :type is bookings | trips | vehicles | stores | items | goods | audit (keep after the fixed paths above)
router.get("/:type", validate({ params: reportParamsSchema, query: reportQuerySchema }), controller.get); // GET   /api/reports/:type?from&to&tz&q&status&store&vehicle&category&sort&dir&page&limit

export default router;
