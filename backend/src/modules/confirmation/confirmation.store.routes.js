import { Router } from "express";
import * as controller from "./confirmation.store.controller.js";
import validate from "../../middleware/validate.js";
import authorize from "../../middleware/authorize.js";
import { ROLES } from "../../config/constants.js";
import { cancelBodySchema, getQuerySchema, stageBodySchema } from "./confirmation.schema.js";

const router = Router();

// Store portal. Frontend: store-web src/api/confirmationApi.js (Goods confirmation page)
// Mounted in routes/store.routes.js at /api/store (store roles only, data limited to req.user.storeId)
router.get("/goods-confirmation", validate({ query: getQuerySchema }), controller.get);                        // GET   /api/store/goods-confirmation   open booking + queue + tab counts
router.post("/goods-confirmation/draft", validate({ body: stageBodySchema }), controller.saveDraft);           // POST  /api/store/goods-confirmation/draft   body { bookingId, stage, lines, note, handoverAt, resolution }
router.post("/goods-confirmation/confirm", validate({ body: stageBodySchema }), controller.confirm);           // POST  /api/store/goods-confirmation/confirm   same body plus acknowledged: true
router.post("/goods-confirmation/cancel", authorize(ROLES.STORE_MANAGER), validate({ body: cancelBodySchema }), controller.cancel); // POST  /api/store/goods-confirmation/cancel   body { bookingId, reason } (store manager)

export default router;
