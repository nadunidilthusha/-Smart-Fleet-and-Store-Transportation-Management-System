import { Router } from "express";
import * as controller from "./audit.controller.js";
import validate from "../../middleware/validate.js";
import { listAuditSchema, exportAuditSchema } from "./audit.schema.js";

const router = Router();

// Frontend: admin-web src/api/auditApi.js (Audit log page)
// Mounted in routes/index.js at /api/audit-log (SYSTEM_ADMIN only)
// Read-only on purpose: there is no route to edit or delete an entry. Entries are written by middleware/audit.js and the auth module.
router.get("/", validate({ query: listAuditSchema }), controller.list);   // GET   /api/audit-log          -> { entries, total, page, limit, summary }
router.get("/filters", controller.filters);                    // GET   /api/audit-log/filters  -> { users, entities, actions }
router.get("/:id", controller.getOne);                         // GET   /api/audit-log/:id      one entry (keep after the fixed paths above)
router.post("/export", validate({ body: exportAuditSchema }), controller.exportLog); // POST  /api/audit-log/export   body { rowCount }

export default router;
