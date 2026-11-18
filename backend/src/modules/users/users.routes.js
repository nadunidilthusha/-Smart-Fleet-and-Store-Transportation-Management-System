import { Router } from "express";
import * as controller from "./users.controller.js";

const router = Router();

// Frontend: admin-web src/api/userApi.js (Users and roles page)
// Mounted in routes/index.js at /api/users (SYSTEM_ADMIN only)
router.get("/", controller.list);                              // GET   /api/users
router.post("/", controller.create);                           // POST  /api/users
router.get("/:id", controller.getOne);                         // GET   /api/users/:id
router.patch("/:id", controller.update);                       // PATCH /api/users/:id

export default router;
