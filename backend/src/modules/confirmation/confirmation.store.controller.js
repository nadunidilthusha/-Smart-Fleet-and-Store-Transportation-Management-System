import asyncHandler from "../../utils/asyncHandler.js";
import notImplemented from "../../utils/notImplemented.js";
// import * as service from "./confirmation.service.js";

// GET   /api/store/goods-confirmation   active trip + queue + tab counts
export const get = asyncHandler(async (req, res) => {
  notImplemented("GET /goods-confirmation");
  // TODO: const result = await service.something(); res.json(result);
});

// POST  /api/store/goods-confirmation/draft
export const saveDraft = asyncHandler(async (req, res) => {
  notImplemented("POST /goods-confirmation/draft");
  // TODO: const result = await service.something(); res.json(result);
});

// POST  /api/store/goods-confirmation/confirm
export const confirm = asyncHandler(async (req, res) => {
  notImplemented("POST /goods-confirmation/confirm");
  // TODO: const result = await service.something(); res.json(result);
});
