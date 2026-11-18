import asyncHandler from "../../utils/asyncHandler.js";
import notImplemented from "../../utils/notImplemented.js";
// import * as service from "./users.service.js";

// GET   /api/users
export const list = asyncHandler(async (req, res) => {
  notImplemented("GET /");
  // TODO: const result = await service.something(); res.json(result);
});

// POST  /api/users
export const create = asyncHandler(async (req, res) => {
  notImplemented("POST /");
  // TODO: const result = await service.something(); res.json(result);
});

// GET   /api/users/:id
export const getOne = asyncHandler(async (req, res) => {
  notImplemented("GET /:id");
  // TODO: const result = await service.something(); res.json(result);
});

// PATCH /api/users/:id
export const update = asyncHandler(async (req, res) => {
  notImplemented("PATCH /:id");
  // TODO: const result = await service.something(); res.json(result);
});
