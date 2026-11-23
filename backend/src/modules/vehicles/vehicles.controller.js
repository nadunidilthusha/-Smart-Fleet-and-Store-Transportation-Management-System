import asyncHandler from "../../utils/asyncHandler.js";
import * as service from "./vehicles.service.js";

// GET   /api/vehicles           -> [{ id, plate, type, model, driver, capacity, hub, mileage, fuel, status }]
export const list = asyncHandler(async (req, res) => {
  res.json(await service.listVehicles());
});

// GET   /api/vehicles/options   -> [{ id, label, capacity, model, location }]
export const options = asyncHandler(async (req, res) => {
  res.json(await service.listVehicleOptions());
});

// GET   /api/vehicles/form-options -> { drivers: [{ value, label }], hubs: [{ value, label }] }
export const formOptions = asyncHandler(async (req, res) => {
  res.json(await service.listFormOptions());
});

// GET   /api/vehicles/:id       -> one vehicle record (id is the vehicle code), used by the edit form
export const getOne = asyncHandler(async (req, res) => {
  res.json(await service.getVehicle(req.params.id));
});

// POST  /api/vehicles           create or save as draft ({ ...record, asDraft })
export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createVehicle(req.body));
});

// PATCH /api/vehicles/:id
export const update = asyncHandler(async (req, res) => {
  res.json(await service.updateVehicle(req.params.id, req.body));
});
