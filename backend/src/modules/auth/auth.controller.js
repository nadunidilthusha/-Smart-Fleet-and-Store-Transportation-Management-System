import asyncHandler from "../../utils/asyncHandler.js";
import notImplemented from "../../utils/notImplemented.js";
import * as service from "./auth.service.js";

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

// GET  /api/auth/store/locations   public, Store Web login dropdown -> [{ id, name, shortName }]
export const storeLocations = asyncHandler(async (req, res) => {
  res.json(await service.listStoreLocations());
});

// POST /api/auth/store/login       public, Store Web sign-in -> { token, user }
export const storeLogin = asyncHandler(async (req, res) => {
  res.json(await service.storeLogin(req.body));
});
