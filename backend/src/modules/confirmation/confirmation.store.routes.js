import { Router } from "express";
import * as controller from "./confirmation.store.controller.js";

const router = Router();

// Store portal. Frontend: store-web src/api/confirmationApi.js (Goods confirmation page)
// Mounted in routes/store.routes.js at /api/store (store roles only, data limited to req.user.storeId)
router.get("/goods-confirmation", controller.get);             // GET   /api/store/goods-confirmation   active trip + queue + tab counts
router.post("/goods-confirmation/draft", controller.saveDraft); // POST  /api/store/goods-confirmation/draft
router.post("/goods-confirmation/confirm", controller.confirm); // POST  /api/store/goods-confirmation/confirm

export default router;
