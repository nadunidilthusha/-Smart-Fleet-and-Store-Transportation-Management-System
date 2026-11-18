import asyncHandler from "../../utils/asyncHandler.js";
import notImplemented from "../../utils/notImplemented.js";
// import * as service from "./schedule.service.js";

// GET   /api/store/schedule   slots of the signed-in store
export const list = asyncHandler(async (req, res) => {
  notImplemented("GET /schedule");
  // TODO: const result = await service.something(); res.json(result);
});
