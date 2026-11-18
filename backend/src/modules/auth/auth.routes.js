import { Router } from "express";
import * as controller from "./auth.controller.js";
import protect from "../../middleware/auth.js";

const router = Router();

// Frontend: admin-web and store-web src/api/authApi.js (login screen, session)
router.post("/login", controller.login);                       // POST /api/auth/login   public, returns { token, user }
router.get("/me", protect, controller.me);                     // GET  /api/auth/me      current signed-in user

export default router;
