import { Router } from "express";
import * as controller from "./notifications.store.controller.js";
import validate from "../../middleware/validate.js";
import { setReadSchema } from "./notifications.schema.js";

const router = Router();

// Store portal. Frontend: store-web src/api/notificationApi.js (Notifications bell icon)
// Mounted in routes/store.routes.js at /api/store (store roles only, data limited to req.user.storeId)
router.get("/notifications", controller.list);
router.patch("/notifications/read-all", controller.markAllRead);
router.patch("/notifications/:id", validate({ body: setReadSchema }), controller.setRead);

export default router;