import { Router } from "express";
import * as controller from "./stores.controller.js";
import validate from "../../middleware/validate.js";
import audit from "../../middleware/audit.js";
import { getStore } from "./stores.service.js";
import { createStoreSchema, updateStoreSchema } from "./stores.schema.js";

const router = Router();

// Frontend: admin-web src/api/storeApi.js (Stores dashboard, Add/Edit Store, booking, user, item and vehicle dropdowns)
// Mounted in routes/index.js at /api/stores (SYSTEM_ADMIN only)
router.get("/", controller.options);                           // GET   /api/stores           -> [{ id, code, name }] for dropdowns
router.get("/records", controller.records);                    // GET   /api/stores/records   -> rows for the Stores table
router.get("/next-code", controller.nextCode);                 // GET   /api/stores/next-code -> { code }
router.get("/:id", controller.getOne);                         // GET   /api/stores/:id       one store by code (keep after the fixed paths above)
router.post("/", validate({ body: createStoreSchema }), audit({ entity: "Store", action: "CREATE" }), controller.create);       // POST  /api/stores           create or save as draft ({ ...record, asDraft })
router.patch("/:id", validate({ body: updateStoreSchema }), audit({ entity: "Store", action: "UPDATE", load: (req) => getStore(req.params.id) }), controller.update);   // PATCH /api/stores/:id
router.delete("/:id", audit({ entity: "Store", action: "DELETE", load: (req) => getStore(req.params.id) }), controller.remove);                      // DELETE /api/stores/:id -> { id, message }

export default router;
