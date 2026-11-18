import { Router } from "express";
import * as controller from "./schedule.store.controller.js";

const router = Router();

// Store portal. Frontend: admin-web and store-web Schedule pages (also the Loading slots card on the dashboards)
// Mounted in routes/store.routes.js at /api/store (store roles only, data limited to req.user.storeId)
router.get("/schedule", controller.list);                      // GET   /api/store/schedule   slots of the signed-in store

export default router;
