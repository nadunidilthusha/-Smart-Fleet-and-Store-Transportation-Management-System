
import { Router } from "express";
import * as controller from "./users.controller.js";
import validate from "../../middleware/validate.js";

import {
  createUserSchema,
  updateUserSchema,
  userIdSchema,
} from "./users.schema.js";

const router = Router();

// GET /api/users
// List all users
router.get(
  "/",
  controller.list
);

// POST /api/users
// Create a new user
router.post(
  "/",
  validate({ body: createUserSchema }),
  controller.create
);

// GET /api/users/:id
// Get user details
router.get(
  "/:id",
  validate({ params: userIdSchema }),
  controller.getOne
);

// PATCH /api/users/:id
// Update user details
router.patch(
  "/:id",
  validate({
    params: userIdSchema,
    body: updateUserSchema,
  }),
  controller.update
);

export default router;
