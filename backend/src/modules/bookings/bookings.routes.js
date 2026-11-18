import { Router } from "express";
import * as controller from "./bookings.controller.js";

const router = Router();

// Frontend: admin-web src/api/bookingApi.js and store-web src/api/bookingApi.js
// Mounted in routes/index.js at /api/bookings (SYSTEM_ADMIN only)
router.get("/", controller.list);                              // GET   /api/bookings              all bookings
router.post("/", controller.create);                           // POST  /api/bookings              admin creates a booking
router.get("/:id", controller.getOne);                         // GET   /api/bookings/:id
router.patch("/:id/status", controller.updateStatus);          // PATCH /api/bookings/:id/status   body { status, comment } (approve, request changes, reject)

export default router;
