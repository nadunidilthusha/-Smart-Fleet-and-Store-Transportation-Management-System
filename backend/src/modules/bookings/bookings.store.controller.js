import asyncHandler from "../../utils/asyncHandler.js";
import notImplemented from "../../utils/notImplemented.js";
// import * as service from "./bookings.service.js";

// GET   /api/store/booking-options   -> { stores, items }
export const options = asyncHandler(async (req, res) => {
  notImplemented("GET /booking-options");
  // TODO: const result = await service.something(); res.json(result);
});

// GET   /api/store/bookings   bookings sent from or to the signed-in store
export const list = asyncHandler(async (req, res) => {
  notImplemented("GET /bookings");
  // TODO: const result = await service.something(); res.json(result);
});

// POST  /api/store/bookings   body { pickup, destination, requestedFor, priority, notes, items, draft }
export const create = asyncHandler(async (req, res) => {
  notImplemented("POST /bookings");
  // TODO: const result = await service.something(); res.json(result);
});

// GET   /api/store/bookings/:id
export const getOne = asyncHandler(async (req, res) => {
  notImplemented("GET /bookings/:id");
  // TODO: const result = await service.something(); res.json(result);
});

// PUT   /api/store/bookings/:id   edit and resubmit
export const update = asyncHandler(async (req, res) => {
  notImplemented("PUT /bookings/:id");
  // TODO: const result = await service.something(); res.json(result);
});

// PATCH /api/store/bookings/:id/cancel
export const cancel = asyncHandler(async (req, res) => {
  notImplemented("PATCH /bookings/:id/cancel");
  // TODO: const result = await service.something(); res.json(result);
});
