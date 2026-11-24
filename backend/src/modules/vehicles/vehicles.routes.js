import { Router } from "express";
import * as controller from "./vehicles.controller.js";
import validate from "../../middleware/validate.js";
import { createVehicleSchema, updateVehicleSchema } from "./vehicles.schema.js";

const router = Router();

// Frontend: admin-web src/api/vehicleApi.js (Vehicles dashboard, Add Vehicle)
// Mounted in routes/index.js at /api/vehicles (SYSTEM_ADMIN only)
router.get("/", controller.list);                              // GET   /api/vehicles           -> [{ id, plate, type, model, driver, capacity, hub, mileage, fuel, status }]
router.get("/options", controller.options);                    // GET   /api/vehicles/options   -> [{ id, label, capacity, model, location }]
router.get("/form-options", controller.formOptions);           // GET   /api/vehicles/form-options -> { drivers, hubs } for the Add Vehicle dropdowns
router.get("/:id", controller.getOne);                         // GET   /api/vehicles/:id       one vehicle (keep after the fixed paths above)
router.post("/", validate({ body: createVehicleSchema }), controller.create);       // POST  /api/vehicles           create or save as draft ({ ...record, asDraft })
router.patch("/:id", validate({ body: updateVehicleSchema }), controller.update);   // PATCH /api/vehicles/:id
router.delete("/:id", controller.remove);                      // DELETE /api/vehicles/:id -> { id, message }

export default router;
