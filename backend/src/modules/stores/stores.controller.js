import asyncHandler from "../../utils/asyncHandler.js";
import notImplemented from "../../utils/notImplemented.js";
// import * as service from "./stores.service.js";

// GET   /api/stores           -> [{ id, name }] for booking dropdowns
export const options = asyncHandler(async (req, res) => {
  notImplemented("GET /");
  // TODO: const result = await service.something(); res.json(result);
});

// GET   /api/stores/records   -> rows for the Stores table
export const records = asyncHandler(async (req, res) => {
  notImplemented("GET /records");
  // TODO: const result = await service.something(); res.json(result);
});

// POST  /api/stores           create or save as draft ({ ...record, asDraft })
export const create = asyncHandler(async (req, res) => {
  notImplemented("POST /");
  // TODO: const result = await service.something(); res.json(result);
});

// PATCH /api/stores/:id
export const update = asyncHandler(async (req, res) => {
  notImplemented("PATCH /:id");
  // TODO: const result = await service.something(); res.json(result);
});
