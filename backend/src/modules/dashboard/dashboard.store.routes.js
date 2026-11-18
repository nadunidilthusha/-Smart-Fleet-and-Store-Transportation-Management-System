import { Router } from "express";
import * as controller from "./dashboard.store.controller.js";

const router = Router();

// Store portal. Frontend: admin-web src/api/dashboardApi.js and store-web src/api/dashboardApi.js
// Mounted in routes/store.routes.js at /api/store (store roles only, data limited to req.user.storeId)
router.get("/dashboard", controller.summary);                  // GET   /api/store/dashboard   same idea, limited to the signed-in store

export default router;
