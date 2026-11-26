import asyncHandler from "../../utils/asyncHandler.js";
import * as service from "./schedule.service.js";

// GET /api/schedule
export const list = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  // If admin, they see all stores. If store manager, only their store.
  const storeId = req.user.role === "SYSTEM_ADMIN" ? req.query.storeId : req.user.storeId;

  const data = await service.getScheduleData({ storeId, startDate, endDate });
  res.json(data);
});