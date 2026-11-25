import asyncHandler from "../../utils/asyncHandler.js";
import { getPagination, setTotalHeader } from "../../utils/pagination.js";
import * as service from "./notifications.service.js";

// GET   /api/notifications               -> [notification]  (newest first; optional ?page=&limit=, total in X-Total-Count)
export const list = asyncHandler(async (req, res) => {
  const { skip, limit } = getPagination(req.query, { defaultLimit: 100, maxLimit: 200 });
  const { notifications, total } = await service.listAdminNotifications({ skip, limit });
  setTotalHeader(res, total);
  res.json(notifications);
});

// GET   /api/notifications/unread-count  -> { unread }   (for a bell badge)
export const unreadCount = asyncHandler(async (req, res) => {
  res.json(await service.countAdminUnread());
});

// PATCH /api/notifications/read-all      (keep above /:id)
export const markAllRead = asyncHandler(async (req, res) => {
  res.json(await service.markAllAdminRead());
});

// PATCH /api/notifications/:id           body { read: true | false } -> { id, read }
export const setRead = asyncHandler(async (req, res) => {
  res.json(await service.setAdminNotificationRead(req.params.id, req.body.read));
});