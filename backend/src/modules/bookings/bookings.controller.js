import asyncHandler from "../../utils/asyncHandler.js";
import notImplemented from "../../utils/notImplemented.js";
// import * as service from "./bookings.service.js";

// GET   /api/bookings              all bookings
export const list = asyncHandler(async (req, res) => {
  notImplemented("GET /");
  // TODO: const result = await service.something(); res.json(result);
});

// POST  /api/bookings              admin creates a booking
export const create = asyncHandler(async (req, res) => {
  notImplemented("POST /");
  // TODO: const result = await service.something(); res.json(result);
});

// GET   /api/bookings/:id
export const getOne = asyncHandler(async (req, res) => {
  notImplemented("GET /:id");
  // TODO: const result = await service.something(); res.json(result);
});

// PATCH /api/bookings/:id/status   body { status, comment } (approve, request changes, reject)
export const updateStatus = asyncHandler(async (req, res) => {
  notImplemented("PATCH /:id/status");
  // TODO: const result = await service.something(); res.json(result);
});
