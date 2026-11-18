import { Router } from "express";
import * as controller from "./items.controller.js";

const router = Router();

// Frontend: admin-web src/api/itemApi.js (Items dashboard, Add Item, booking item picker)
// Mounted in routes/index.js at /api/items (SYSTEM_ADMIN only)
router.get("/", controller.catalog);                           // GET   /api/items           -> [{ code, name, unit }] for booking item pickers
router.get("/records", controller.records);                    // GET   /api/items/records   -> rows for the Items table
router.post("/", controller.create);                           // POST  /api/items           create or save as draft ({ ...record, asDraft })
router.patch("/:id", controller.update);                       // PATCH /api/items/:id

export default router;
