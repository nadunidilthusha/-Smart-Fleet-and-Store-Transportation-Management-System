import asyncHandler from "../../utils/asyncHandler.js";
import notImplemented from "../../utils/notImplemented.js";
// import * as service from "./notifications.service.js";

// GET   /api/store/notifications
export const list = asyncHandler(async (req, res) => {
  notImplemented("GET /notifications");
  // TODO: const result = await service.something(); res.json(result);
});

// PATCH /api/store/notifications/read-all   (keep above /:id)
export const markAllRead = asyncHandler(async (req, res) => {
  notImplemented("PATCH /notifications/read-all");
  // TODO: const result = await service.something(); res.json(result);
});

// PATCH /api/store/notifications/:id   body { read: true | false }
export const setRead = asyncHandler(async (req, res) => {
  notImplemented("PATCH /notifications/:id");
  // TODO: const result = await service.something(); res.json(result);
});
