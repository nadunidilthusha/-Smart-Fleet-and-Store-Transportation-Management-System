import { Router } from "express";
import * as controller from "./bookings.controller.js";
import audit from "../../middleware/audit.js";
import { getBooking } from "./bookings.service.js";

const router = Router();

// Audit action for a review decision (the request body carries the new status)
const REVIEW_ACTIONS = { Approved: "APPROVE", Rejected: "REJECT", "Changes requested": "REQUEST_CHANGES" };

// Frontend: admin-web src/api/bookingApi.js and store-web src/api/bookingApi.js
// Mounted in routes/index.js at /api/bookings (SYSTEM_ADMIN only)
router.get("/", controller.list);                              // GET   /api/bookings              all bookings
router.post("/", audit({ entity: "Booking", action: "CREATE" }), controller.create);                           // POST  /api/bookings              admin creates a booking
router.get("/:id", controller.getOne);                         // GET   /api/bookings/:id
router.patch("/:id/status", audit({ entity: "Booking", action: (req) => REVIEW_ACTIONS[req.body?.status] ?? "UPDATE", load: (req) => getBooking(req.params.id) }), controller.updateStatus);          // PATCH /api/bookings/:id/status   body { status, comment } (approve, request changes, reject)

export default router;
