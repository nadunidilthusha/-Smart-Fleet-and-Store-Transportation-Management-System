import { Router } from "express";
import * as controller from "./items.controller.js";
import validate from "../../middleware/validate.js";
import { createItemSchema, updateItemSchema } from "./items.schema.js";

const router = Router();

// Frontend: admin-web src/api/itemApi.js (Items dashboard, Add/Edit Item, booking item picker)
// Mounted in routes/index.js at /api/items (SYSTEM_ADMIN only)
router.get("/", controller.catalog);                           // GET   /api/items           -> [{ code, name, unit }] for booking item pickers
router.get("/records", controller.records);                    // GET   /api/items/records   -> rows for the Items table
router.get("/next-code", controller.nextCode);                 // GET   /api/items/next-code -> { code }
router.get("/:id", controller.getOne);                         // GET   /api/items/:id       one item by code (keep after the fixed paths above)
router.post("/", validate({ body: createItemSchema }), controller.create);       // POST  /api/items           create or save as draft ({ ...record, asDraft })
router.patch("/:id", validate({ body: updateItemSchema }), controller.update);   // PATCH /api/items/:id
router.delete("/:id", controller.remove);                      // DELETE /api/items/:id -> { id, message }

export default router;
