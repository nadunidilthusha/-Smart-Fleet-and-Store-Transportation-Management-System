import asyncHandler from "../../utils/asyncHandler.js";
import * as service from "./trips.service.js";

// GET /api/store/trips
export const list = asyncHandler(async (req, res) => {
  const result = await service.getStoreTrips(req.user);
  res.json(result);
});

// GET /api/store/trips/:id
export const getOne = asyncHandler(async (req, res) => {
  const result = await service.getOneStoreTrip(req.params.id, req.user);
  res.json(result);
});