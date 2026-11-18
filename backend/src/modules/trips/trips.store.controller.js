import asyncHandler from "../../utils/asyncHandler.js";
import notImplemented from "../../utils/notImplemented.js";
// import * as service from "./trips.service.js";

// GET   /api/store/trips   inbound and outbound trips for the signed-in store
export const list = asyncHandler(async (req, res) => {
  notImplemented("GET /trips");
  // TODO: const result = await service.something(); res.json(result);
});

// GET   /api/store/trips/:id   trip progress detail
export const getOne = asyncHandler(async (req, res) => {
  notImplemented("GET /trips/:id");
  // TODO: const result = await service.something(); res.json(result);
});
