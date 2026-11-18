import asyncHandler from "../../utils/asyncHandler.js";
import notImplemented from "../../utils/notImplemented.js";
// import * as service from "./vehicles.service.js";

// GET   /api/vehicles           -> [{ id, plate, type, model, driver, capacity, hub, mileage, fuel, status }]
export const list = asyncHandler(async (req, res) => {
  notImplemented("GET /");
  // TODO: const result = await service.something(); res.json(result);
});

// GET   /api/vehicles/options   -> [{ id, label, capacity, model, location }]
export const options = asyncHandler(async (req, res) => {
  notImplemented("GET /options");
  // TODO: const result = await service.something(); res.json(result);
});

// POST  /api/vehicles           create or save as draft ({ ...record, asDraft })
export const create = asyncHandler(async (req, res) => {
  notImplemented("POST /");
  // TODO: const result = await service.something(); res.json(result);
});

// PATCH /api/vehicles/:id
export const update = asyncHandler(async (req, res) => {
  notImplemented("PATCH /:id");
  // TODO: const result = await service.something(); res.json(result);
});
