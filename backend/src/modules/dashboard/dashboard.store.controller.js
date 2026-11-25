import asyncHandler from "../../utils/asyncHandler.js";
import * as service from "./dashboard.service.js";

// GET   /api/store/dashboard   KPIs, trips, slots, bookings and goods activity for the signed-in store
export const summary = asyncHandler(async (req, res) => {
  res.json(await service.getStoreDashboard(req.user));
});
