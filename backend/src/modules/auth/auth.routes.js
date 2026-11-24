
import { Router } from "express";
import * as controller from "./auth.controller.js";
import protect from "../../middleware/auth.js";
import validate from "../../middleware/validate.js";
import { adminLoginSchema, storeLoginSchema } from "./auth.schema.js";

const router = Router();

// Admin Web: Login and session
router.post(
  "/login",
  validate({ body: adminLoginSchema }),
  controller.login
);

router.get("/me", protect, controller.me);

// Store Web: Locations and login
router.get("/store/locations", controller.storeLocations);

router.post(
  "/store/login",
  validate({ body: storeLoginSchema }),
  controller.storeLogin
);

export default router;
