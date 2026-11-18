import asyncHandler from "../../utils/asyncHandler.js";
import notImplemented from "../../utils/notImplemented.js";
// import * as service from "./dashboard.service.js";

// GET   /api/store/dashboard   same idea, limited to the signed-in store
export const summary = asyncHandler(async (req, res) => {
  notImplemented("GET /dashboard");
  // TODO: const result = await service.something(); res.json(result);
});
