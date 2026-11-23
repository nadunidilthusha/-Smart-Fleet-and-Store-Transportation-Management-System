import { Router } from "express";
import * as controller from "./auth.controller.js";
import protect from "../../middleware/auth.js";
import validate from "../../middleware/validate.js";
import { storeLoginSchema } from "./auth.schema.js";

const router = Router();

// Frontend: admin-web and store-web src/api/authApi.js (login screen, session)
router.post("/login", controller.login);                       // POST /api/auth/login   public, returns { token, user }
router.get("/me", protect, controller.me);                     // GET  /api/auth/me      current signed-in user

// Store Web only: separate from the admin routes above (store-web src/api/authApi.js)
router.get("/store/locations", controller.storeLocations);     // GET  /api/auth/store/locations   login dropdown
router.post("/store/login", validate({ body: storeLoginSchema }), controller.storeLogin); // POST /api/auth/store/login   store manager/employee sign-in

export default router;
