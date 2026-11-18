import asyncHandler from "../../utils/asyncHandler.js";
import notImplemented from "../../utils/notImplemented.js";
// import * as service from "./tracking.service.js";

// GET   /api/tracking/live   latest position of every active vehicle
export const live = asyncHandler(async (req, res) => {
  notImplemented("GET /live");
  // TODO: const result = await service.something(); res.json(result);
});
