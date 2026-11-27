import Notification from "./notifications.model.js";
import ApiError from "../../utils/ApiError.js";
import logger from "../../utils/logger.js";
import { ROLES } from "../../config/constants.js";
import { emitToAdmins } from "../../sockets/index.js";

export const ADMIN_RECIPIENT = ROLES.SYSTEM_ADMIN;
const OBJECT_ID = /^[a-f\d]{24}$/i;
const storeRecipient = (storeId) => `store:${String(storeId)}`;
const storeRecipientFilter = (storeId) => ({ $in: [storeRecipient(storeId), String(storeId)] });

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

/* ==================== 1. ADMIN NOTIFICATIONS ==================== */

export async function listAdminNotifications({ skip = 0, limit = 100 } = {}) {
  const filter = { recipient: ADMIN_RECIPIENT };
  const [docs, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
  ]);
  return { notifications: docs.map(toNotificationResponse), total };
}

export async function countAdminUnread() {
  return { unread: await Notification.countDocuments({ recipient: ADMIN_RECIPIENT, read: false }) };
}

export async function setAdminNotificationRead(id, read) {
  if (!OBJECT_ID.test(String(id))) throw ApiError.notFound("Notification not found");
  const updated = await Notification.findOneAndUpdate(
    { _id: id, recipient: ADMIN_RECIPIENT },
    { $set: { read } },
    { new: true }
  ).lean();
  if (!updated) throw ApiError.notFound("Notification not found");
  return { id: String(updated._id), read: updated.read };
}

export async function markAllAdminRead() {
  const result = await Notification.updateMany({ recipient: ADMIN_RECIPIENT, read: false }, { $set: { read: true } });
  return { ok: true, updated: result.modifiedCount ?? 0 };
}

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

/* ==================== 2. STORE NOTIFICATIONS (FE-8 Support) ==================== */

export async function notifyStore({ storeId, type, severity = "info", title, message, link = "" }) {
  console.log("[DEBUG notifyStore] called with:", { storeId: String(storeId), title });
  if (!storeId) return null;
  try {
    const doc = await Notification.create({
      type,
      severity,
      title,
      message,
      link,
      recipient: storeRecipient(storeId),
    });
    console.log("[DEBUG notifyStore] SAVED:", { id: doc._id, recipient: doc.recipient });
    return doc;
  } catch (err) {
    console.error("[DEBUG notifyStore] FAILED:", err.message);
    logger.error("Could not create store notification:", err.message);
    return null;
  }
}

export async function listStoreNotifications(storeId) {
  console.log("[DEBUG listStoreNotifications] querying for storeId:", storeId, "filter:", storeRecipientFilter(storeId));
  const docs = await Notification.find({ recipient: storeRecipientFilter(storeId) })
    .sort({ createdAt: -1, _id: -1 })
    .limit(100)
    .lean();
  console.log("[DEBUG listStoreNotifications] found:", docs.length);
  return docs.map(toNotificationResponse);
}

export async function setStoreNotificationRead(id, read, storeId) {
  if (!OBJECT_ID.test(String(id))) throw ApiError.notFound("Notification not found");
  const updated = await Notification.findOneAndUpdate(
    { _id: id, recipient: storeRecipientFilter(storeId) },
    { $set: { read } },
    { new: true }
  ).lean();
  if (!updated) throw ApiError.notFound("Notification not found");
  return { id: String(updated._id), read: updated.read };
}

export async function markAllStoreRead(storeId) {
  const result = await Notification.updateMany(
    { recipient: storeRecipientFilter(storeId), read: false },
    { $set: { read: true } }
  );
  return { ok: true, updated: result.modifiedCount ?? 0 };
}