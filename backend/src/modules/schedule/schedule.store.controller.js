import asyncHandler from "../../utils/asyncHandler.js";
import * as service from "./schedule.service.js";

// GET /api/store/schedule
export const list = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  // Force the storeId to be the logged-in user's store
  const data = await service.getScheduleData({ 
    storeId: req.user.storeId, 
    startDate, 
    endDate 
  });
  res.json(data);
});