import { Router } from "express";
import * as controller from "./bookings.store.controller.js";
import authorize from "../../middleware/authorize.js";
import audit from "../../middleware/audit.js";
import { getStoreBooking } from "./bookings.service.js";
import { ROLES } from "../../config/constants.js";

const router = Router();

// Store portal. Frontend: admin-web src/api/bookingApi.js and store-web src/api/bookingApi.js
// Mounted in routes/store.routes.js at /api/store (store roles only, data limited to req.user.storeId)
router.get("/booking-options", controller.options);            // GET   /api/store/booking-options   -> { stores, items }
router.get("/bookings", controller.list);                      // GET   /api/store/bookings   bookings sent from or to the signed-in store
router.post("/bookings", authorize(ROLES.STORE_MANAGER), audit({ entity: "Booking", action: "CREATE" }), controller.create); // POST  /api/store/bookings   body { pickup, destination, requestedFor, priority, notes, items, draft }
router.get("/bookings/:id", controller.getOne);                // GET   /api/store/bookings/:id
router.put("/bookings/:id", authorize(ROLES.STORE_MANAGER), audit({ entity: "Booking", action: "UPDATE", load: (req) => getStoreBooking(req.params.id, req.user) }), controller.update); // PUT   /api/store/bookings/:id   edit and resubmit
router.patch("/bookings/:id/cancel", authorize(ROLES.STORE_MANAGER), audit({ entity: "Booking", action: "CANCEL", load: (req) => getStoreBooking(req.params.id, req.user) }), controller.cancel); // PATCH /api/store/bookings/:id/cancel

export default router;
