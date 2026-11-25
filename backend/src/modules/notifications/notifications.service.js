import Notification from "./notifications.model.js";
import ApiError from "../../utils/ApiError.js";
import logger from "../../utils/logger.js";
import { ROLES } from "../../config/constants.js";
import { emitToAdmins } from "../../sockets/index.js";

// Business logic and database access for notifications lives here.
// Controllers call these functions. Keep req and res out of this file.

// Admin notifications are addressed to the role, so every administrator sees the same list.
export const ADMIN_RECIPIENT = ROLES.SYSTEM_ADMIN;

const OBJECT_ID = /^[a-f\d]{24}$/i;

// The shape the admin Notifications page expects (see admin-web src/api/notificationApi.js)
export function toNotificationResponse(n) {
  return {
    id: String(n._id),
    type: n.type,
    severity: n.severity,
    title: n.title,
    message: n.message,
    link: n.link ?? "",
    read: Boolean(n.read),
    createdAt: n.createdAt,
  };
}

/* =====================================================================
   1. ADMIN PORTAL  (called by the controller)
   ===================================================================== */

// GET /api/notifications -> [notification], newest first
export async function listAdminNotifications({ skip = 0, limit = 100 } = {}) {
  const filter = { recipient: ADMIN_RECIPIENT };
  const [docs, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
  ]);
  return { notifications: docs.map(toNotificationResponse), total };
}

// GET /api/notifications/unread-count -> { unread }
export async function countAdminUnread() {
  return { unread: await Notification.countDocuments({ recipient: ADMIN_RECIPIENT, read: false }) };
}

// PATCH /api/notifications/:id -> { id, read }
export async function setAdminNotificationRead(id, read) {
  // A malformed id can never match, so it is a plain "not found" (not a 400 cast error)
  if (!OBJECT_ID.test(String(id))) throw ApiError.notFound("Notification not found");

  // recipient is part of the filter: an admin can only touch admin notifications
  const updated = await Notification.findOneAndUpdate(
    { _id: id, recipient: ADMIN_RECIPIENT },
    { $set: { read } },
    { new: true }
  ).lean();
  if (!updated) throw ApiError.notFound("Notification not found");

  return { id: String(updated._id), read: updated.read };
}

// PATCH /api/notifications/read-all -> { ok, updated }
export async function markAllAdminRead() {
  const result = await Notification.updateMany({ recipient: ADMIN_RECIPIENT, read: false }, { $set: { read: true } });
  return { ok: true, updated: result.modifiedCount ?? 0 };
}

/* =====================================================================
   2. CREATING NOTIFICATIONS  (called by other modules: bookings, trips, vehicles ...)
   ===================================================================== */


export async function notifyAdmins({ type, severity = "info", title, message, link = "" }) {
  try {
    const doc = await Notification.create({ type, severity, title, message, link, recipient: ADMIN_RECIPIENT });
    emitToAdmins("notification:new", toNotificationResponse(doc.toObject()));
    return doc;
  } catch (err) {
    logger.error("Could not create admin notification:", err.message);
    return null;
  }
}