import { Router } from "express";
import * as controller from "./notifications.store.controller.js";

const router = Router();

// Store portal. Frontend: admin-web and store-web src/api/notificationApi.js (Notifications page, bell icon)
// Mounted in routes/store.routes.js at /api/store (store roles only, data limited to req.user.storeId)
router.get("/notifications", controller.list);                 // GET   /api/store/notifications
router.patch("/notifications/read-all", controller.markAllRead); // PATCH /api/store/notifications/read-all   (keep above /:id)
router.patch("/notifications/:id", controller.setRead);        // PATCH /api/store/notifications/:id   body { read: true | false }

export default router;
