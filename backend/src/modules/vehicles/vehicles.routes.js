import { Router } from "express";
import * as controller from "./vehicles.controller.js";

const router = Router();

// Frontend: admin-web src/api/vehicleApi.js (Vehicles dashboard, Add Vehicle)
// Mounted in routes/index.js at /api/vehicles (SYSTEM_ADMIN only)
router.get("/", controller.list);                              // GET   /api/vehicles           -> [{ id, plate, type, model, driver, capacity, hub, mileage, fuel, status }]
router.get("/options", controller.options);                    // GET   /api/vehicles/options   -> [{ id, label, capacity, model, location }]
router.post("/", controller.create);                           // POST  /api/vehicles           create or save as draft ({ ...record, asDraft })
router.patch("/:id", controller.update);                       // PATCH /api/vehicles/:id

export default router;
