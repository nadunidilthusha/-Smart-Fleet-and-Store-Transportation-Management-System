import { Router } from "express";
import * as controller from "./notifications.controller.js";
import validate from "../../middleware/validate.js";
import { setReadSchema } from "./notifications.schema.js";

const router = Router();

// Frontend: admin-web src/api/notificationApi.js (Notifications page)
// Mounted in routes/index.js at /api/notifications (SYSTEM_ADMIN only)
router.get("/", controller.list);                                   // GET   /api/notifications
router.get("/unread-count", controller.unreadCount);                // GET   /api/notifications/unread-count
router.patch("/read-all", controller.markAllRead);                  // PATCH /api/notifications/read-all   (keep above /:id)
router.patch("/:id", validate({ body: setReadSchema }), controller.setRead); // PATCH /api/notifications/:id   body { read: true | false }

export default router;