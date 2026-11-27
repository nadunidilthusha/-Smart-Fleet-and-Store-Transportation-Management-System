import asyncHandler from "../../utils/asyncHandler.js";
import * as service from "./schedule.service.js";
import ApiError from "../../utils/ApiError.js";

// GET /api/store/schedule
export const list = asyncHandler(async (req, res) => {
  if (!req.user.storeId) throw ApiError.forbidden("No store assigned to this account");
  
  const { startDate, endDate } = req.query;
  
  // Store එකට අදාල Slot එක විතරක් ගන්නවා
  const data = await service.getScheduleData({ 
    storeId: req.user.storeId, 
    startDate, 
    endDate 
  });
  res.json(data);
});