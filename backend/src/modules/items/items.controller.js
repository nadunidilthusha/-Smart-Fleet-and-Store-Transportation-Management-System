import asyncHandler from "../../utils/asyncHandler.js";
import notImplemented from "../../utils/notImplemented.js";
// import * as service from "./items.service.js";

// GET   /api/items           -> [{ code, name, unit }] for booking item pickers
export const catalog = asyncHandler(async (req, res) => {
  notImplemented("GET /");
  // TODO: const result = await service.something(); res.json(result);
});

// GET   /api/items/records   -> rows for the Items table
export const records = asyncHandler(async (req, res) => {
  notImplemented("GET /records");
  // TODO: const result = await service.something(); res.json(result);
});

// POST  /api/items           create or save as draft ({ ...record, asDraft })
export const create = asyncHandler(async (req, res) => {
  notImplemented("POST /");
  // TODO: const result = await service.something(); res.json(result);
});

// PATCH /api/items/:id
export const update = asyncHandler(async (req, res) => {
  notImplemented("PATCH /:id");
  // TODO: const result = await service.something(); res.json(result);
});
