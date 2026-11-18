import { Router } from "express";
import * as controller from "./trips.controller.js";

const router = Router();

// Frontend: admin-web TripPlanner and Trips pages; store-web TripProgress pages
// Mounted in routes/index.js at /api/trips (SYSTEM_ADMIN only)
router.get("/", controller.list);                              // GET   /api/trips
router.post("/", controller.create);                           // POST  /api/trips   trip planner saves a plan
router.get("/:id", controller.getOne);                         // GET   /api/trips/:id
router.patch("/:id", controller.update);                       // PATCH /api/trips/:id   status, override, reassign

export default router;
