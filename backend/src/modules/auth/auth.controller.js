import asyncHandler from "../../utils/asyncHandler.js";
import notImplemented from "../../utils/notImplemented.js";
// import * as service from "./auth.service.js";

// POST /api/auth/login   public, returns { token, user }
export const login = asyncHandler(async (req, res) => {
  notImplemented("POST /login");
  // TODO: const result = await service.something(); res.json(result);
});

// GET  /api/auth/me      current signed-in user
export const me = asyncHandler(async (req, res) => {
  notImplemented("GET /me");
  // TODO: const result = await service.something(); res.json(result);
});
