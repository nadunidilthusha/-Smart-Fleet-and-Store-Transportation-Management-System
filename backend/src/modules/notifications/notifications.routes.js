import { Router } from "express";
import * as controller from "./notifications.controller.js";

const router = Router();

// Frontend: admin-web and store-web src/api/notificationApi.js (Notifications page, bell icon)
// Mounted in routes/index.js at /api/notifications (SYSTEM_ADMIN only)
router.get("/", controller.list);                              // GET   /api/notifications
router.patch("/read-all", controller.markAllRead);             // PATCH /api/notifications/read-all   (keep above /:id)
router.patch("/:id", controller.setRead);                      // PATCH /api/notifications/:id   body { read: true | false }

export default router;
