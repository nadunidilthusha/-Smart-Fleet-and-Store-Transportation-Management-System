import { Router } from "express";
import * as controller from "./trips.store.controller.js";

const router = Router();

// Store portal. Frontend: admin-web TripPlanner and Trips pages; store-web TripProgress pages
// Mounted in routes/store.routes.js at /api/store (store roles only, data limited to req.user.storeId)
router.get("/trips", controller.list);                         // GET   /api/store/trips   inbound and outbound trips for the signed-in store
router.get("/trips/:id", controller.getOne);                   // GET   /api/store/trips/:id   trip progress detail
// Inside the router:
router.patch("/trips/:id/complete", controller.completeTrip); 

export default router;
