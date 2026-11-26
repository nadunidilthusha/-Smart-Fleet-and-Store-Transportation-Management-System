import asyncHandler from "../../utils/asyncHandler.js";
import * as service from "./notifications.service.js";
import ApiError from "../../utils/ApiError.js";

// GET /api/store/notifications
export const list = asyncHandler(async (req, res) => {
  if (!req.user.storeId) throw ApiError.forbidden("No store assigned to this account");
  const result = await service.listStoreNotifications(req.user.storeId);
  res.json(result);
});

// PATCH /api/store/notifications/read-all
export const markAllRead = asyncHandler(async (req, res) => {
  if (!req.user.storeId) throw ApiError.forbidden("No store assigned to this account");
  const result = await service.markAllStoreRead(req.user.storeId);
  res.json(result);
});

// PATCH /api/store/notifications/:id
export const setRead = asyncHandler(async (req, res) => {
  if (!req.user.storeId) throw ApiError.forbidden("No store assigned to this account");
  const result = await service.setStoreNotificationRead(req.params.id, req.body.read, req.user.storeId);
  res.json(result);
});