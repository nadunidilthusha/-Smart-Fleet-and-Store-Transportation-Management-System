import asyncHandler from "../../utils/asyncHandler.js";
import * as service from "./dashboard.service.js";

// GET   /api/dashboard   KPI cards, trips today, loading slots, pending approvals
export const summary = asyncHandler(async (req, res) => {
  res.json(await service.getDashboard());
});