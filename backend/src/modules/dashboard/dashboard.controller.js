import asyncHandler from "../../utils/asyncHandler.js";
import notImplemented from "../../utils/notImplemented.js";
// import * as service from "./dashboard.service.js";

// GET   /api/dashboard   KPI cards, trips today, loading slots, pending approvals
export const summary = asyncHandler(async (req, res) => {
  notImplemented("GET /");
  // TODO: const result = await service.something(); res.json(result);
});
