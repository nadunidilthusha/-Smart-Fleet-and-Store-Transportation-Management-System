import asyncHandler from "../../utils/asyncHandler.js";
import notImplemented from "../../utils/notImplemented.js";
// import * as service from "./trips.service.js";

// GET   /api/trips
export const list = asyncHandler(async (req, res) => {
  notImplemented("GET /");
  // TODO: const result = await service.something(); res.json(result);
});

// POST  /api/trips   trip planner saves a plan
export const create = asyncHandler(async (req, res) => {
  notImplemented("POST /");
  // TODO: const result = await service.something(); res.json(result);
});

// GET   /api/trips/:id
export const getOne = asyncHandler(async (req, res) => {
  notImplemented("GET /:id");
  // TODO: const result = await service.something(); res.json(result);
});

// PATCH /api/trips/:id   status, override, reassign
export const update = asyncHandler(async (req, res) => {
  notImplemented("PATCH /:id");
  // TODO: const result = await service.something(); res.json(result);
});
