import { Router } from "express";
import * as controller from "./stores.controller.js";

const router = Router();

// Frontend: admin-web src/api/storeApi.js (Stores dashboard, Add Store, booking dropdowns)
// Mounted in routes/index.js at /api/stores (SYSTEM_ADMIN only)
router.get("/", controller.options);                           // GET   /api/stores           -> [{ id, name }] for booking dropdowns
router.get("/records", controller.records);                    // GET   /api/stores/records   -> rows for the Stores table
router.post("/", controller.create);                           // POST  /api/stores           create or save as draft ({ ...record, asDraft })
router.patch("/:id", controller.update);                       // PATCH /api/stores/:id

export default router;
